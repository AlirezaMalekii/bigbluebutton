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
      events = []
      talking_supported = false

      doc.elements.each('recording/event') do |event_elem|
        event_name = event_elem.attributes['eventname']
        next if event_name.nil? || event_name.empty?

        timestamp = extract_timestamp(event_elem)
        user_id = extract_user_id(event_elem)

        if TALKING_EVENTS.include?(event_name)
          talking_supported = true
          talking = extract_talking_flag(event_elem, event_name)
          normalized_type = talking ? 'talking_start' : 'talking_stop'
          next if talking.nil?

          payload = {
            'type' => normalized_type,
            'timestamp' => timestamp,
            'userId' => user_id,
            'participant' => user_id,
            'name' => participant_names[user_id],
            'talking' => talking,
            'eventname' => event_name
          }
          events << payload
        end
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
