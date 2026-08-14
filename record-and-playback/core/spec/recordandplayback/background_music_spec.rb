# frozen_string_literal: true

require 'spec_helper'
require 'logger'
require 'stringio'
require 'tmpdir'

module BigBlueButton
  describe BackgroundMusic do
    def background_music_events(states, last_timestamp: nil, user_id: 'moderator-1', role: 'MODERATOR',
                                presenter: false)
      builder = Nokogiri::XML::Builder.new do |xml|
        xml.recording do
          xml.event(eventname: 'ParticipantJoinEvent', timestamp: 0) do
            xml.userId(user_id)
            xml.role(role)
          end
          if presenter
            xml.event(eventname: 'AssignPresenterEvent', timestamp: 1) do
              xml.userid(user_id)
            end
          end
          states.each do |item|
            xml.event(eventname: 'PluginGeneratedEvent', timestamp: item.fetch(:timestamp)) do
              xml.pluginName(described_class::PLUGIN_NAME)
              xml.pluginEventName(described_class::EVENT_NAME)
              xml.userId(user_id)
              xml.timestampUTC(item.fetch(:timestamp_utc, item.fetch(:timestamp)))
              xml.payloadJson(JSON.generate(item.fetch(:state)))
            end
          end
          xml.event(eventname: 'EndAndKickAllEvent', timestamp: last_timestamp) if last_timestamp
        end
      end
      builder.doc
    end

    def state(revision:, source:, status: 'playing', position: 0, volume: 0.35, looped: true,
              changed_at: revision)
      {
        source: source,
        status: status,
        volume: volume,
        loop: looped,
        position: position,
        changedAt: changed_at,
        revision: revision
      }
    end

    def default_source(track_id = 'calm')
      { type: 'default', trackId: track_id }
    end

    let(:logger_output) { StringIO.new }
    let(:logger) { Logger.new(logger_output) }
    let(:available_asset) do
      {
        provider: 'background-music-default',
        media_name: 'calm',
        mime_type: 'audio/mpeg',
        media_url: 'external-media/calm.mp3',
        available: true
      }
    end

    it 'rebuilds play, pause, volume, loop and track replacement as independent intervals' do
      doc = background_music_events([
                                      { timestamp: 1_000,
                                        state: state(revision: 1_000, changed_at: 1_000,
                                                     source: default_source) },
                                      { timestamp: 3_000,
                                        state: state(revision: 3_000, changed_at: 3_000,
                                                     source: default_source, status: 'paused', position: 2,
                                                     volume: 0.5) },
                                      { timestamp: 4_000,
                                        state: state(revision: 4_000, changed_at: 4_000,
                                                     source: default_source, status: 'playing', position: 2,
                                                     volume: 0.5, looped: false) },
                                      { timestamp: 6_000,
                                        state: state(revision: 6_000, changed_at: 6_000,
                                                     source: default_source('focus'), volume: 0.2) }
                                    ], last_timestamp: 8_000)

      segments = described_class.parse_segments(doc)

      expect(segments.length).to eq(2)
      expect(segments.map { |segment| [segment[:start_timestamp], segment[:stop_timestamp]] })
        .to eq([[1_000, 6_000], [6_000, 8_000]])

      interval = described_class.build_interval(
        segments.first, available_asset, 1_000, 6_000, ->(time) { time - 1_000 }
      )
      expect(interval[:sync_events]).to eq([
                                             { at: 0, position: 0, status: 'playing', volume: 0.35, loop: true },
                                             { at: 2, position: 2, status: 'paused', volume: 0.5, loop: true },
                                             { at: 3, position: 2, status: 'playing', volume: 0.5, loop: false }
                                           ])
    end

    it 'uses the synchronized command clock to compensate persistence latency' do
      doc = background_music_events([
                                      {
                                        timestamp: 5_000,
                                        timestamp_utc: 20_300,
                                        state: state(revision: 20_000, changed_at: 20_000,
                                                     source: default_source)
                                      }
                                    ], last_timestamp: 7_000)

      expect(described_class.parse_segments(doc).first[:start_timestamp]).to eq(4_700)
    end

    it 'splits recording gaps and advances a playing track across the omitted time' do
      doc = background_music_events([
                                      { timestamp: 1_000,
                                        state: state(revision: 1_000, changed_at: 1_000,
                                                     source: default_source) },
                                      { timestamp: 8_000,
                                        state: state(revision: 8_000, changed_at: 8_000,
                                                     source: default_source, position: 7, volume: 0.6) }
                                    ], last_timestamp: 10_000)
      allow(described_class).to receive(:materialize_asset).and_return(available_asset)
      translate = lambda do |time|
        time <= 4_000 ? time - 1_000 : 3_000 + (time - 7_000)
      end

      intervals = described_class.build(
        doc,
        recording_events: [
          { start_timestamp: 1_000, stop_timestamp: 4_000 },
          { start_timestamp: 7_000, stop_timestamp: 10_000 }
        ],
        translate_timestamp: translate,
        raw_presentation_dir: '/unused',
        package_dir: '/unused',
        logger: logger
      )

      expect(intervals.map { |item| [item[:timestamp], item[:stop_timestamp]] }).to eq([[0, 3], [3, 6]])
      expect(intervals.last[:sync_events].first)
        .to eq({ at: 3, position: 6, status: 'playing', volume: 0.35, loop: true })
    end

    it 'archives only referenced catalog files' do
      Dir.mktmpdir do |root|
        source_dir = File.join(root, 'catalog')
        target_dir = File.join(root, 'archive')
        events_file = File.join(root, 'events.xml')
        FileUtils.mkdir_p(source_dir)
        calm_file = described_class::DEFAULT_TRACK_FILES.fetch('calm')
        focus_file = described_class::DEFAULT_TRACK_FILES.fetch('focus')
        File.binwrite(File.join(source_dir, calm_file), 'calm bytes')
        File.binwrite(File.join(source_dir, focus_file), 'focus bytes')
        doc = background_music_events([
                                        { timestamp: 1_000,
                                          state: state(revision: 1_000, changed_at: 1_000,
                                                       source: default_source) }
                                      ], last_timestamp: 2_000)
        File.write(events_file, doc.to_xml)

        described_class.archive_default_assets(
          events_file: events_file,
          source_dir: source_dir,
          target_dir: target_dir,
          logger: logger
        )

        expect(File.binread(File.join(target_dir, calm_file))).to eq('calm bytes')
        expect(File.exist?(File.join(target_dir, focus_file))).to eq(false)
      end
    end

    it 'rejects forged upload paths and duplicate revisions' do
      upload_id = "#{'a' * 40}-1234"
      valid_source = {
        type: 'upload',
        trackId: upload_id,
        path: "/bigbluebutton/background-music/meeting-1/#{upload_id}",
        name: 'lesson.mp3'
      }
      forged_source = valid_source.merge(path: "/bigbluebutton/background-music/meeting-1/#{'b' * 40}-1234")
      doc = background_music_events([
                                      { timestamp: 1_000,
                                        state: state(revision: 1_000, changed_at: 1_000,
                                                     source: valid_source) },
                                      { timestamp: 2_000,
                                        state: state(revision: 1_000, changed_at: 2_000,
                                                     source: default_source) },
                                      { timestamp: 3_000,
                                        state: state(revision: 3_000, changed_at: 3_000,
                                                     source: forged_source) }
                                    ], last_timestamp: 4_000)

      states = described_class.persisted_states(doc)

      expect(states.length).to eq(1)
      expect(states.first.dig(:source, :track_id)).to eq(upload_id)
    end

    it 'ignores persisted music state from a known viewer' do
      doc = background_music_events([
                                      { timestamp: 2_000,
                                        state: state(revision: 2_000, changed_at: 2_000,
                                                     source: default_source) }
                                    ], last_timestamp: 3_000)
      viewer_event = Nokogiri::XML::Builder.new do |xml|
        xml.event(eventname: 'ParticipantJoinEvent', timestamp: 1_000) do
          xml.userId('moderator-1')
          xml.role('VIEWER')
        end
      end.doc.root
      doc.root.children.first.add_next_sibling(viewer_event)

      expect(described_class.persisted_states(doc)).to be_empty
    end

    it 'accepts persisted music state from the active presenter' do
      doc = background_music_events([
                                      { timestamp: 2_000,
                                        state: state(revision: 2_000, changed_at: 2_000,
                                                     source: default_source) }
                                    ], last_timestamp: 3_000, user_id: 'presenter-1', role: 'VIEWER',
                                       presenter: true)

      states = described_class.persisted_states(doc)

      expect(states.length).to eq(1)
      expect(states.first.dig(:source, :track_id)).to eq('calm')
    end

    it 'rejects music state after presenter control moves to another viewer' do
      doc = background_music_events([
                                      { timestamp: 2_000,
                                        state: state(revision: 2_000, changed_at: 2_000,
                                                     source: default_source) }
                                    ], last_timestamp: 3_000, user_id: 'presenter-1', role: 'VIEWER',
                                       presenter: true)
      reassignment = Nokogiri::XML::Builder.new do |xml|
        xml.event(eventname: 'AssignPresenterEvent', timestamp: 1_500) do
          xml.userid('presenter-2')
        end
      end.doc.root
      plugin_event = doc.at_xpath('/recording/event[@eventname="PluginGeneratedEvent"]')
      plugin_event.add_previous_sibling(reassignment)

      expect(described_class.persisted_states(doc)).to be_empty
    end
  end
end
