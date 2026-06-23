# encoding: UTF-8

require 'rexml/document'

module BigBlueButton
  module SafeMeet
  module EventParser
    TALKING_EVENTS = %w[ParticipantTalkingEvent ParticipantTalkingStatusEvent].freeze

    EVENT_TYPE_MAP = {
      'ParticipantJoinEvent' => 'user_join',
      'ParticipantLeaveEvent' => 'user_leave',
      'ParticipantTalkingEvent' => 'talking_start',
      'ParticipantTalkingStatusEvent' => 'talking_stop',
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
      events = []
      talking_supported = false

      doc.elements.each('recording/event') do |event_elem|
        event_name = event_elem.attributes['eventname']
        next if event_name.nil? || event_name.empty?

        talking_supported = true if TALKING_EVENTS.include?(event_name)

        timestamp = extract_timestamp(event_elem)
        user_id = extract_user_id(event_elem)
        normalized_type = EVENT_TYPE_MAP[event_name] || event_name

        payload = {
          'type' => normalized_type,
          'timestamp' => timestamp,
          'userId' => user_id
        }

        if normalized_type == event_name
          payload['raw'] = sanitize_raw_event(event_elem)
        end

        events << payload
      end

      {
        'schemaVersion' => ManifestStore::SCHEMA_VERSION,
        'source' => File.basename(events_xml_path),
        'talkingEventsSupported' => talking_supported,
        'talkingEventsDocumented' => 'Talking events are available only when the archived events.xml contains ParticipantTalkingEvent or ParticipantTalkingStatusEvent and the events file is retained.',
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
        'talkingEventsSupported' => false,
        'talkingEventsDocumented' => 'Talking events are available only when the archived events.xml contains ParticipantTalkingEvent or ParticipantTalkingStatusEvent and the events file is retained.',
        'count' => 0,
        'events' => [],
        'error' => reason,
        'detail' => detail
      }.compact
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
