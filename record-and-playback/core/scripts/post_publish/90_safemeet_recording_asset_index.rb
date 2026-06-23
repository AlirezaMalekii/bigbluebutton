#!/usr/bin/ruby
# encoding: UTF-8

ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../../Gemfile', __dir__)
require 'bundler/setup'

require 'optimist'
require 'yaml'
require File.expand_path('../../lib/recordandplayback', __dir__)
require File.expand_path('../../lib/recordandplayback/safemeet/asset_indexer', __dir__)

logger = Logger.new('/var/log/bigbluebutton/post_publish.log', 'weekly')
logger.level = Logger::INFO
BigBlueButton.logger = logger

opts = Optimist.options do
  opt :meeting_id, 'Meeting id to index', type: String
  opt :format, 'Playback format name', type: String
end

meeting_id = opts[:meeting_id]
format_name = opts[:format]

BigBlueButton.logger.info("SafeMeet asset index for [#{meeting_id}] format [#{format_name}] starts")

begin
  props = BigBlueButton.read_props
  enabled = props.fetch('safemeet_recording_assets_enabled', true)
  unless enabled
    BigBlueButton.logger.info('SafeMeet recording asset indexing disabled by config')
    exit 0
  end

  indexer = BigBlueButton::SafeMeet::AssetIndexer.new(props)
  manifest = indexer.index!(meeting_id, format_name)

  if manifest.nil?
    BigBlueButton.logger.warn("SafeMeet asset index skipped: published directory missing for #{meeting_id}/#{format_name}")
  else
    BigBlueButton.logger.info("SafeMeet asset index completed for #{meeting_id}/#{format_name}")
  end
rescue StandardError => e
  BigBlueButton.logger.error("SafeMeet asset index failed for #{meeting_id}/#{format_name}: #{e.message}")
  e.backtrace.each { |line| BigBlueButton.logger.error(line) }
end

BigBlueButton.logger.info("SafeMeet asset index for [#{meeting_id}] ends")
exit 0
