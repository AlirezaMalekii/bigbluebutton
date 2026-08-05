# frozen_string_literal: true

require 'spec_helper'
require 'logger'
require 'stringio'
require 'tmpdir'

module BigBlueButton
  describe ExternalMedia do
    def external_media_events(events)
      builder = Nokogiri::XML::Builder.new do |xml|
        xml.recording do
          events.each do |event|
            xml.event(eventname: event.fetch(:name), timestamp: event.fetch(:timestamp)) do
              event.fetch(:fields, {}).each { |name, value| xml.send(name, value) }
            end
          end
        end
      end
      builder.doc
    end

    let(:logger_output) { StringIO.new }
    let(:logger) { Logger.new(logger_output) }
    let(:available_asset) do
      {
        provider: 'presentation',
        media_type: 'video',
        media_name: 'demo.mp4',
        mime_type: 'video/mp4',
        media_url: 'external-media/demo.mp4',
        available: true
      }
    end

    it 'publishes exact play, pause, seek and rate synchronization anchors' do
      doc = external_media_events([
                                    { name: 'StartExternalVideoRecordEvent', timestamp: 1_000,
                                      fields: { externalVideoUrl: 'https://example.test/video.mp4' } },
                                    { name: 'UpdateExternalVideoRecordEvent', timestamp: 2_000,
                                      fields: { status: 'playing', rate: 1, time: 1, state: 1 } },
                                    { name: 'UpdateExternalVideoRecordEvent', timestamp: 3_000,
                                      fields: { status: 'pause', rate: 1, time: 2, state: 0 } },
                                    { name: 'UpdateExternalVideoRecordEvent', timestamp: 5_000,
                                      fields: { status: 'seek', rate: 2, time: 8, state: 1 } },
                                    { name: 'StopExternalVideoRecordEvent', timestamp: 7_000 }
                                  ])

      segment = described_class.parse_segments(doc).first
      interval = described_class.build_interval(segment, available_asset, 1_000, 7_000, ->(time) { time - 1_000 })

      expect(interval[:timestamp]).to eq(0)
      expect(interval[:stop_timestamp]).to eq(6)
      expect(interval[:sync_events]).to eq([
                                             { at: 0, media_time: 0, playing: true, rate: 1 },
                                             { at: 1, media_time: 1, playing: true, rate: 1 },
                                             { at: 2, media_time: 2, playing: false, rate: 1 },
                                             { at: 4, media_time: 8, playing: true, rate: 2 }
                                           ])
    end

    it 'splits playback across recording gaps and restores the correct media state' do
      doc = external_media_events([
                                    { name: 'StartExternalVideoRecordEvent', timestamp: 1_000,
                                      fields: { externalVideoUrl: 'https://example.test/video.mp4' } },
                                    { name: 'UpdateExternalVideoRecordEvent', timestamp: 3_000,
                                      fields: { status: 'pause', rate: 1, time: 2, state: 0 } },
                                    { name: 'UpdateExternalVideoRecordEvent', timestamp: 5_000,
                                      fields: { status: 'play', rate: 1, time: 2, state: 1 } },
                                    { name: 'StopExternalVideoRecordEvent', timestamp: 7_000 }
                                  ])
      allow(described_class).to receive(:materialize_asset).and_return(available_asset)
      translate = lambda do |time|
        time <= 4_000 ? time - 1_000 : 3_000 + (time - 5_000)
      end

      intervals = described_class.build(
        doc,
        recording_events: [
          { start_timestamp: 1_000, stop_timestamp: 4_000 },
          { start_timestamp: 5_000, stop_timestamp: 7_000 }
        ],
        translate_timestamp: translate,
        raw_presentation_dir: '/unused',
        package_dir: '/unused',
        logger: logger
      )

      expect(intervals.map { |item| [item[:timestamp], item[:stop_timestamp]] }).to eq([[0, 3], [3, 5]])
      expect(intervals.last[:sync_events].first).to eq({ at: 3, media_time: 2, playing: true, rate: 1 })
    end

    it 'copies uploaded presentation media to a local recording asset without auth query data' do
      Dir.mktmpdir do |root|
        raw_root = File.join(root, 'raw-presentation')
        package_dir = File.join(root, 'published')
        presentation_id = 'abcdef1234-1785911867576'
        source_dir = File.join(raw_root, presentation_id)
        source = File.join(source_dir, "#{presentation_id}.mp3")
        FileUtils.mkdir_p(source_dir)
        File.binwrite(source, 'media bytes')
        url = "https://live.example/bigbluebutton/presentation/media/meeting/#{presentation_id}" \
              "?presFilename=#{presentation_id}.mp3&filename=voice.mp3&sessionToken=TOP_SECRET"
        reference = described_class.presentation_media_reference(url)
        allow(described_class).to receive(:valid_media_file?).and_return(true)
        allow(described_class).to receive(:browser_compatible_media?).and_return(true)

        asset = described_class.materialize_presentation_media(reference, raw_root, package_dir, logger)

        expect(asset[:available]).to eq(true)
        expect(asset[:media_url]).to match(%r{\Aexternal-media/[a-f0-9]{24}\.mp3\z})
        expect(File.binread(File.join(package_dir, asset[:media_url]))).to eq('media bytes')
        expect(JSON.generate(asset)).not_to include('TOP_SECRET', 'sessionToken', 'live.example')
        expect(logger_output.string).not_to include('TOP_SECRET', 'sessionToken')
      end
    end

    it 'transcodes uploaded audio to a browser-compatible local recording asset' do
      skip 'ffmpeg is unavailable' unless system('ffmpeg', '-version', out: File::NULL, err: File::NULL)

      Dir.mktmpdir do |root|
        allow(BigBlueButton).to receive(:logger).and_return(logger)
        raw_root = File.join(root, 'raw-presentation')
        package_dir = File.join(root, 'published')
        presentation_id = 'abcdef1234-1785911867577'
        source_dir = File.join(raw_root, presentation_id)
        source = File.join(source_dir, "#{presentation_id}.wav")
        FileUtils.mkdir_p(source_dir)
        generated = system(
          'ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2', source,
          out: File::NULL, err: File::NULL
        )
        expect(generated).to eq(true)
        url = "https://live.example/bigbluebutton/presentation/media/meeting/#{presentation_id}" \
              "?presFilename=#{presentation_id}.wav&filename=voice.wav&sessionToken=TOP_SECRET"
        doc = external_media_events([
                                      { name: 'StartExternalVideoRecordEvent', timestamp: 1_000,
                                        fields: { externalVideoUrl: url } },
                                      { name: 'StopExternalVideoRecordEvent', timestamp: 2_000 }
                                    ])

        items = described_class.build(
          doc,
          recording_events: [{ start_timestamp: 1_000, stop_timestamp: 2_000 }],
          translate_timestamp: ->(time) { time - 1_000 },
          raw_presentation_dir: raw_root,
          package_dir: package_dir,
          logger: logger
        )

        expect(items.length).to eq(1)
        expect(items.first).to include(media_type: 'audio', mime_type: 'audio/mp4', available: true)
        expect(items.first[:media_url]).to end_with('.m4a')
        expect(described_class.browser_compatible_media?(
                 File.join(package_dir, items.first[:media_url]), 'audio', '.m4a'
               )).to eq(true)
        expect(JSON.generate(items)).not_to include('TOP_SECRET', 'sessionToken', 'live.example')
      end
    end

    it 'marks missing presentation media unavailable without publishing the source URL' do
      url = 'https://live.example/bigbluebutton/presentation/media/meeting/abcdef1234-1785911867576' \
            '?presFilename=abcdef1234-1785911867576.mp4&filename=missing.mp4&sessionToken=TOP_SECRET'
      segment = { url: url, source_url: nil }

      asset = described_class.materialize_asset(
        segment,
        raw_presentation_dir: '/missing',
        package_dir: '/unused',
        logger: logger
      )

      expect(asset).to include(provider: 'presentation', media_type: 'video', available: false)
      expect(JSON.generate(asset)).not_to include('TOP_SECRET', 'sessionToken', 'live.example')
      expect(logger_output.string).not_to include('TOP_SECRET', 'sessionToken')
    end

    it 'fails a stale Aparat asset safely without logging its signature' do
      signed_url = 'https://cdn.asset.aparat.com/video.mp4?wmsAuthSign=TOP_SECRET'
      segment = {
        url: signed_url,
        source_url: 'https://www.aparat.com/v/abc123'
      }
      allow(described_class).to receive(:resolve_aparat_playback_url).and_raise(Net::ReadTimeout)

      asset = described_class.materialize_asset(
        segment,
        raw_presentation_dir: '/unused',
        package_dir: '/unused',
        logger: logger
      )

      expect(asset).to include(provider: 'aparat', media_type: 'video', available: false)
      expect(JSON.generate(asset)).not_to include('TOP_SECRET', 'wmsAuthSign', 'asset.aparat.com')
      expect(logger_output.string).not_to include('TOP_SECRET', 'wmsAuthSign', signed_url)
    end

    it 'allows Aparat downloads only from trusted HTTPS asset hosts on port 443' do
      expect(described_class.aparat_asset_url?('https://cdn.asset.aparat.com/video.mp4')).to eq(true)
      expect(described_class.aparat_asset_url?('https://cdn.asset.aparat.com:8443/video.mp4')).to eq(false)
      expect(described_class.aparat_asset_url?('https://asset.aparat.com.evil.test/video.mp4')).to eq(false)
      expect(described_class.aparat_asset_url?('http://cdn.asset.aparat.com/video.mp4')).to eq(false)
    end
  end
end
