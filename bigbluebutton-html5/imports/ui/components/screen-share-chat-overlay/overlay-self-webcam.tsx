import React, {
  useEffect, useRef, useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import VideoService from '/imports/ui/components/video-provider/service';
import {
  OverlaySelfWebcamFrame,
  OverlaySelfWebcamVideo,
  OverlaySelfWebcamLabel,
} from './styles';

const intlMessages = defineMessages({
  label: {
    id: 'app.screenShareChatOverlay.selfWebcamLabel',
    description: 'Label for presenter self webcam in floating overlay',
  },
  unavailable: {
    id: 'app.screenShareChatOverlay.selfWebcamUnavailable',
    description: 'Shown when local webcam stream cannot be attached yet',
  },
});

const resolveLocalWebcamStream = (): MediaStream | null => {
  // Prefer an already-attached local tile in the main meeting window.
  const localVideos = Array.from(
    document.querySelectorAll('video[data-local-stream="true"]'),
  ) as HTMLVideoElement[];

  const liveTile = localVideos.find((video) => (
    video.srcObject instanceof MediaStream
    && video.srcObject.getVideoTracks().some((track) => track.readyState === 'live')
  ));
  if (liveTile?.srcObject instanceof MediaStream) {
    return liveTile.srcObject;
  }

  const peers = VideoService.getWebRtcPeersRef?.() || {};
  const peerStreams = Object.values(peers)
    .filter((peer) => peer && (peer as { isPublisher?: boolean }).isPublisher)
    .map((peer) => {
      const publisher = peer as {
        getLocalStream?: () => MediaStream | null;
      };
      return typeof publisher.getLocalStream === 'function'
        ? publisher.getLocalStream()
        : null;
    })
    .filter((stream): stream is MediaStream => (
      Boolean(stream && stream.getVideoTracks().some((track) => track.readyState === 'live'))
    ));

  if (peerStreams[0]) return peerStreams[0];

  const preloaded = VideoService.getPreloadedStream?.();
  const mediaStream = preloaded?.mediaStream;
  if (
    mediaStream instanceof MediaStream
    && mediaStream.getVideoTracks().some((track) => track.readyState === 'live')
  ) {
    return mediaStream;
  }

  return null;
};

/**
 * Small mirrored preview of the presenter's own published webcam.
 * Attaches the existing MediaStream — never stops tracks or opens a new gUM.
 */
const OverlaySelfWebcam: React.FC = () => {
  const intl = useIntl();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const mirrored = VideoService.mirrorOwnWebcam();

  useEffect(() => {
    let cancelled = false;
    const videoEl = videoRef.current;

    const attach = () => {
      if (cancelled || !videoEl) return;
      const stream = resolveLocalWebcamStream();
      if (!stream) {
        setHasStream(false);
        if (videoEl.srcObject) {
          videoEl.srcObject = null;
        }
        return;
      }

      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      setHasStream(true);

      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay can fail briefly; muted+playsInline usually recovers on next attach.
        });
      }
    };

    attach();
    const timer = window.setInterval(attach, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
      }
    };
  }, []);

  return (
    <OverlaySelfWebcamFrame data-test="screenShareChatOverlaySelfWebcam">
      <OverlaySelfWebcamVideo
        ref={videoRef}
        muted
        autoPlay
        playsInline
        $mirrored={mirrored}
        aria-label={intl.formatMessage(intlMessages.label)}
      />
      <OverlaySelfWebcamLabel>
        {hasStream
          ? intl.formatMessage(intlMessages.label)
          : intl.formatMessage(intlMessages.unavailable)}
      </OverlaySelfWebcamLabel>
    </OverlaySelfWebcamFrame>
  );
};

export default OverlaySelfWebcam;
