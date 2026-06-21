#!/bin/bash -ex

TARGET=`basename $(pwd)`


PACKAGE=$(echo $TARGET | cut -d'_' -f1)
VERSION=$(echo $TARGET | cut -d'_' -f2)
DISTRO=$(echo $TARGET | cut -d'_' -f3)
TAG=$(echo $TARGET | cut -d'_' -f4)

#
# Clean up directories

rm -rf staging

#
# Package

BBB_PLAYBACK_VERSION=2.3
BBB_PLAYBACK_HOMEPAGE=playback/presentation
BBB_PLAYBACK_BASE=staging/var/bigbluebutton/$BBB_PLAYBACK_HOMEPAGE
BBB_PLAYBACK=$BBB_PLAYBACK_BASE/$BBB_PLAYBACK_VERSION
if ! which sponge ; then
    apt-get -y install moreutils
fi

export REACT_APP_BBB_PLAYBACK_BUILD=$(git rev-parse --short HEAD 2>/dev/null || echo skyroom)

npm install
npm run-script build
grep \"version\"\: package.json | sed -e 's|.*\ \"||g' -e 's|\".*||g' > bbb-playback-version
mkdir -p $BBB_PLAYBACK
cp -r ./build/* bbb-playback-version $BBB_PLAYBACK


mkdir -p staging/usr/share/bigbluebutton/nginx
cp playback.nginx staging/usr/share/bigbluebutton/nginx

##

. ./opts-$DISTRO.sh

#
# Build RPM package

fpm -s dir -C ./staging -n $PACKAGE \
    --version $VERSION --epoch $EPOCH \
    --after-install after-install.sh \
    --description "SafeMeet / Skyroom player for presentation format recordings" \
    $DIRECTORIES \
    $OPTS
