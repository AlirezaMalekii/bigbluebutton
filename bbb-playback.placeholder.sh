#!/bin/bash

if [ -f bbb-playback/package.json ] && [ -f bbb-playback/src/config.js ]; then
  echo "Using vendored Skyroom-customized bbb-playback in repository"
  exit 0
fi

git clone --branch v5.4.6 --depth 1 https://github.com/bigbluebutton/bbb-playback bbb-playback
