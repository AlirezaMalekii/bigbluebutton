# encoding: UTF-8

require 'spec_helper'
require File.expand_path('../../lib/recordandplayback/safemeet/event_parser', __dir__)
require File.expand_path('../../lib/recordandplayback/safemeet/manifest_store', __dir__)

module BigBlueButton
  module SafeMeet
    describe EventParser do
      it 'normalizes join and talking events from events xml' do
        events_xml = File.join(__dir__, 'resources', 'sample_events.xml')
        payload = EventParser.parse_events_file(events_xml)

        expect(payload['count']).to eq(3)
        expect(payload['talkingEventsSupported']).to eq(true)
        expect(payload['events'].map { |event| event['type'] }).to include('user_join', 'talking_start', 'talking_stop')
      end

      it 'returns empty payload when events file is missing' do
        payload = EventParser.parse_events_file('/tmp/does-not-exist-events.xml')

        expect(payload['count']).to eq(0)
        expect(payload['error']).to eq('missing_events_file')
      end
    end

    describe ManifestStore do
      it 'merges format manifests without dropping prior assets' do
        existing = {
          'recordId' => 'rec-1',
          'formats' => ['presentation'],
          'assets' => {
            'presentation' => { 'exists' => true }
          }
        }

        incoming = {
          'recordId' => 'rec-1',
          'assets' => {
            'audio' => { 'exists' => true }
          }
        }

        merged = ManifestStore.merge_format_manifest(existing, 'podcast', incoming)

        expect(merged['formats']).to include('presentation', 'podcast')
        expect(merged['assets']['presentation']).not_to be_nil
        expect(merged['assets']['audio']).not_to be_nil
      end
    end
  end
end
