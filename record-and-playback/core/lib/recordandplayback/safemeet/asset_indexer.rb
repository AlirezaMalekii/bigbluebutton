# encoding: UTF-8

require 'rexml/document'
require 'digest'
require 'find'
require 'rexml/document'
require 'shellwords'
require_relative 'manifest_store'
require_relative 'event_parser'

module BigBlueButton
  module SafeMeet
  class AssetIndexer
    MIME_BY_EXT = {
      '.ogg' => 'audio/ogg',
      '.webm' => 'video/webm',
      '.mp4' => 'video/mp4',
      '.wav' => 'audio/wav',
      '.vtt' => 'text/vtt',
      '.json' => 'application/json',
      '.xml' => 'application/xml',
      '.html' => 'text/html',
      '.png' => 'image/png',
      '.svg' => 'image/svg+xml',
      '.txt' => 'text/plain'
    }.freeze

    def initialize(props = {})
      @props = props
      @published_dir = props['published_dir'] || '/var/bigbluebutton/published'
      @assets_dir = props['safemeet_assets_dir'] || File.join(props['recording_dir'] || '/var/bigbluebutton/recording', 'safemeet-assets')
      @raw_dir = props['recording_dir'] ? File.join(props['recording_dir'], 'raw') : '/var/bigbluebutton/recording/raw'
      @events_dir = props['events_dir'] || '/var/bigbluebutton/events'
      @checksum_enabled = props.fetch('safemeet_assets_checksum_enabled', false)
      @playback_protocol = props['playback_protocol'] || 'https'
      @playback_host = props['playback_host'] || '127.0.0.1'
    end

    def index!(record_id, format_name)
      published_root = File.join(@published_dir, format_name, record_id)
      return nil unless File.directory?(published_root)

      metadata = read_metadata(published_root)
      format_manifest = build_format_manifest(record_id, format_name, published_root, metadata)
      existing = ManifestStore.read_manifest(@assets_dir, record_id)
      merged = ManifestStore.merge_format_manifest(existing, format_name, format_manifest)
      ManifestStore.write_json_atomic(ManifestStore.manifest_path(@assets_dir, record_id), merged)

      events_xml = locate_events_xml(record_id)
      events_payload = EventParser.parse_events_file(events_xml)
      events_payload['indexedAt'] = Time.now.utc.iso8601
      ManifestStore.write_json_atomic(ManifestStore.events_path(@assets_dir, record_id), events_payload)

      merged
    end

    private

    def read_metadata(published_root)
      metadata_path = File.join(published_root, 'metadata.xml')
      return {} unless File.exist?(metadata_path)

      doc = REXML::Document.new(File.read(metadata_path))
      recording = doc.elements['recording']
      return {} unless recording

      meeting = recording.elements['meeting']
      playback = recording.elements['playback/format']

      {
        'recordId' => text_at(recording, 'id'),
        'name' => meeting ? meeting.attributes['name'] : nil,
        'meetingId' => meeting ? meeting.attributes['externalId'] : nil,
        'internalMeetingId' => meeting ? meeting.attributes['id'] : nil,
        'startTime' => text_at(recording, 'start_time')&.to_i,
        'endTime' => text_at(recording, 'end_time')&.to_i,
        'participants' => text_at(recording, 'participants')&.to_i,
        'published' => text_at(recording, 'published') == 'true',
        'state' => text_at(recording, 'state'),
        'playbackUrl' => playback ? text_at(playback, 'link') : nil,
        'duration' => playback ? text_at(playback, 'length')&.to_i : nil
      }
    end

    def build_format_manifest(record_id, format_name, published_root, metadata)
      assets = {
        'audio' => summarize_group(find_audio_assets(published_root, format_name)),
        'events' => summarize_asset('events.xml', locate_events_xml(record_id), 'application/xml'),
        'metadata' => summarize_asset('metadata.xml', File.join(published_root, 'metadata.xml'), 'application/xml'),
        'webcams' => summarize_group(find_webcam_assets(published_root)),
        'deskshare' => summarize_group(find_deskshare_assets(published_root)),
        'captions' => summarize_group(find_caption_assets(published_root)),
        'presentation' => summarize_group(find_presentation_assets(published_root)),
        'slides' => summarize_group(find_slide_assets(published_root)),
        'thumbnails' => summarize_group(find_thumbnail_assets(published_root))
      }

      {
        'schemaVersion' => ManifestStore::SCHEMA_VERSION,
        'recordId' => record_id,
        'meetingId' => metadata['meetingId'],
        'internalMeetingId' => metadata['internalMeetingId'],
        'name' => metadata['name'],
        'startTime' => metadata['startTime'],
        'endTime' => metadata['endTime'],
        'published' => metadata['published'],
        'publishedAt' => metadata['published'] ? Time.now.utc.iso8601 : nil,
        'participants' => metadata['participants'],
        'duration' => metadata['duration'],
        'playbackUrl' => metadata['playbackUrl'],
        'recordingFormat' => format_name,
        'processingStatus' => metadata['state'] || 'published',
        'publishStatus' => metadata['published'] ? 'published' : 'unpublished',
        'indexedAt' => Time.now.utc.iso8601,
        'assets' => assets,
        'ai' => ManifestStore.default_ai_placeholder
      }
    end

    def summarize_group(files)
      existing = files.select { |file| File.exist?(file[:absolutePath]) }
      primary = existing.first

      return { 'exists' => false, 'items' => [] } if primary.nil?

      summary = summarize_asset(primary[:relativePath], primary[:absolutePath], primary[:mime], primary[:assetId])
      summary['items'] = existing.map do |file|
        summarize_asset(file[:relativePath], file[:absolutePath], file[:mime], file[:assetId])
      end
      summary
    end

    def summarize_asset(relative_path, absolute_path, mime = nil, asset_id = nil)
      exists = absolute_path && File.exist?(absolute_path)
      asset_id ||= relative_path

      unless exists
        return {
          'exists' => false,
          'relativePath' => relative_path,
          'assetId' => asset_id,
          'url' => nil,
          'mime' => mime,
          'size' => nil,
          'checksum' => nil,
          'checksumAlgorithm' => nil,
          'duration' => nil
        }
      end

      size = File.size(absolute_path)
      checksum = nil
      checksum_algorithm = nil

      if @checksum_enabled
        checksum_algorithm = 'sha256'
        checksum = Digest::SHA256.file(absolute_path).hexdigest
      end

      {
        'exists' => true,
        'relativePath' => relative_path,
        'assetId' => asset_id,
        'url' => nil,
        'mime' => mime || mime_for(absolute_path),
        'size' => size,
        'checksum' => checksum,
        'checksumAlgorithm' => checksum_algorithm,
        'duration' => media_duration(absolute_path)
      }
    end

    def find_audio_assets(published_root, format_name)
      files = []
      if format_name == 'podcast'
        path = File.join(published_root, 'audio.ogg')
        files << asset_entry('audio.ogg', path, 'audio:podcast', 'audio/ogg') if File.exist?(path)
      end

      %w[audio webcams.webm video/webcams.webm].each do |candidate|
        path = File.join(published_root, candidate)
        next unless File.exist?(path)

        files << asset_entry(candidate, path, "audio:#{candidate}")
      end

      Dir.glob(File.join(published_root, 'video', '*.{webm,mp4,ogg}')).each do |path|
        relative = path.sub("#{published_root}/", '')
        files << asset_entry(relative, path, "audio:#{relative}")
      end

      files
    end

    def find_webcam_assets(published_root)
      files = []
      webcams = File.join(published_root, 'video', 'webcams.webm')
      files << asset_entry('video/webcams.webm', webcams, 'webcams:composite', 'video/webm') if File.exist?(webcams)

      Dir.glob(File.join(published_root, 'video', 'video-*.{webm,mp4}')).each do |path|
        relative = path.sub("#{published_root}/", '')
        files << asset_entry(relative, path, "webcams:#{File.basename(path)}")
      end

      files
    end

    def find_deskshare_assets(published_root)
      files = []
      deskshare_xml = File.join(published_root, 'deskshare.xml')
      files << asset_entry('deskshare.xml', deskshare_xml, 'deskshare:timeline', 'application/xml') if File.exist?(deskshare_xml)

      Dir.glob(File.join(published_root, 'deskshare', '*.{webm,mp4}')).each do |path|
        relative = path.sub("#{published_root}/", '')
        files << asset_entry(relative, path, "deskshare:#{File.basename(path)}")
      end

      Dir.glob(File.join(published_root, 'screenshare-*.{webm,mp4}')).each do |path|
        relative = File.basename(path)
        files << asset_entry(relative, path, "deskshare:#{relative}")
      end

      files
    end

    def find_caption_assets(published_root)
      files = []
      captions_json = File.join(published_root, 'captions.json')
      files << asset_entry('captions.json', captions_json, 'captions:index', 'application/json') if File.exist?(captions_json)

      Dir.glob(File.join(published_root, 'caption_*.vtt')).each do |path|
        relative = File.basename(path)
        files << asset_entry(relative, path, "captions:#{relative}", 'text/vtt')
      end

      files
    end

    def find_presentation_assets(published_root)
      files = []
      %w[slides_new.xml layout.xml polls.json external_videos.json presentation_text.json notes.html shapes.svg panzooms.xml cursor.xml tldraw.json video.xml].each do |name|
        path = File.join(published_root, name)
        files << asset_entry(name, path, "presentation:#{name}") if File.exist?(path)
      end

      Dir.glob(File.join(published_root, 'presentation', '**', '*')).select { |f| File.file?(f) }.each do |path|
        relative = path.sub("#{published_root}/", '')
        next if relative.include?('/thumbnails/') || relative.match?(/slide-\d+\.png$/)

        files << asset_entry(relative, path, "presentation:#{relative}")
      end

      files
    end

    def find_slide_assets(published_root)
      Dir.glob(File.join(published_root, 'presentation', '**', 'slide-*.png')).map do |path|
        relative = path.sub("#{published_root}/", '')
        asset_entry(relative, path, "slides:#{relative}", 'image/png')
      end
    end

    def find_thumbnail_assets(published_root)
      Dir.glob(File.join(published_root, 'presentation', '**', 'thumbnails', '*')).select { |f| File.file?(f) }.map do |path|
        relative = path.sub("#{published_root}/", '')
        asset_entry(relative, path, "thumbnails:#{relative}", 'image/png')
      end
    end

    def asset_entry(relative_path, absolute_path, asset_id, mime = nil)
      {
        relativePath: relative_path,
        absolutePath: absolute_path,
        assetId: asset_id,
        mime: mime
      }
    end

    def locate_events_xml(record_id)
      candidates = [
        File.join(@raw_dir, record_id, 'events.xml'),
        File.join(@events_dir, record_id, 'events.xml')
      ]

      candidates.find { |path| File.exist?(path) }
    end

    def mime_for(path)
      MIME_BY_EXT[File.extname(path).downcase] || 'application/octet-stream'
    end

    def media_duration(path)
      return nil unless path && File.exist?(path)
      return nil unless %w[.webm .mp4 .ogg .wav].include?(File.extname(path).downcase)

      command = "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 #{Shellwords.escape(path)}"
      output = `#{command}`.strip
      return nil if output.empty? || output.to_f <= 0

      output.to_f.round
    rescue StandardError
      nil
    end

    def text_at(parent, name)
      elem = parent.elements[name]
      elem ? elem.text : nil
    end
  end
  end
end
