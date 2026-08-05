# encoding: UTF-8

require 'spec_helper'
require 'tmpdir'
require File.expand_path('../../lib/recordandplayback/safemeet/event_parser', __dir__)
require File.expand_path('../../lib/recordandplayback/safemeet/manifest_store', __dir__)
require File.expand_path('../../lib/recordandplayback/safemeet/asset_indexer', __dir__)

module BigBlueButton
  module SafeMeet
    describe EventParser do
      it 'normalizes talking true/false events with participant names and audio timeline' do
        events_xml = File.join(__dir__, 'resources', 'sample_events.xml')
        payload = EventParser.parse_events_file(events_xml)

        expect(payload['count']).to eq(3)
        expect(payload['talkingEventsSupported']).to eq(true)
        expect(payload['timeline']).to eq('recorded_audio')
        types = payload['events'].map { |event| event['type'] }
        expect(types).to eq(%w[talking_start talking_stop talking_stop])
        expect(payload['events'].first['name']).to eq('علی رضایی')
        expect(payload['events'].first['userId']).to eq('u-1')
        expect(payload['events'].first['audioTimestamp']).to eq(1.0)
        expect(payload['events'].first['timestampRaw']).to eq(2000)
      end

      it 'aligns talking events to recorded audio using RecordStatusEvent gaps' do
        events_xml = File.join(__dir__, 'resources', 'sample_events_with_recording_marks.xml')
        payload = EventParser.parse_events_file(events_xml)

        expect(payload['timeline']).to eq('recorded_audio')
        expect(payload['recordingStartOffsetMs']).to eq(4000)
        expect(payload['recordingIntervals'].length).to eq(2)
        expect(payload['count']).to eq(4)

        starts = payload['events'].select { |event| event['type'] == 'talking_start' }.map { |event| event['audioTimestamp'] }
        expect(starts).to eq([1.0, 5.0])
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
            'audio' => { 'exists' => true, 'mime' => 'audio/ogg', 'relativePath' => 'audio.ogg' }
          }
        }

        merged = ManifestStore.merge_format_manifest(existing, 'podcast', incoming)

        expect(merged['formats']).to include('presentation', 'podcast')
        expect(merged['assets']['presentation']).not_to be_nil
        expect(merged['assets']['audio']).not_to be_nil
        expect(merged['assets']['thumbnails']).to be_nil
      end
    end

    describe AssetIndexer do
      it 'indexes durable external media assets with their browser MIME types' do
        Dir.mktmpdir do |root|
          media_dir = File.join(root, 'external-media')
          FileUtils.mkdir_p(media_dir)
          File.binwrite(File.join(media_dir, 'audio.m4a'), 'audio')
          File.binwrite(File.join(media_dir, 'video.mp4'), 'video')
          indexer = described_class.new

          assets = indexer.send(:find_external_media_assets, root)

          expect(assets.map { |asset| asset[:relativePath] }).to eq([
            'external-media/audio.m4a',
            'external-media/video.mp4',
          ])
          expect(assets.map { |asset| indexer.send(:mime_for, asset[:absolutePath]) }).to eq([
            'audio/mp4',
            'video/mp4',
          ])
        end
      end
    end
  end
end
