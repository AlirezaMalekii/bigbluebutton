#!/bin/bash -e

BIGBLUEBUTTON_USER=bigbluebutton
BBB_HTML5_SETTINGS_FILE=/usr/share/bigbluebutton/html5-client/private/config/settings.yml
BBB_RELEASE_FILE=/etc/bigbluebutton/bigbluebutton-release

HOST=$(grep -v '#' /etc/bigbluebutton/bbb-web.properties | sed -n '/^bigbluebutton.web.serverURL/{s/.*\///;p}')

chown -R $BIGBLUEBUTTON_USER:$BIGBLUEBUTTON_USER /usr/share/bigbluebutton/html5-client/

if [ ! -L /etc/nginx/sites-enabled/bigbluebutton ]; then
  mkdir -p /etc/nginx/sites-enabled
  ln -s /etc/nginx/sites-available/bigbluebutton /etc/nginx/sites-enabled/bigbluebutton
fi


WSURL=$(grep -v '#' /etc/bigbluebutton/bbb-web.properties | sed -n '/^bigbluebutton.web.serverURL/{s/.*=//;p}' | sed 's/https/wss/g' | sed s'/http/ws/g')

yq e -i ".public.kurento.wsUrl = \"$WSURL/bbb-webrtc-sfu\"" $BBB_HTML5_SETTINGS_FILE

yq e -i  ".public.pads.url = \"$PROTOCOL://$HOST/pad\"" $BBB_HTML5_SETTINGS_FILE

sed -i "s/proxy_pass .*/proxy_pass http:\/\/$IP:5066;/g" /usr/share/bigbluebutton/nginx/sip.nginx
sed -i "s/server_name  .*/server_name  $IP;/g" /etc/nginx/sites-available/bigbluebutton

# set full BBB version in settings.yml so it can be displayed in the client
if [ -f $BBB_RELEASE_FILE ] && [ -f $BBB_HTML5_SETTINGS_FILE ]; then
  BBB_FULL_VERSION=$(cat $BBB_RELEASE_FILE | sed -n '/^BIGBLUEBUTTON_RELEASE/{s/.*=//;p}' | tail -n 1)
  echo "setting public.app.bbbServerVersion: $BBB_FULL_VERSION in $BBB_HTML5_SETTINGS_FILE "
  yq e -i ".public.app.bbbServerVersion = \"$BBB_FULL_VERSION\"" $BBB_HTML5_SETTINGS_FILE
fi

# Remove old overrides 
if [ -f /etc/systemd/system/mongod.service.d/override-mongo.conf ] \
  || [ -f /etc/systemd/system/mongod.service.d/override.conf ] \
  || [ -f /usr/lib/systemd/system/mongod.service.d/mongod-service-override.conf ] ; then
  rm -f /etc/systemd/system/mongod.service.d/override-mongo.conf
  rm -f /etc/systemd/system/mongod.service.d/override.conf
  rm -f /usr/lib/systemd/system/mongod.service.d/mongod-service-override.conf 
  systemctl daemon-reload
fi

chown root:root /usr/lib/systemd/system

chmod go+r $BBB_HTML5_SETTINGS_FILE

# Incompressible payload for the same-origin speed test (created once).
SPEEDTEST_DIR=/var/bigbluebutton/speedtest
SPEEDTEST_PAYLOAD=$SPEEDTEST_DIR/payload.bin
SPEEDTEST_BYTES=16777216
mkdir -p "$SPEEDTEST_DIR"
CURRENT_SIZE=$(stat -c%s "$SPEEDTEST_PAYLOAD" 2>/dev/null || echo 0)
if [ ! -f "$SPEEDTEST_PAYLOAD" ] || [ "$CURRENT_SIZE" -lt "$SPEEDTEST_BYTES" ]; then
  dd if=/dev/urandom of="$SPEEDTEST_PAYLOAD" bs=1M count=16 status=none 2>/dev/null \
    || dd if=/dev/urandom of="$SPEEDTEST_PAYLOAD" bs=1M count=16
  chmod 644 "$SPEEDTEST_PAYLOAD"
fi

if [ -f /usr/share/bigbluebutton/speedtest-discard.py ]; then
  chmod 755 /usr/share/bigbluebutton/speedtest-discard.py
fi
if [ -f /usr/lib/systemd/system/bbb-speedtest-discard.service ]; then
  systemctl daemon-reload
  systemctl enable --now bbb-speedtest-discard.service || true
fi

#
# Restart nginx to take advantage of the updates to nginx configuration
#
reloadService nginx
