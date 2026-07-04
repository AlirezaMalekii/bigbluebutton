#!/usr/bin/env bash
cd "$(dirname "$0")"
BBB_WEB_DIR="$(pwd)"

for var in "$@"
do
    if [[ $var == --build ]] ; then
       echo "Performing a full re-build..."
       cd ~/src/bbb-common-web
       ./deploy.sh
       cd ~/src/bigbluebutton-web/
    fi
done

sudo service bbb-web stop
./build.sh

./gradlew clean assemble

mkdir -p exploded && cd exploded
jar -xvf ../build/libs/bigbluebutton-0.10.0.war

if [ ! -d /usr/share/bbb-web-old ] ; then
	sudo cp -R /usr/share/bbb-web /usr/share/bbb-web-old
	echo "A backup was saved in /usr/share/bbb-web-old"
else
	echo "A backup in /usr/share/bbb-web-old already exists. Skipping.."
fi

sudo rm -rf /usr/share/bbb-web/assets/ /usr/share/bbb-web/META-INF/ /usr/share/bbb-web/org/ /usr/share/bbb-web/WEB-INF/
sudo cp -R . /usr/share/bbb-web/

sudo chown bigbluebutton:bigbluebutton /usr/share/bbb-web
sudo chown -R bigbluebutton:bigbluebutton /usr/share/bbb-web/assets/ /usr/share/bbb-web/META-INF/ /usr/share/bbb-web/org/ /usr/share/bbb-web/WEB-INF/

if [[ -f "${BBB_WEB_DIR}/bbb-web.nginx" ]]; then
	echo 'Updating bbb-web nginx config ...'
	sudo cp "${BBB_WEB_DIR}/bbb-web.nginx" /usr/share/bigbluebutton/nginx/web
	if [[ ! -L /usr/share/bigbluebutton/nginx/web.nginx ]]; then
		sudo ln -sf /usr/share/bigbluebutton/nginx/web /usr/share/bigbluebutton/nginx/web.nginx
	fi
	sudo nginx -t
	sudo systemctl reload nginx
fi

echo ''
echo ''
echo '----------------'
echo 'bbb-web updated'

cd ..
sudo rm -r exploded
sudo service bbb-web start

echo 'starting service bbb-web'
