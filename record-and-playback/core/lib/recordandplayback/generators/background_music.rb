# frozen_string_literal: true

require 'digest'
require 'fileutils'
require 'json'
require 'nokogiri'

module BigBlueButton
  # Rebuilds the SafeMeet background-music timeline from persisted plugin events
  # and publishes durable browser-compatible assets for presentation playback.
  module BackgroundMusic
    PLUGIN_NAME = 'skyroom-layout'
    EVENT_NAME = 'background-music-state-v1'
    MAX_CLOCK_SKEW_MS = 30_000
    STATUSES = %w[playing paused stopped].freeze
    UPLOAD_TRACK_ID = /\A[a-f0-9]{40}-[0-9]+\z/.freeze
    UPLOAD_PATH = %r{\A/bigbluebutton/background-music/[a-z0-9-]+/([a-f0-9]{40}-[0-9]+)\z}.freeze

    DEFAULT_TRACK_FILES = {
      'calm-sea' => 'psyai-calm-sea-relaxing-background-for-sleep-and-meditation-463706.mp3',
      'balanced-nature' => 'roomeet_balanced_nature_loop_friendly.mp3',
      'deep-focus' => 'roomeet_balanced_subclair_loop_friendly.mp3',
      'calm' => 'roomeet_calm_loop_friendly.mp3',
      'energetic' => 'roomeet_energetic_loop_friendly.mp3',
      'focus' => 'roomeet_focus_loop_friendly.wav',
      'movement' => 'roomeet_movement_loop_friendly.mp3',
      'meditation' => 'siarhei_korbut-meditation-ambient-loop-pixabay-316844.mp3',
      'soft-air' => 'soft_air_drift_loop.mp3'
    }.freeze

    module_function

    def build(events, recording_events:, translate_timestamp:, raw_presentation_dir:, package_dir:, logger:)
      asset_cache = {}

      parse_segments(events).flat_map do |segment|
        source_key = source_identity(segment[:source])
        asset = asset_cache[source_key] ||= materialize_asset(
          segment[:source],
          raw_presentation_dir: raw_presentation_dir,
          package_dir: package_dir,
          logger: logger
        )

        recording_events.map do |recording_event|
          overlap_start = [segment[:start_timestamp], recording_event[:start_timestamp]].max
          overlap_stop = [segment[:stop_timestamp], recording_event[:stop_timestamp]].min
          next unless overlap_stop > overlap_start

          build_interval(segment, asset, overlap_start, overlap_stop, translate_timestamp)
        end.compact
      end
    end

    def parse_segments(events)
      segments = []
      current = nil
      last_timestamp = BigBlueButton::Events.last_event_timestamp(events).to_f

      persisted_states(events).each do |state|
        if current && source_identity(current[:source]) != source_identity(state[:source])
          current[:stop_timestamp] = [state[:timestamp], current[:start_timestamp]].max
          segments << current
          current = nil
        end

        next unless state[:source]

        current ||= {
          start_timestamp: state[:timestamp],
          stop_timestamp: nil,
          source: state[:source],
          updates: []
        }
        current[:updates] << state
      end

      if current
        current[:stop_timestamp] = [last_timestamp, current[:start_timestamp]].max
        segments << current
      end

      segments.select { |segment| segment[:stop_timestamp] > segment[:start_timestamp] }
    end

    def persisted_states(events)
      roles = {}
      states = events.xpath('/recording/event').sort_by { |event| event_timestamp(event) }.map do |event|
        case event['eventname']
        when 'ParticipantJoinEvent'
          roles[child_text(event, 'userId').to_s] = child_text(event, 'role').to_s
          next
        when 'ParticipantStatusChangeEvent'
          if child_text(event, 'status').to_s == 'role'
            roles[child_text(event, 'userId').to_s] = child_text(event, 'value').to_s
          end
          next
        end

        next unless background_music_event?(event)

        user_id = child_text(event, 'userId').to_s
        # Full recordings contain participant role events. Segmented recordings
        # may start after the join event, so an unknown role remains compatible;
        # a known viewer is never allowed to alter the published music timeline.
        next if roles.key?(user_id) && roles[user_id] != 'MODERATOR'

        parse_persisted_state(event)
      end.compact

      last_revision = -1
      last_timestamp = 0.0
      states.sort_by { |state| [state[:revision], state[:timestamp]] }.map do |state|
        next if state[:revision] <= last_revision

        last_revision = state[:revision]
        state[:timestamp] = [state[:timestamp], last_timestamp].max
        last_timestamp = state[:timestamp]
        state
      end.compact
    end

    def background_music_event?(event)
      event['eventname'] == 'PluginGeneratedEvent' &&
        child_text(event, 'pluginName').to_s == PLUGIN_NAME &&
        child_text(event, 'pluginEventName').to_s == EVENT_NAME
    end

    def parse_persisted_state(event)
      payload = JSON.parse(child_text(event, 'payloadJson').to_s)
      source = normalize_source(payload['source'])
      return nil if payload['source'] && !source

      status = payload['status'].to_s
      return nil unless STATUSES.include?(status)

      volume = finite_float(payload['volume'])
      position = finite_float(payload['position'])
      revision = finite_float(payload['revision'])
      changed_at = finite_float(payload['changedAt'])
      return nil unless volume && position && revision && changed_at
      return nil unless payload['loop'] == true || payload['loop'] == false

      {
        source: source,
        status: source ? status : 'stopped',
        volume: [[volume, 0.0].max, 1.0].min,
        loop: payload['loop'],
        position: [position, 0.0].max,
        revision: [revision, 0.0].max,
        timestamp: effective_timestamp(event, changed_at)
      }
    rescue JSON::ParserError, TypeError
      nil
    end

    def normalize_source(source)
      return nil if source.nil?
      return nil unless source.is_a?(Hash)

      track_id = source['trackId'].to_s
      case source['type']
      when 'default'
        return nil unless DEFAULT_TRACK_FILES.key?(track_id)

        { type: 'default', track_id: track_id }
      when 'upload'
        path_match = UPLOAD_PATH.match(source['path'].to_s)
        return nil unless UPLOAD_TRACK_ID.match?(track_id) && path_match && path_match[1] == track_id

        {
          type: 'upload',
          track_id: track_id,
          name: safe_name(source['name']) || 'music.mp3'
        }
      end
    end

    def effective_timestamp(event, changed_at)
      recorded_timestamp = event_timestamp(event)
      timestamp_utc = finite_float(child_text(event, 'timestampUTC'))
      return recorded_timestamp unless timestamp_utc && changed_at.positive?

      clock_delta = changed_at - timestamp_utc
      return recorded_timestamp if clock_delta.abs > MAX_CLOCK_SKEW_MS

      recorded_timestamp + clock_delta
    end

    def build_interval(segment, asset, overlap_start, overlap_stop, translate_timestamp)
      timestamp = translated_seconds(overlap_start, translate_timestamp)
      stop_timestamp = translated_seconds(overlap_stop, translate_timestamp)
      initial_state = state_at(segment, overlap_start)
      sync_events = [playback_state(initial_state, timestamp)]

      segment[:updates].each do |update|
        next unless update[:timestamp] > overlap_start && update[:timestamp] < overlap_stop

        sync_events << playback_state(update, translated_seconds(update[:timestamp], translate_timestamp))
      end

      {
        schema_version: 1,
        timestamp: timestamp,
        stop_timestamp: stop_timestamp,
        media_url: asset[:media_url],
        media_name: asset[:media_name],
        mime_type: asset[:mime_type],
        provider: asset[:provider],
        available: asset[:available],
        sync_events: sync_events
      }.compact
    end

    def state_at(segment, raw_timestamp)
      anchor = segment[:updates].first
      segment[:updates].each do |update|
        break if update[:timestamp] > raw_timestamp

        anchor = update
      end

      elapsed = if anchor[:status] == 'playing'
                  [(raw_timestamp - anchor[:timestamp]) / 1000.0, 0.0].max
                else
                  0.0
                end
      anchor.merge(position: anchor[:position] + elapsed, timestamp: raw_timestamp)
    end

    def playback_state(state, translated_timestamp)
      {
        at: translated_timestamp,
        position: rounded(state[:position]),
        status: state[:status],
        volume: rounded(state[:volume]),
        loop: state[:loop]
      }
    end

    def materialize_asset(source, raw_presentation_dir:, package_dir:, logger:)
      source_file = archived_source_file(source, raw_presentation_dir)
      unless source_file
        logger.warn("Background music source is missing for trackId=#{source[:track_id]}")
        return unavailable_asset(source)
      end

      extension = File.extname(source_file).downcase
      asset_id = Digest::SHA256.hexdigest("background-music:#{source_identity(source)}")[0, 24]
      BigBlueButton::ExternalMedia.publish_media_file(
        source_file,
        asset_id,
        extension,
        package_dir,
        provider: "background-music-#{source[:type]}",
        media_name: source[:name] || source[:track_id],
        logger: logger
      )
    rescue StandardError => e
      logger.warn("Background music materialization failed (#{e.class})")
      unavailable_asset(source)
    end

    def archived_source_file(source, raw_presentation_dir)
      relative_path = if source[:type] == 'default'
                        File.join('background-music', 'default', DEFAULT_TRACK_FILES.fetch(source[:track_id]))
                      else
                        File.join('background-music', "#{source[:track_id]}.mp3")
                      end
      candidate = File.expand_path(relative_path, raw_presentation_dir)
      root = File.realpath(raw_presentation_dir)
      return nil unless File.file?(candidate) && File.realpath(candidate).start_with?("#{root}#{File::SEPARATOR}")

      candidate
    rescue Errno::ENOENT
      nil
    end

    def archive_default_assets(events_file:, source_dir:, target_dir:, logger:)
      events = Nokogiri::XML(File.read(events_file))
      track_ids = persisted_states(events).map do |state|
        state.dig(:source, :track_id) if state.dig(:source, :type) == 'default'
      end.compact.uniq
      return if track_ids.empty?

      FileUtils.mkdir_p(target_dir)
      track_ids.each do |track_id|
        filename = DEFAULT_TRACK_FILES.fetch(track_id)
        source = File.join(source_dir, filename)
        unless File.file?(source)
          logger.warn("Default background music asset is missing for trackId=#{track_id}")
          next
        end

        FileUtils.cp(source, File.join(target_dir, filename))
        logger.info("Archived default background music trackId=#{track_id}")
      end
    end

    def unavailable_asset(source)
      {
        provider: "background-music-#{source[:type]}",
        media_name: source[:name] || source[:track_id],
        available: false
      }
    end

    def source_identity(source)
      return nil unless source

      "#{source[:type]}:#{source[:track_id]}"
    end

    def safe_name(value)
      name = value.to_s.encode('UTF-8', invalid: :replace, undef: :replace, replace: '')
      name = name.gsub(/[\u0000-\u001f\u007f]/, '').strip
      name.empty? ? nil : name[0, 120]
    end

    def event_timestamp(event)
      (event['timestamp'] || event['date'] || event['timestampUTC']).to_f
    end

    def child_text(event, name)
      event.at_xpath(name)&.text
    end

    def finite_float(value)
      number = Float(value)
      number.finite? ? number : nil
    rescue ArgumentError, TypeError
      nil
    end

    def translated_seconds(timestamp, translate_timestamp)
      rounded(translate_timestamp.call(timestamp).to_f / 1000.0)
    end

    def rounded(value)
      value.to_f.round(3)
    end
  end
end
