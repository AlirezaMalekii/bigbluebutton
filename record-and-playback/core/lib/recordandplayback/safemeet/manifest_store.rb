# encoding: UTF-8

require 'json'
require 'fileutils'

module BigBlueButton
  module SafeMeet
  module ManifestStore
    SCHEMA_VERSION = 1

    def self.manifest_path(assets_dir, record_id)
      File.join(assets_dir, "#{record_id}.json")
    end

    def self.events_path(assets_dir, record_id)
      File.join(assets_dir, "#{record_id}.events.json")
    end

    def self.read_manifest(assets_dir, record_id)
      path = manifest_path(assets_dir, record_id)
      return nil unless File.exist?(path)

      JSON.parse(File.read(path))
    rescue StandardError
      nil
    end

    def self.read_events(assets_dir, record_id)
      path = events_path(assets_dir, record_id)
      return nil unless File.exist?(path)

      JSON.parse(File.read(path))
    rescue StandardError
      nil
    end

    def self.write_json_atomic(path, payload)
      FileUtils.mkdir_p(File.dirname(path))
      temp_path = "#{path}.#{Process.pid}.tmp"
      File.write(temp_path, JSON.pretty_generate(payload))
      File.rename(temp_path, path)
    end

    def self.merge_format_manifest(existing, format_name, format_manifest)
      merged = existing || {
        'schemaVersion' => SCHEMA_VERSION,
        'recordId' => format_manifest['recordId'],
        'formats' => [],
        'assets' => {},
        'ai' => default_ai_placeholder
      }

      merged['schemaVersion'] = SCHEMA_VERSION
      merged['recordId'] ||= format_manifest['recordId']
      merged['meetingId'] = format_manifest['meetingId'] if format_manifest['meetingId']
      merged['internalMeetingId'] = format_manifest['internalMeetingId'] if format_manifest['internalMeetingId']
      merged['name'] = format_manifest['name'] if format_manifest['name']
      merged['startTime'] = format_manifest['startTime'] if format_manifest['startTime']
      merged['endTime'] = format_manifest['endTime'] if format_manifest['endTime']
      merged['published'] = format_manifest['published'] unless format_manifest['published'].nil?
      merged['publishedAt'] = format_manifest['publishedAt'] if format_manifest['publishedAt']
      merged['participants'] = format_manifest['participants'] if format_manifest['participants']
      merged['duration'] = format_manifest['duration'] if format_manifest['duration']
      merged['playbackUrl'] = format_manifest['playbackUrl'] if format_manifest['playbackUrl']
      merged['recordingFormat'] = format_manifest['recordingFormat'] if format_manifest['recordingFormat']
      merged['processingStatus'] = format_manifest['processingStatus'] if format_manifest['processingStatus']
      merged['publishStatus'] = format_manifest['publishStatus'] if format_manifest['publishStatus']
      merged['indexedAt'] = format_manifest['indexedAt']
      merged['ai'] ||= default_ai_placeholder

      formats = Array(merged['formats'])
      formats << format_name unless formats.include?(format_name)
      merged['formats'] = formats

      format_assets = format_manifest['assets'] || {}
      format_assets.each do |key, value|
        merged['assets'] ||= {}
        merged['assets'][key] = value
      end

      merged['assets']&.delete('thumbnails')

      merged
    end

    def self.default_ai_placeholder
      {
        'status' => 'not_started',
        'transcript' => nil,
        'summary' => nil,
        'speakerAnalysis' => nil
      }
    end
  end
  end
end
