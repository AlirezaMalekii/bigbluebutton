# encoding: UTF-8

require 'rexml/document'

module BigBlueButton
  module SafeMeet
  module EventParser
    TALKING_EVENTS = %w[ParticipantTalkingEvent ParticipantTalkingStatusEvent].freeze

    EVENT_TYPE_MAP = {
      'ParticipantJoinEvent' => 'user_join',
      'ParticipantLeaveEvent' => 'user_leave',
      'ParticipantStatusChangeEvent' => 'user_status_change',
      'PublicChatEvent' => 'chat_message',
      'PrivateChatEvent' => 'chat_message',
      'StartPresentationEvent' => 'presentation_start',
      'GotoSlideEvent' => 'presentation_slide',
      'ResizeAndMoveSlideEvent' => 'presentation_slide',
      'DeskShareStartedEvent' => 'deskshare_start',
      'DeskShareStoppedEvent' => 'deskshare_stop',
      'StartWebRTCShareEvent' => 'deskshare_start',
      'StopWebRTCShareEvent' => 'deskshare_stop',
      'RecordMarkerEvent' => 'record_marker'
    }.freeze

    def self.parse_events_file(events_xml_path)
      return empty_events_payload('missing_events_file') unless events_xml_path && File.exist?(events_xml_path)

      doc = REXML::Document.new(File.read(events_xml_path))
      participant_names = build_participant_name_map(doc)
      recording_intervals = build_recording_intervals(doc)
      first_event_ts = first_event_timestamp(doc)
      recording_start_offset_ms = recording_intervals.empty? || first_event_ts.nil? ? 0 : recording_intervals.first['startMs'] - first_event_ts

      events = []
      talking_supported = false

      doc.elements.each('recording/event') do |event_elem|
        event_name = event_elem.attributes['eventname']
        next if event_name.nil? || event_name.empty?

        timestamp_raw = extract_timestamp(event_elem)
        user_id = extract_user_id(event_elem)

        next unless TALKING_EVENTS.include?(event_name)

        talking_supported = true
        talking = extract_talking_flag(event_elem, event_name)
        normalized_type = talking ? 'talking_start' : 'talking_stop'
        next if talking.nil?

        audio_ms = raw_to_audio_ms(timestamp_raw, first_event_ts, recording_intervals)
        next if audio_ms.nil?

        audio_seconds = (audio_ms / 1000.0).round(3)

        payload = {
          'type' => normalized_type,
          'timestamp' => audio_ms,
          'timestampRaw' => timestamp_raw,
          'audioTimestamp' => audio_seconds,
          'playbackTimestamp' => audio_seconds,
          'userId' => user_id,
          'participant' => user_id,
          'name' => participant_names[user_id],
          'talking' => talking,
          'eventname' => event_name
        }
        events << payload
      end

      {
        'schemaVersion' => ManifestStore::SCHEMA_VERSION,
        'source' => File.basename(events_xml_path),
        'timeline' => 'recorded_audio',
        'talkingEventsSupported' => talking_supported,
        'talkingEventsDocumented' => 'Talking events are available only when the archived events.xml contains ParticipantTalkingEvent or ParticipantTalkingStatusEvent and the events file is retained.',
        'recordingStartOffsetMs' => recording_start_offset_ms,
        'recordingIntervals' => recording_intervals,
        'count' => events.length,
        'events' => events
      }
    rescue StandardError => e
      empty_events_payload('parse_error', e.message)
    end

    def self.empty_events_payload(reason, detail = nil)
      {
        'schemaVersion' => ManifestStore::SCHEMA_VERSION,
        'source' => nil,
        'timeline' => nil,
        'talkingEventsSupported' => false,
        'talkingEventsDocumented' => 'Talking events are available only when the archived events.xml contains ParticipantTalkingEvent or ParticipantTalkingStatusEvent and the events file is retained.',
        'recordingStartOffsetMs' => nil,
        'recordingIntervals' => [],
        'count' => 0,
        'events' => [],
        'error' => reason,
        'detail' => detail
      }.compact
    end

    def self.build_recording_intervals(doc)
      first_ts = first_event_timestamp(doc)
      last_ts = last_event_timestamp(doc)
      return [] if first_ts.nil? || last_ts.nil?

      rec_events = extract_record_status_events(doc)
      rec_events = [first_ts, last_ts] if rec_events.empty?
      rec_events << last_ts if rec_events.size.odd?

      pairs = []
      rec_events.each_slice(2) do |start_ms, stop_ms|
        pairs << { 'startMs' => start_ms, 'endMs' => stop_ms }
      end

      pairs.map do |interval|
        {
          'startMs' => interval['startMs'],
          'endMs' => interval['endMs'],
          'startAudioSec' => ms_to_audio_seconds(interval['startMs'], first_ts, pairs),
          'endAudioSec' => ms_to_audio_seconds(interval['endMs'], first_ts, pairs)
        }
      end
    end

    def self.ms_to_audio_seconds(raw_ms, first_ts, intervals)
      audio_ms = raw_to_audio_ms(raw_ms, first_ts, intervals)
      return nil if audio_ms.nil?

      (audio_ms / 1000.0).round(3)
    end

    # Map a raw epoch-ms event timestamp to podcast audio timeline (ms from audio start).
    # Mirrors BBB edl_match_recording_marks gap removal.
    def self.raw_to_audio_ms(raw_ts, first_ts, intervals)
      return nil if raw_ts.nil? || first_ts.nil? || intervals.nil? || intervals.empty?

      offset = 0
      last_stop = first_ts

      intervals.each do |interval|
        start_ms = interval['startMs']
        end_ms = interval['endMs']
        offset += start_ms - last_stop

        if raw_ts >= start_ms && raw_ts <= end_ms
          return raw_ts - first_ts - offset
        end

        last_stop = end_ms
      end

      nil
    end

    def self.first_event_timestamp(doc)
      timestamps = collect_event_timestamps(doc)
      timestamps.min
    end

    def self.last_event_timestamp(doc)
      timestamps = collect_event_timestamps(doc)
      timestamps.max
    end

    def self.collect_event_timestamps(doc)
      timestamps = []
      doc.elements.each('recording/event') do |event_elem|
        ts = extract_timestamp(event_elem)
        timestamps << ts if ts
      end
      timestamps
    end

    def self.extract_record_status_events(doc)
      events = []
      doc.elements.each('recording/event') do |event_elem|
        next unless event_elem.attributes['eventname'] == 'RecordStatusEvent'

        ts = extract_timestamp(event_elem)
        events << ts if ts
      end
      events.sort
    end

    def self.build_participant_name_map(doc)
      names = {}

      doc.elements.each('recording/event') do |event_elem|
        event_name = event_elem.attributes['eventname']
        user_id = extract_user_id(event_elem)
        next if user_id.nil? || user_id.empty?

        case event_name
        when 'ParticipantJoinedEvent'
          caller = extract_child_text(event_elem, 'callername') || extract_child_text(event_elem, 'callernumber')
          names[user_id] = caller if caller && !caller.empty?
        when 'ParticipantJoinEvent'
          display = extract_child_text(event_elem, 'name')
          names[user_id] = display if display && !display.empty?
        when 'AssignPresenterEvent'
          display = extract_child_text(event_elem, 'name')
          userid = extract_child_text(event_elem, 'userid') || extract_child_text(event_elem, 'userId')
          names[userid] = display if userid && display && !display.empty?
        end
      end

      names
    end

    def self.extract_talking_flag(event_elem, event_name)
      talking_text = extract_child_text(event_elem, 'talking')
      if talking_text
        return true if talking_text.downcase == 'true'
        return false if talking_text.downcase == 'false'
      end

      return false if event_name == 'ParticipantTalkingStatusEvent'

      nil
    end

    def self.extract_timestamp(event_elem)
      %w[timestamp date timestampUTC].each do |attr|
        value = event_elem.attributes[attr]
        return value.to_i if value && value.to_s.match?(/\A\d+\z/)
      end

      timestamp_elem = event_elem.elements['timestamp']
      return timestamp_elem.text.to_i if timestamp_elem && timestamp_elem.text.to_s.match?(/\A\d+\z/)

      nil
    end

    def self.extract_user_id(event_elem)
      %w[userId participant userid internalUserId].each do |attr|
        value = event_elem.attributes[attr]
        return value if value && !value.empty?
      end

      %w[userId participant userid internalUserId].each do |name|
        elem = event_elem.elements[name]
        return elem.text if elem && !elem.text.to_s.empty?
      end

      nil
    end

    def self.extract_child_text(event_elem, name)
      elem = event_elem.elements[name]
      return nil unless elem

      text = elem.text.to_s.strip
      text.empty? ? nil : text
    end

    def self.sanitize_raw_event(event_elem)
      raw = {}
      event_elem.attributes.each do |name, value|
        next if value.nil?

        raw[name] = value unless path_like?(value)
      end

      event_elem.elements.each do |child|
        next if child.text.nil?

        text = child.text.strip
        next if text.empty? || path_like?(text)

        raw[child.name] = text
      end

      raw
    end

    def self.path_like?(value)
      value.include?('/var/') || value.include?('\\')
    end
  end
  end
end
