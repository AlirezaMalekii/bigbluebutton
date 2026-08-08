# frozen_string_literal: true

require 'digest'
require 'fileutils'
require 'json'
require 'net/http'
require 'open3'
require 'uri'

module BigBlueButton
  # Builds synchronized, durable external audio/video assets for presentation playback.
  module ExternalMedia
    AUDIO_EXTENSIONS = %w[.aac .m4a .mp3 .ogg .wav].freeze
    VIDEO_EXTENSIONS = %w[.mov .mp4 .webm].freeze
    MEDIA_EXTENSIONS = (AUDIO_EXTENSIONS + VIDEO_EXTENSIONS).freeze
    APARAT_PROFILES = %w[480p 360p 720p 240p 144p 1080p].freeze
    APARAT_HASH = %r{aparat\.com/(?:v/(?:e/)?|embed/|video/video/embed/videohash/)([A-Za-z0-9_-]{3,64})}i.freeze
    PRESENTATION_MEDIA_PATH = %r{/bigbluebutton/presentation/media/[A-Za-z0-9-]+/([A-Za-z0-9-]+)\z}.freeze
    MAX_DOWNLOAD_BYTES = 1024 * 1024 * 1024
    MAX_REDIRECTS = 3
    APARAT_CONTENT_TYPES = %w[application/octet-stream binary/octet-stream video/mp4].freeze

    module_function

    def build(events, recording_events:, translate_timestamp:, raw_presentation_dir:, package_dir:, logger:)
      segments = parse_segments(events)
      asset_cache = {}

      segments.flat_map do |segment|
        asset_key = segment[:source_url].to_s.empty? ? segment[:url] : segment[:source_url]
        asset = asset_cache[asset_key] ||= materialize_asset(
          segment,
          raw_presentation_dir: raw_presentation_dir,
          package_dir: package_dir,
          logger: logger
        )

        recording_events.filter_map do |recording_event|
          overlap_start = [segment[:start_timestamp], recording_event[:start_timestamp]].max
          overlap_stop = [segment[:stop_timestamp], recording_event[:stop_timestamp]].min
          next unless overlap_stop > overlap_start

          build_interval(segment, asset, overlap_start, overlap_stop, translate_timestamp)
        end
      end
    end

    def parse_segments(events)
      segments = []
      current = nil
      last_timestamp = BigBlueButton::Events.last_event_timestamp(events).to_f

      external_events = events.xpath("/recording/event[@eventname='StartExternalVideoRecordEvent' or " \
                                     "@eventname='UpdateExternalVideoRecordEvent' or " \
                                     "@eventname='StopExternalVideoRecordEvent']")
      external_events.sort_by { |event| event_timestamp(event) }.each do |event|
        timestamp = event_timestamp(event)
        case event['eventname']
        when 'StartExternalVideoRecordEvent'
          if current
            current[:stop_timestamp] = timestamp
            segments << current
          end

          current = {
            start_timestamp: timestamp,
            stop_timestamp: nil,
            url: child_text(event, 'externalVideoUrl'),
            source_url: child_text(event, 'externalVideoSourceUrl'),
            updates: []
          }
        when 'UpdateExternalVideoRecordEvent'
          next unless current

          current[:updates] << {
            timestamp: timestamp,
            status: child_text(event, 'status'),
            rate: positive_float(child_text(event, 'rate'), 1.0),
            time: non_negative_float(child_text(event, 'time'), 0.0),
            playing: playing_state(event)
          }
        when 'StopExternalVideoRecordEvent'
          next unless current

          current[:stop_timestamp] = timestamp
          segments << current
          current = nil
        end
      end

      if current
        current[:stop_timestamp] = [last_timestamp, current[:start_timestamp]].max
        segments << current
      end

      segments.select { |segment| !segment[:url].to_s.empty? && segment[:stop_timestamp] > segment[:start_timestamp] }
    end

    def build_interval(segment, asset, overlap_start, overlap_stop, translate_timestamp)
      timestamp = translated_seconds(overlap_start, translate_timestamp)
      stop_timestamp = translated_seconds(overlap_stop, translate_timestamp)
      initial_state = state_at(segment, overlap_start)

      sync_events = [{
        at: timestamp,
        media_time: rounded(initial_state[:media_time]),
        playing: initial_state[:playing],
        rate: rounded(initial_state[:rate])
      }]

      segment[:updates].each do |update|
        next unless update[:timestamp] > overlap_start && update[:timestamp] < overlap_stop

        sync_events << {
          at: translated_seconds(update[:timestamp], translate_timestamp),
          media_time: rounded(update[:time]),
          playing: update[:playing],
          rate: rounded(update[:rate])
        }
      end

      {
        schema_version: 2,
        timestamp: timestamp,
        stop_timestamp: stop_timestamp,
        media_url: asset[:media_url],
        media_type: asset[:media_type],
        media_name: asset[:media_name],
        mime_type: asset[:mime_type],
        provider: asset[:provider],
        available: asset[:available],
        sync_events: sanitize_sync_events(sync_events)
      }.compact
    end

    # Drop buffer/remount "play at t=0" anchors that restart media mid-share and
    # shift later anchors that were recorded relative to that false restart.
    def sanitize_sync_events(events)
      return [] if events.nil? || events.empty?

      sorted = events.sort_by { |event| event[:at].to_f }
      result = []
      time_offset = 0.0

      sorted.each do |event|
        adjusted_media_time = [event[:media_time].to_f + time_offset, 0.0].max
        candidate = event.merge(media_time: rounded(adjusted_media_time))

        if result.empty?
          result << candidate
          next
        end

        previous = result.last
        expected = if previous[:playing]
                     previous[:media_time].to_f +
                       [candidate[:at].to_f - previous[:at].to_f, 0.0].max * previous[:rate].to_f
                   else
                     previous[:media_time].to_f
                   end

        spurious_zero_reset = candidate[:playing] &&
                              previous[:playing] &&
                              candidate[:media_time].to_f < 0.5 &&
                              expected > 1.5 &&
                              (expected - candidate[:media_time].to_f) > 1.5

        if spurious_zero_reset
          time_offset += expected - event[:media_time].to_f
          next
        end

        result << candidate
      end

      result
    end

    def state_at(segment, raw_timestamp)
      state = {
        timestamp: segment[:start_timestamp],
        media_time: initial_media_time(segment[:url]),
        playing: true,
        rate: 1.0
      }

      segment[:updates].each do |update|
        break if update[:timestamp] > raw_timestamp

        state[:media_time] += elapsed_media_time(state, update[:timestamp])
        state = {
          timestamp: update[:timestamp],
          media_time: update[:time],
          playing: update[:playing],
          rate: update[:rate]
        }
      end

      state[:media_time] += elapsed_media_time(state, raw_timestamp)
      state[:timestamp] = raw_timestamp
      state
    end

    def elapsed_media_time(state, next_timestamp)
      return 0.0 unless state[:playing]

      [(next_timestamp - state[:timestamp]) / 1000.0, 0.0].max * state[:rate]
    end

    def materialize_asset(segment, raw_presentation_dir:, package_dir:, logger:)
      internal = presentation_media_reference(segment[:url])
      return materialize_presentation_media(internal, raw_presentation_dir, package_dir, logger) if internal

      aparat_hash = extract_aparat_hash(segment[:source_url])
      aparat_hash ||= extract_aparat_hash(segment[:url])
      if aparat_hash || aparat_asset_url?(segment[:url])
        return materialize_aparat_media(aparat_hash, segment[:url], package_dir, logger)
      end

      logger.warn('External media source is not a supported durable recording asset')
      unavailable_asset('external', media_type_from_url(segment[:url]), nil)
    rescue StandardError => e
      logger.warn("External media materialization failed (#{e.class})")
      unavailable_asset(provider_for(segment), media_type_from_url(segment[:url]), safe_media_name(segment[:url]))
    end

    def presentation_media_reference(url)
      uri = URI.parse(url.to_s)
      match = PRESENTATION_MEDIA_PATH.match(uri.path.to_s)
      return nil unless match

      query = URI.decode_www_form(uri.query.to_s).to_h
      presentation_id = match[1]
      stored_name = File.basename(query['presFilename'].to_s)
      return nil unless stored_name.match?(/\A#{Regexp.escape(presentation_id)}\.[A-Za-z0-9]+\z/)

      extension = File.extname(stored_name).downcase
      return nil unless MEDIA_EXTENSIONS.include?(extension)

      {
        presentation_id: presentation_id,
        stored_name: stored_name,
        display_name: safe_display_name(query['filename']),
        extension: extension
      }
    rescue URI::InvalidURIError, ArgumentError
      nil
    end

    def materialize_presentation_media(reference, raw_presentation_dir, package_dir, logger)
      presentation_dir = File.expand_path(reference[:presentation_id], raw_presentation_dir)
      raw_root = File.expand_path(raw_presentation_dir)
      unless presentation_dir.start_with?("#{raw_root}#{File::SEPARATOR}") && File.directory?(presentation_dir)
        return unavailable_asset('presentation', media_type_for_extension(reference[:extension]),
                                 reference[:display_name])
      end

      candidates = [
        File.join(presentation_dir, reference[:stored_name]),
        File.join(presentation_dir, "#{reference[:presentation_id]}#{reference[:extension]}")
      ]
      source = candidates.find { |candidate| safe_file_within?(candidate, presentation_dir) }
      unless source
        logger.warn("Presentation media source is missing for presentationId=#{reference[:presentation_id]}")
        return unavailable_asset('presentation', media_type_for_extension(reference[:extension]),
                                 reference[:display_name])
      end

      asset_key = "presentation:#{reference[:presentation_id]}:#{reference[:stored_name]}"
      asset_id = Digest::SHA256.hexdigest(asset_key)[0, 24]
      publish_media_file(
        source,
        asset_id,
        reference[:extension],
        package_dir,
        provider: 'presentation',
        media_name: reference[:display_name] || reference[:stored_name],
        logger: logger
      )
    end

    def materialize_aparat_media(aparat_hash, existing_url, package_dir, logger)
      playback_url = aparat_hash ? resolve_aparat_playback_url(aparat_hash) : existing_url
      asset_id = Digest::SHA256.hexdigest("aparat:#{aparat_hash || URI.parse(existing_url).path}")[0, 24]
      media_dir = File.join(package_dir, 'external-media')
      FileUtils.mkdir_p(media_dir)
      temporary_path = File.join(media_dir, ".#{asset_id}.download")

      download_aparat(playback_url, temporary_path)
      raise 'Downloaded Aparat media is invalid' unless valid_media_file?(temporary_path)

      publish_media_file(
        temporary_path,
        asset_id,
        '.mp4',
        package_dir,
        provider: 'aparat',
        media_name: nil,
        logger: logger
      )
    ensure
      FileUtils.rm_f(temporary_path) if defined?(temporary_path)
    end

    def publish_media_file(source, asset_id, extension, package_dir, provider:, media_name:, logger:)
      media_type = media_type_for_extension(extension)
      target_extension = normalized_extension(extension)
      media_dir = File.join(package_dir, 'external-media')
      FileUtils.mkdir_p(media_dir)
      target = File.join(media_dir, "#{asset_id}#{target_extension}")
      requires_transcode = target_extension != extension || !browser_compatible_media?(source, media_type, extension)

      begin
        if requires_transcode
          transcode_media(source, target, media_type)
        else
          FileUtils.cp(source, target)
        end

        unless valid_media_file?(target) && browser_compatible_media?(target, media_type, target_extension)
          raise 'Published external media failed validation'
        end
      rescue StandardError
        FileUtils.rm_f(target)
        raise
      end

      logger.info("Published recording media provider=#{provider} asset=#{asset_id}")
      available_asset(provider, media_type, media_name, mime_type_for(target_extension),
                      "external-media/#{File.basename(target)}")
    end

    def transcode_media(source, target, media_type)
      command = if media_type == 'audio'
                  ['ffmpeg', '-y', '-v', 'warning', '-i', source, '-vn', '-c:a', 'aac', '-b:a', '128k', target]
                else
                  ['ffmpeg', '-y', '-v', 'warning', '-i', source, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                   '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', target]
                end
      raise 'External media transcoding failed' unless BigBlueButton.exec_ret(*command).zero?
    end

    def resolve_aparat_playback_url(hash)
      encoded_hash = URI.encode_www_form_component(hash)
      uri = URI("https://www.aparat.com/api/fa/v1/video/video/show/videohash/#{encoded_hash}?pr=1&af=1")
      response = http_request(uri, Net::HTTP::Get.new(uri.request_uri, 'Accept' => 'application/json',
                                                                       'User-Agent' => 'SafeMeet-BBB-RaP/1.0'))
      raise "Aparat API HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      links = JSON.parse(response.body).dig('data', 'attributes', 'file_link_all')
      raise 'Aparat API returned no media profiles' unless links.is_a?(Array)

      by_profile = links.each_with_object({}) do |item, result|
        url = item['urls'].is_a?(Array) ? item['urls'].first : nil
        result[item['profile'].to_s.downcase] = url if aparat_asset_url?(url)
      end
      APARAT_PROFILES.each { |profile| return by_profile[profile] if by_profile[profile] }
      by_profile.values.first || raise('Aparat API returned no permitted MP4')
    end

    def download_aparat(url, output_path, redirects = 0)
      raise 'Too many Aparat redirects' if redirects > MAX_REDIRECTS

      uri = URI.parse(url.to_s)
      raise 'Untrusted Aparat media URL' unless trusted_aparat_asset_uri?(uri)

      request = Net::HTTP::Get.new(uri.request_uri, 'Accept' => 'video/mp4', 'User-Agent' => 'SafeMeet-BBB-RaP/1.0')
      http_stream(uri, request) do |response|
        if response.is_a?(Net::HTTPRedirection)
          return download_aparat(URI.join(uri, response['location']).to_s, output_path, redirects + 1)
        end
        raise "Aparat media HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        content_type = response['content-type'].to_s.split(';').first.to_s.downcase
        raise 'Aparat media returned an invalid content type' unless APARAT_CONTENT_TYPES.include?(content_type)

        content_length = response['content-length'].to_i
        raise 'Aparat media exceeds size limit' if content_length > MAX_DOWNLOAD_BYTES

        bytes = 0
        File.open(output_path, 'wb') do |file|
          response.read_body do |chunk|
            bytes += chunk.bytesize
            raise 'Aparat media exceeds size limit' if bytes > MAX_DOWNLOAD_BYTES

            file.write(chunk)
          end
        end
        raise 'Aparat media download was empty' if bytes.zero?
      end
    end

    def http_request(uri, request)
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 30) do |http|
        http.request(request)
      end
    end

    def http_stream(uri, request, &block)
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 120) do |http|
        http.request(request, &block)
      end
    end

    def valid_media_file?(path)
      File.file?(path) && File.size(path).positive? && BigBlueButton.exec_ret(
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path
      ).zero?
    end

    def browser_compatible_media?(path, media_type, extension)
      output, _errors, status = Open3.capture3(
        'ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,codec_type', '-of', 'json', path
      )
      return false unless status.success?

      streams = JSON.parse(output)['streams'] || []
      audio_codecs = streams.filter_map { |stream| stream['codec_name'] if stream['codec_type'] == 'audio' }
      video_codecs = streams.filter_map { |stream| stream['codec_name'] if stream['codec_type'] == 'video' }

      if media_type == 'audio'
        return false if audio_codecs.empty?

        return audio_codecs.all? { |codec| codec == 'aac' } if extension == '.m4a'
        return audio_codecs.all? { |codec| codec == 'mp3' } if extension == '.mp3'
        return audio_codecs.all? { |codec| %w[opus vorbis].include?(codec) } if extension == '.ogg'

        return false
      end

      return false if video_codecs.empty?

      if extension == '.mp4'
        video_codecs.all? { |codec| codec == 'h264' } &&
          audio_codecs.all? { |codec| %w[aac mp3].include?(codec) }
      elsif extension == '.webm'
        video_codecs.all? { |codec| %w[av1 vp8 vp9].include?(codec) } &&
          audio_codecs.all? { |codec| %w[opus vorbis].include?(codec) }
      else
        false
      end
    rescue JSON::ParserError, Errno::ENOENT
      false
    end

    def available_asset(provider, media_type, media_name, mime_type, media_url)
      {
        provider: provider,
        media_type: media_type,
        media_name: media_name,
        mime_type: mime_type,
        media_url: media_url,
        available: true
      }
    end

    def unavailable_asset(provider, media_type, media_name)
      {
        provider: provider,
        media_type: media_type || 'video',
        media_name: media_name,
        available: false
      }
    end

    def safe_file_within?(candidate, parent)
      File.file?(candidate) && File.realpath(candidate).start_with?("#{File.realpath(parent)}#{File::SEPARATOR}")
    rescue Errno::ENOENT
      false
    end

    def extract_aparat_hash(url)
      APARAT_HASH.match(url.to_s)&.captures&.first
    end

    def aparat_asset_url?(url)
      uri = URI.parse(url.to_s)
      trusted_aparat_asset_uri?(uri) && uri.path.to_s.downcase.end_with?('.mp4')
    rescue URI::InvalidURIError
      false
    end

    def trusted_aparat_asset_uri?(uri)
      uri.is_a?(URI::HTTPS) && uri.port == 443 && uri.userinfo.nil? && aparat_asset_host?(uri.host)
    end

    def aparat_asset_host?(host)
      host.to_s.downcase.end_with?('.asset.aparat.com')
    end

    def provider_for(segment)
      return 'presentation' if presentation_media_reference(segment[:url])
      return 'aparat' if extract_aparat_hash(segment[:source_url]) || aparat_asset_url?(segment[:url])

      'external'
    end

    def safe_media_name(url)
      reference = presentation_media_reference(url)
      reference && (reference[:display_name] || reference[:stored_name])
    end

    def safe_display_name(value)
      name = value.to_s.encode('UTF-8', invalid: :replace, undef: :replace, replace: '')
      name = name.gsub(/[\u0000-\u001f\u007f]/, '').strip
      return nil if name.empty?

      name[0, 255]
    end

    def playing_state(event)
      status = child_text(event, 'status').to_s.downcase
      return true if %w[play start playing].include?(status)
      return false if %w[pause stop stopped].include?(status)

      child_text(event, 'state').to_i == 1
    end

    def initial_media_time(url)
      uri = URI.parse(url.to_s)
      query = URI.decode_www_form(uri.query.to_s).to_h
      non_negative_float(query['t'] || query['start'], 0.0)
    rescue URI::InvalidURIError, ArgumentError
      0.0
    end

    def event_timestamp(event)
      (event['timestamp'] || event['date'] || event['timestampUTC']).to_f
    end

    def child_text(event, name)
      event.at_xpath(name)&.text
    end

    def positive_float(value, fallback)
      number = Float(value)
      number.positive? ? number : fallback
    rescue ArgumentError, TypeError
      fallback
    end

    def non_negative_float(value, fallback)
      number = Float(value)
      number.negative? ? fallback : number
    rescue ArgumentError, TypeError
      fallback
    end

    def translated_seconds(timestamp, translate_timestamp)
      rounded(translate_timestamp.call(timestamp).to_f / 1000.0)
    end

    def rounded(value)
      value.to_f.round(3)
    end

    def media_type_from_url(url)
      uri = URI.parse(url.to_s)
      media_type_for_extension(File.extname(uri.path.to_s).downcase)
    rescue URI::InvalidURIError
      'video'
    end

    def media_type_for_extension(extension)
      AUDIO_EXTENSIONS.include?(extension.to_s.downcase) ? 'audio' : 'video'
    end

    def normalized_extension(extension)
      return '.mp4' if extension == '.mov'
      return '.m4a' if %w[.aac .wav].include?(extension)

      extension
    end

    def mime_type_for(extension)
      {
        '.m4a' => 'audio/mp4',
        '.mp3' => 'audio/mpeg',
        '.ogg' => 'audio/ogg',
        '.mp4' => 'video/mp4',
        '.webm' => 'video/webm'
      }[extension] || 'application/octet-stream'
    end
  end
end
