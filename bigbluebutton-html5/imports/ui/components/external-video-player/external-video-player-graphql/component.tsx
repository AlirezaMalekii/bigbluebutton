/* eslint-disable no-param-reassign */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import ReactPlayer from 'react-player';
import { defineMessages, useIntl } from 'react-intl';
import audioManager from '/imports/ui/services/audio-manager';
import { useReactiveVar, useMutation } from '@apollo/client';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { ExternalVideoVolumeCommandsEnum } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-commands/external-video/volume/enums';
import { SetExternalVideoVolumeCommandArguments } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-commands/external-video/volume/types';
import { OnProgressProps } from 'react-player/base';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import { UI_DATA_LISTENER_SUBSCRIBED } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data/hooks/consts';
import { ExternalVideoVolumeUiDataNames } from 'bigbluebutton-html-plugin-sdk';
import { ExternalVideoVolumeUiDataPayloads } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data/domain/external-video/volume/types';

import useMeeting from '/imports/ui/core/hooks/useMeeting';
import logger from '/imports/startup/client/logger';
import {
  getPresentationMediaKindFromUrl,
  getPresentationMediaDisplayName,
  getAuthenticatedPresentationMediaDownloadUrlFromPlaybackUrl,
  isPresentationMediaUrl,
} from '../../presentation/presentation-uploader/fileTypes';
import Auth from '/imports/ui/services/auth';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { CURRENT_PRESENTATION_PAGE_SUBSCRIPTION, CurrentPresentationPagesSubscriptionResponse } from '../../whiteboard/queries';
import DownloadPresentationButton from '../../presentation/download-presentation-button/component';
import PresentationMediaAudioPlayer from '../presentation-media-audio-player/component';
import PresenterSyncToolbar from '../presenter-sync-toolbar/component';
import {
  layoutDispatch,
  layoutSelect,
  layoutSelectInput,
  layoutSelectOutput,
} from '../../layout/context';
import Styled from './styles';
import {
  ExternalVideo,
  Input,
  Layout,
  Output,
} from '../../layout/layoutTypes';
import { uniqueId } from '/imports/utils/string-utils';
import useTimeSync from '/imports/ui/core/local-states/useTimeSync';
import ExternalVideoPlayerToolbar from './toolbar/component';
import deviceInfo from '/imports/utils/deviceInfo';
import { ACTIONS, PRESENTATION_AREA } from '../../layout/enums';
import { EXTERNAL_VIDEO_UPDATE, EXTERNAL_VIDEO_STOP } from '../mutations';
import { calculateCurrentTime } from '/imports/ui/components/external-video-player/service';
import { isAparatVideoUrl } from '/imports/ui/components/external-video-player/external-video-utils';

import PeerTube from '../custom-players/peertube';
import { ArcPlayer } from '../custom-players/arc-player';
import { AparatPlayer } from '../custom-players/aparat';
import getStorageSingletonInstance from '/imports/ui/services/storage';
import Session from '/imports/ui/services/storage/in-memory';

const AUTO_PLAY_BLOCK_DETECTION_TIMEOUT_SECONDS = 5;
const TWITCH_VIDEO_SEEK_TIME_WINDOW = 1; // Twitch video seek time in seconds

const intlMessages = defineMessages({
  autoPlayWarning: {
    id: 'app.externalVideo.autoPlayWarning',
    description: 'Shown when user needs to interact with player to make it work',
  },
  refreshLabel: {
    id: 'app.externalVideo.refreshLabel',
  },
  fullscreenLabel: {
    id: 'app.externalVideo.fullscreenLabel',
  },
  subtitlesOn: {
    id: 'app.externalVideo.subtitlesOn',
  },
  subtitlesOff: {
    id: 'app.externalVideo.subtitlesOff',
  },
  closeExternalVideoLabel: {
    id: 'app.externalVideo.stopShareExternalVideo',
  },
  closeExternalAudioLabel: {
    id: 'app.externalVideo.stopShareExternalAudio',
  },
});

interface ExternalVideoPlayerProps {
  currentVolume: React.MutableRefObject<number>;
  isMuted: React.MutableRefObject<boolean>;
  isEchoTest: boolean;
  isGridLayout: boolean;
  isPresenter: boolean;
  isModerator: boolean;
  videoUrl: string;
  isResizing: boolean;
  fullscreenContext: boolean;
  externalVideo: ExternalVideo;
  playing: boolean;
  playerPlaybackRate: number;
  playerKey: string;
  isSidebarContentOpen: boolean;
  setPlayerKey: (key: string) => void;
  sendMessage: (event: string, data: {
    rate: number | Promise<number>;
    time: number;
    state?: string;
  }) => void;
  getServerCurrentTime(): number;
  updatedAt: string;
  isPresentationMedia?: boolean;
  presentationMediaKind?: 'audio' | 'video' | null;
  presentationMediaDownloadUri?: string;
}

// @ts-ignore - PeerTubePlayer is not typed
Styled.VideoPlayer.addCustomPlayer(PeerTube);
// @ts-ignore - ArcPlayer is not typed
Styled.VideoPlayer.addCustomPlayer(ArcPlayer);
// @ts-ignore - AparatPlayer is not typed
Styled.VideoPlayer.addCustomPlayer(AparatPlayer);

const truncateTime = (time: number) => (time < 1 ? 0 : time);

const ExternalVideoPlayer: React.FC<ExternalVideoPlayerProps> = ({
  isGridLayout,
  isSidebarContentOpen,
  currentVolume,
  isMuted,
  isResizing,
  externalVideo,
  fullscreenContext,
  videoUrl,
  isPresenter,
  isModerator,
  playing,
  playerPlaybackRate,
  isEchoTest,
  playerKey,
  setPlayerKey,
  sendMessage,
  getServerCurrentTime,
  updatedAt,
  isPresentationMedia = false,
  presentationMediaKind = null,
  presentationMediaDownloadUri,
}) => {
  const intl = useIntl();
  const storage = getStorageSingletonInstance();
  const {
    height,
    width,
    top,
    left,
    right,
  } = externalVideo;

  const hideVolume = useMemo(() => ({
    Vimeo: true,
    Facebook: true,
    ArcPlayer: true,
    AparatPlayer: true,
    // YouTube: true,
  }), []);

  const videoPlayConfig = useMemo(() => {
    const isPresentationMediaFile = isPresentationMediaUrl(videoUrl);
    const mediaKind = isPresentationMediaFile
      ? getPresentationMediaKindFromUrl(videoUrl)
      : null;
    const isPresentationAudioFile = mediaKind === 'audio';

    // Presenter uses SafeMeet sync toolbar; viewers must not get native controls.
    const nativeControls = false;

    return {
      // default option for all players, can be overwritten
      playerOptions: {
        autoPlay: !isPresentationMediaFile,
        playsInline: true,
        controls: nativeControls,
      },
      file: {
        // Authenticated BBB media URLs keep the extension in query params, so
        // react-player cannot detect audio/video from the path — force the element type.
        forceVideo: mediaKind === 'video',
        forceAudio: mediaKind === 'audio',
        attributes: {
          // Custom SafeMeet UI drives playback sync; native controls are disabled.
          controls: nativeControls,
          autoPlay: !isPresentationMediaFile,
          playsInline: true,
          preload: isPresentationAudioFile ? 'metadata' : 'auto',
        },
      },
      facebook: {
        controls: nativeControls,
      },
      dailymotion: {
        params: {
          controls: nativeControls,
        },
      },
      youtube: {
        playerVars: {
          autoplay: 1,
          rel: 0,
          controls: 0,
          disablekb: 1,
          cc_lang_pref: document.getElementsByTagName('html')[0].lang.substring(0, 2),
        },
        embedOptions: {
          host: 'https://www.youtube-nocookie.com',
        },
      },
      peertube: {
        isPresenter: false,
      },
      aparat: {
        // Aparat has no sync API — native iframe controls own playback for everyone.
        playing,
      },
      twitch: {
        options: {
          controls: nativeControls,
        },
        playerId: 'externalVideoPlayerTwitch',
      },
      preload: true,
      showHoverToolBar: false,
    };
  }, [videoUrl, playing]);

  const [showUnsynchedMsg, setShowUnsynchedMsg] = React.useState(false);
  const [showHoverToolBar, setShowHoverToolBar] = React.useState(false);
  const [mute, setMute] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [subtitlesOn, setSubtitlesOn] = React.useState(false);
  const [played, setPlayed] = React.useState(0);
  const [loaded, setLoaded] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const playerRef = useRef<ReactPlayer>();
  const playerParentRef = useRef<HTMLDivElement| null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const presenterRef = useRef(isPresenter);
  const [reactPlayerPlaying, setReactPlayerPlaying] = React.useState(false);
  const firstPlayRef = useRef(true);
  const [playerUrl, setPlayerUrl] = React.useState('');
  const lastCursorRef = useRef<{ position: number, updateAt: number }>({ position: 0, updateAt: 0 });
  const [stopExternalVideoShare] = useMutation(EXTERNAL_VIDEO_STOP);
  const mediaLoadFailedRef = useRef(false);
  const layoutTransitionRef = useRef(false);
  const presentationMediaAnchoredRef = useRef(false);
  const isAparatSource = isAparatVideoUrl(videoUrl);
  // Presenter or moderator may drive sync; viewers only follow.
  const canControlExternalVideo = isPresenter || isModerator;

  let currentTime = getServerCurrentTime();

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    storage.setItem('externalVideoVolume', newVolume);
    if (newVolume > 0) {
      const internalPlayer = playerRef.current?.getInternalPlayer();
      internalPlayer?.unMute?.();
    }
  };
  // Work around for Twitch, because twitch doesn't have a no cookie domain
  // causing the video star in the wrong position between sessions
  const addTimeParamToTwitchUrl = (videoUrl: string, timeInSeconds: number) => {
    const convertSecondsToHHMMSS = (seconds: number) => {
      const totalSeconds = Math.floor(seconds);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(secs).padStart(2, '0');

      return `${hh}h${mm}m${ss}s`;
    };

    try {
      const url = new URL(videoUrl);
      const isTwitch = url.hostname === 'twitch.tv' || url.hostname === 'www.twitch.tv';
      if (isTwitch) {
        const formattedTime = convertSecondsToHHMMSS(timeInSeconds);
        url.searchParams.set('t', formattedTime);
        return url.toString();
      }

      return videoUrl;
    } catch (e) {
      // if the URL is invalid, return the original videoUrl
      return videoUrl;
    }
  };

  const getInternalMediaPlayer = useCallback((player?: ReactPlayer | null) => {
    if (!player) return null;
    try {
      const internal = typeof player.getInternalPlayer === 'function'
        ? player.getInternalPlayer()
        : null;
      if (internal) return internal;
    } catch (error) {
      logger.debug({
        logCode: 'external_video_get_internal_player_failed',
        extraInfo: { error },
      }, 'Failed to read react-player internal player');
    }
    // Custom players (Aparat/PeerTube) may only be reachable via react-player internals.
    // @ts-ignore accessing lib private property
    return player?.player?.player ?? null;
  }, []);

  const stopVideo = useCallback((player?: ReactPlayer | null) => {
    const internalPlayer = getInternalMediaPlayer(player);
    if (!internalPlayer) return;

    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      internalPlayer.pause();
      return;
    }
    if (typeof internalPlayer.pauseVideo === 'function') {
      internalPlayer.pauseVideo();
      return;
    }
    if (typeof internalPlayer.pause === 'function') {
      internalPlayer.pause();
    }
  }, [getInternalMediaPlayer]);

  const playVideo = useCallback((player?: ReactPlayer | null) => {
    const internalPlayer = getInternalMediaPlayer(player);
    if (!internalPlayer) return;

    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      // HTMLMediaElement.play() returns a promise that can reject on autoplay policy.
      Promise.resolve(internalPlayer.play?.()).catch(() => {});
      return;
    }
    if (typeof internalPlayer.playVideo === 'function') {
      internalPlayer.playVideo();
      return;
    }
    if (typeof internalPlayer.play === 'function') {
      internalPlayer.play();
    }
  }, [getInternalMediaPlayer]);

  const getPlayerCurrentTime = useCallback(async (player?: ReactPlayer | null) => {
    const internalPlayer = getInternalMediaPlayer(player);
    if (!internalPlayer) return 0;

    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      return internalPlayer.currentTime;
    }

    // Vimeo player returns a promise for getCurrentTime
    try {
      return (await internalPlayer?.getCurrentTime?.()) ?? 0;
    } catch (e) {
      return 0;
    }
  }, [getInternalMediaPlayer]);

  const getPlaybackRate = useCallback((player?: ReactPlayer | null) => {
    const internalPlayer = getInternalMediaPlayer(player);
    if (!internalPlayer) return 1;

    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      return internalPlayer.playbackRate;
    }

    return internalPlayer?.getPlaybackRate?.() ?? 1;
  }, [getInternalMediaPlayer]);

  const getVolume = useCallback((player?: ReactPlayer | null) => {
    const internalPlayer = getInternalMediaPlayer(player);
    if (!internalPlayer) return 1;

    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      return internalPlayer.volume;
    }

    if (typeof internalPlayer?.getVolume === 'function') {
      return internalPlayer.getVolume();
    }
    return 1;
  }, [getInternalMediaPlayer]);

  useEffect(() => {
    if (playerUrl !== videoUrl && isPresenter) {
      setPlayerUrl(addTimeParamToTwitchUrl(videoUrl, getServerCurrentTime()));
    } else {
      setPlayerUrl(videoUrl);
    }
  }, [videoUrl, isPresenter]);

  useEffect(() => {
    const storedVolume = storage.getItem('externalVideoVolume');
    if (storedVolume) {
      const volumeValue = parseFloat(storedVolume as string);
      setVolume(volumeValue > 1 ? volumeValue / 100 : volumeValue);
    }
  }, []);

  useEffect(() => {
    const unsynchedPlayer = !isAparatSource && reactPlayerPlaying !== playing;
    if (unsynchedPlayer && !!videoUrl) {
      timeoutRef.current = setTimeout(() => {
        setShowUnsynchedMsg(true);
      }, AUTO_PLAY_BLOCK_DETECTION_TIMEOUT_SECONDS * 1000);
    } else {
      setShowUnsynchedMsg(false);
      clearTimeout(timeoutRef.current);
    }
  }, [reactPlayerPlaying, playing]);

  useEffect(() => {
    const handleExternalVideoVolumeSet = ((
      event: CustomEvent<SetExternalVideoVolumeCommandArguments>,
    ) => changeVolume(event.detail.volume)) as EventListener;
    window.addEventListener(ExternalVideoVolumeCommandsEnum.SET, handleExternalVideoVolumeSet);
    return () => {
      window.addEventListener(ExternalVideoVolumeCommandsEnum.SET, handleExternalVideoVolumeSet);
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current || isPresenter) return;
    // Avoid seek storms on presentation media — small drifts are normal while buffering.
    if (isPresentationMedia) {
      const target = truncateTime(currentTime);
      getPlayerCurrentTime(playerRef.current as ReactPlayer).then((localTime) => {
        if (Math.abs(target - localTime) > 1.25) {
          playerRef.current?.seekTo(target, 'seconds');
        }
      });
      return;
    }
    playerRef.current.seekTo(truncateTime(currentTime), 'seconds');
  }, [playerRef.current, updatedAt]);

  // --- Plugin related code ---;
  const internalPlayer = playerRef.current?.getInternalPlayer ? playerRef.current?.getInternalPlayer() : null;
  if (internalPlayer && internalPlayer?.isMuted
    && typeof internalPlayer?.isMuted === 'function'
    && internalPlayer?.isMuted() !== isMuted.current) {
    isMuted.current = internalPlayer?.isMuted();
    window.dispatchEvent(new CustomEvent(ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED, {
      detail: {
        value: internalPlayer?.isMuted(),
      } as ExternalVideoVolumeUiDataPayloads[ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED],
    }));
  }
  if (internalPlayer && internalPlayer?.getVolume
    && typeof internalPlayer?.getVolume === 'function'
    && internalPlayer?.getVolume() !== currentVolume.current) {
    currentVolume.current = internalPlayer?.getVolume();
    window.dispatchEvent(new CustomEvent(ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE, {
      detail: {
        value: internalPlayer?.getVolume() / 100,
      } as ExternalVideoVolumeUiDataPayloads[ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE],
    }));
  }
  // --- End of plugin related code ---

  useEffect(() => {
    if (isPresenter !== presenterRef.current) {
      const internalPlayer = playerRef.current?.getInternalPlayer ? playerRef.current?.getInternalPlayer() : null;
      if (internalPlayer && internalPlayer?.isMuted
        && typeof internalPlayer?.isMuted === 'function') {
        const isMuted = internalPlayer?.isMuted();
        setMute(isMuted);
      }

      if (internalPlayer && internalPlayer?.getVolume
        && typeof internalPlayer?.getVolume === 'function'
        && internalPlayer?.getVolume() !== currentVolume.current) {
        const playerVolume = internalPlayer?.getVolume();
        // the scale given by the player is 0 to 100, but the accepted scale is 0 to 1
        // So we need to divide by 100
        setVolume(playerVolume > 1 ? playerVolume / 100 : playerVolume);
      }

      presenterRef.current = isPresenter;
    }
  }, [isPresenter]);

  const isPresentationAudio = isPresentationMedia && presentationMediaKind === 'audio';
  const presentationMediaTitle = isPresentationMedia
    ? getPresentationMediaDisplayName(videoUrl)
    : '';

  useEffect(() => {
    mediaLoadFailedRef.current = false;
    presentationMediaAnchoredRef.current = false;
    setDuration(0);
    setPlayed(0);
    setLoaded(0);
  }, [videoUrl, playerKey]);

  const shouldPublishSync = (event: string) => {
    if (!canControlExternalVideo) return false;
    if (layoutTransitionRef.current) return false;
    if (isAparatSource) {
      // Raw Aparat iframe has no API — sync only works after server resolves to MP4.
      return false;
    }
    return Boolean(event);
  };

  const publishPresenterPlayback = async (
    nextPlaying: boolean,
    seekSeconds?: number,
  ) => {
    if (!canControlExternalVideo) return;
    if (isAparatSource && !shouldPublishSync(nextPlaying ? 'play' : 'stop')) return;
    let time = 0;
    if (!isAparatSource) {
      time = Number.isFinite(seekSeconds)
        ? Number(seekSeconds)
        : await getPlayerCurrentTime(playerRef.current as ReactPlayer);
    }
    const rate = isAparatSource
      ? 1
      : await getPlaybackRate(playerRef.current as ReactPlayer);
    sendMessage(nextPlaying ? 'play' : 'stop', {
      rate: rate || 1,
      time: time || 0,
      state: nextPlaying ? 'playing' : '',
    });
  };

  const publishPresenterSeek = async (fraction: number) => {
    if (!canControlExternalVideo || !playerRef.current || isAparatSource) return;
    const safeFraction = Math.min(1, Math.max(0, fraction));
    const mediaDuration = duration > 0
      ? duration
      : playerRef.current.getDuration?.() || 0;
    const time = mediaDuration > 0 ? safeFraction * mediaDuration : 0;
    playerRef.current.seekTo(safeFraction, 'fraction');
    setPlayed(safeFraction);
    const rate = await getPlaybackRate(playerRef.current as ReactPlayer);
    sendMessage('seek', {
      rate: rate || 1,
      time,
      state: playing ? 'playing' : '',
    });
  };

  const publishPresenterSkipSeconds = async (deltaSeconds: number) => {
    if (!canControlExternalVideo || !playerRef.current || isAparatSource) return;
    const mediaDuration = duration > 0
      ? duration
      : playerRef.current.getDuration?.() || 0;
    if (!(mediaDuration > 0)) return;
    const current = await getPlayerCurrentTime(playerRef.current as ReactPlayer);
    const nextTime = Math.min(mediaDuration, Math.max(0, current + deltaSeconds));
    await publishPresenterSeek(nextTime / mediaDuration);
  };

  const publishPresenterPlaybackRate = async (rate: number) => {
    if (!canControlExternalVideo || !playerRef.current || isAparatSource) return;
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    const internalPlayer = getInternalMediaPlayer(playerRef.current as ReactPlayer);
    if (internalPlayer instanceof HTMLVideoElement
      || internalPlayer instanceof HTMLAudioElement) {
      internalPlayer.playbackRate = safeRate;
    } else if (typeof internalPlayer?.setPlaybackRate === 'function') {
      internalPlayer.setPlaybackRate(safeRate);
    }
    const time = await getPlayerCurrentTime(playerRef.current as ReactPlayer);
    sendMessage('playbackRateChange', {
      rate: safeRate,
      time: time || 0,
      state: playing ? 'playing' : '',
    });
  };

  const handleOnReady = () => {
    if (mediaLoadFailedRef.current || !playerRef.current) return;
    if (isAparatSource) {
      // Playback starts only via Aparat's native play button inside the iframe.
      return;
    }
    // Presentation media: ReactPlayer `playing` already drives playback. Extra play()
    // calls after auto-share (playerPlaying=true from insert) glitch AAC/MP3 and can
    // sound like overlapping tracks. Only re-anchor the share clock once media is ready.
    if (isPresentationMedia) {
      if (
        canControlExternalVideo
        && playing
        && !presentationMediaAnchoredRef.current
        && shouldPublishSync('play')
      ) {
        presentationMediaAnchoredRef.current = true;
        getPlayerCurrentTime(playerRef.current as ReactPlayer).then((time) => {
          const serverTime = getServerCurrentTime();
          const playerTime = Number.isFinite(time) ? time : 0;
          // After buffering, the element can still report t≈0 while the share
          // clock has already advanced. Publishing that zero restarts recordings.
          const anchoredTime = (playerTime < 0.5 && serverTime > 1)
            ? serverTime
            : Math.max(playerTime, 0);
          if (Math.abs(anchoredTime - playerTime) > 1) {
            playerRef.current?.seekTo(truncateTime(anchoredTime), 'seconds');
          }
          sendMessage('play', {
            rate: playerPlaybackRate || 1,
            time: anchoredTime,
            state: 'playing',
          });
        });
      }
      return;
    }
    if (!canControlExternalVideo || !playing) return;
    playVideo(playerRef.current);
  };

  const handleOnError = (error: unknown) => {
    mediaLoadFailedRef.current = true;
    logger.warn({
      logCode: 'external_video_player_error',
      extraInfo: { videoUrl, error },
    }, 'External video player failed to load media');
    if (isPresenter && isPresentationMediaUrl(videoUrl)) {
      stopExternalVideoShare();
    }
  };

  const handleOnStart = async () => {
    const internalPlayer = playerRef.current?.getInternalPlayer();
    const currentTime = getServerCurrentTime();
    const playerCurrentTime = await getPlayerCurrentTime(playerRef.current as ReactPlayer);
    if (canControlExternalVideo && !playing && shouldPublishSync('start')) {
      const rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : await internalPlayer?.getPlaybackRate?.() ?? 1;

      sendMessage('start', {
        rate,
        time: currentTime,
        state: 'playing',
      });
    }

    // Local file audio/video: wall-clock already advances while the file buffers.
    // Seeking on start overlaps buffers and sounds like doubled/garbled audio.
    if (isPresentationMedia) {
      const drift = Math.abs(currentTime - playerCurrentTime);
      if (!canControlExternalVideo && drift > 1.25) {
        playerRef?.current?.seekTo(truncateTime(currentTime), 'seconds');
      }
      return;
    }

    if (currentTime > playerCurrentTime) {
      playerRef?.current?.seekTo(currentTime, 'seconds');
    }
  };

  const handleOnPlay = async () => {
    setReactPlayerPlaying(true);
    const internalPlayer = playerRef.current?.getInternalPlayer();
    let isTwitch = false;
    try {
      const url = new URL(videoUrl);
      isTwitch = url.hostname === 'twitch.tv' || url.hostname === 'www.twitch.tv';
    } catch (e) {
      isTwitch = false;
    }
    if (canControlExternalVideo && !playing && shouldPublishSync('play')) {
      const rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : await internalPlayer?.getPlaybackRate?.() ?? 1;

      const currentTime = getServerCurrentTime();

      const playerCurrentTime = await getPlayerCurrentTime(playerRef.current as ReactPlayer);
      const playerSeekTime = isTwitch
        && lastCursorRef.current.updateAt
        && Date.now() - lastCursorRef.current.updateAt < TWITCH_VIDEO_SEEK_TIME_WINDOW * 1000
        ? lastCursorRef.current.position
        : playerCurrentTime;
      // Prefer the share clock when the player briefly reports t≈0 after a remount
      // or buffer stall — otherwise recordings loop back to the start.
      const playTime = (currentTime > playerSeekTime + 0.75)
        ? currentTime
        : playerSeekTime;
      sendMessage('play', {
        rate,
        time: playTime,
        state: 'playing',
      });
    }
    if (!playing && !canControlExternalVideo) {
      stopVideo(playerRef.current as ReactPlayer);
    }

    if (firstPlayRef.current) {
      firstPlayRef.current = false;
    }
  };

  const handleOnStop = async () => {
    setReactPlayerPlaying(false);
    if (canControlExternalVideo && playing && shouldPublishSync('stop')) {
      const internalPlayer = playerRef.current?.getInternalPlayer();
      let rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : await internalPlayer?.getPlaybackRate?.() ?? 1;

      if (rate instanceof Promise) {
        rate = await rate;
      }

      const currentTime = await getPlayerCurrentTime(playerRef.current as ReactPlayer);
      sendMessage('stop', {
        rate,
        time: currentTime,
      });
    }

    if (!canControlExternalVideo && playing) {
      playVideo(playerRef.current as ReactPlayer);
    }
  };

  const handleProgress = async (state: OnProgressProps) => {
    setPlayed(state.played);
    setLoaded(state.loaded);
    if (playing && canControlExternalVideo && shouldPublishSync('seek')) {
      currentTime = getServerCurrentTime();
    }
    const interPlayerPlaybackRate = await getPlaybackRate(playerRef.current as ReactPlayer);
    if (canControlExternalVideo && interPlayerPlaybackRate !== playerPlaybackRate && shouldPublishSync('seek')) {
      sendMessage('seek', {
        rate: interPlayerPlaybackRate,
        time: currentTime,
        state: playing ? 'playing' : '',
      });
    }

    const storedVolume = storage.getItem('externalVideoVolume');
    const playerVolume = getVolume(playerRef.current as ReactPlayer);
    // The value used to restore the volume is get from the browser storage
    // So update the state isn't necessary as it's not saved on component unmount
    if (storedVolume !== playerVolume) {
      storage.setItem('externalVideoVolume', playerVolume);
    }
  };

  const handleOnSeek = async (cursor: { position: number } | number) => {
    if (canControlExternalVideo && shouldPublishSync('seek')) {
      const internalPlayer = playerRef.current?.getInternalPlayer();
      let rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : await internalPlayer?.getPlaybackRate?.() ?? 1;
      if (rate instanceof Promise) {
        rate = await rate;
      }

      sendMessage('seek', {
        rate,
        time: typeof cursor === 'number' ? cursor : cursor.position,
        state: playing ? 'playing' : '',
      });

      lastCursorRef.current = {
        position: typeof cursor === 'number' ? cursor : cursor.position,
        updateAt: Date.now(),
      };
    } else {
      playVideo(playerRef.current as ReactPlayer);
    }
  };

  const handlePlaybackRateChange = async () => {
    if (canControlExternalVideo && shouldPublishSync('playbackRateChange')) {
      const internalPlayer = playerRef.current?.getInternalPlayer();
      let rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : internalPlayer?.getPlaybackRate?.() ?? 1;
      if (rate instanceof Promise) {
        rate = await rate;
      }
      sendMessage('playbackRateChange', {
        rate,
        time: getServerCurrentTime(),
        state: playing ? 'playing' : '',
      });
    }
  };

  const isMinimized = width === 0 && height === 0;

  useEffect(() => {
    if (!playerRef.current) return undefined;
    layoutTransitionRef.current = true;
    const clearLayoutTransition = window.setTimeout(() => {
      layoutTransitionRef.current = false;
    }, 600);

    if (isAparatSource) {
      // Aparat iframe owns its own playback; do not drive play/stop from meeting sync.
      return () => {
        window.clearTimeout(clearLayoutTransition);
      };
    }

    if (isMinimized) {
      stopVideo(playerRef.current);
    } else if (playing) {
      // Presentation media: let ReactPlayer `playing` prop own playback to avoid double start.
      if (!isPresentationMedia) {
        playVideo(playerRef.current);
      }
    }

    return () => {
      window.clearTimeout(clearLayoutTransition);
    };
  }, [isMinimized, playing, stopVideo, playVideo, isAparatSource, isPresentationMedia]);

  // @ts-ignore accessing lib private property
  const playerName = playerRef.current && playerRef.current.player
    // @ts-ignore accessing lib private property
    && playerRef.current.player.player && playerRef.current.player.player.constructor.name as string;
  let toolbarStyle = 'hoverToolbar';

  if (deviceInfo.isMobile && !showHoverToolBar) {
    toolbarStyle = 'dontShowMobileHoverToolbar';
  }

  if (deviceInfo.isMobile && showHoverToolBar) {
    toolbarStyle = 'showMobileHoverToolbar';
  }

  // Viewer-only chrome (volume/fullscreen). Controllers use PresenterSyncToolbar.
  const shouldShowViewerTools = !canControlExternalVideo
    && !!videoUrl
    && !isPresentationAudio
    && !isAparatSource
    && !(isGridLayout && !isSidebarContentOpen);

  const handlePresenterPlayPause = async () => {
    if (!canControlExternalVideo || !playerRef.current) return;
    const nextPlaying = !(playing || reactPlayerPlaying);
    const time = isAparatSource
      ? 0
      : await getPlayerCurrentTime(playerRef.current as ReactPlayer);
    await publishPresenterPlayback(nextPlaying, time);
    if (nextPlaying) {
      playVideo(playerRef.current);
    } else {
      stopVideo(playerRef.current);
    }
  };

  const handlePresentationMediaPlayPause = () => {
    handlePresenterPlayPause();
  };

  const handlePresentationMediaSeek = (fraction: number) => {
    publishPresenterSeek(fraction);
  };

  const handlePresenterSkipSeconds = (deltaSeconds: number) => {
    publishPresenterSkipSeconds(deltaSeconds);
  };

  const handlePresenterPlaybackRate = (rate: number) => {
    publishPresenterPlaybackRate(rate);
  };

  const handlePresentationMediaDownload = () => {
    if (!presentationMediaDownloadUri) return;
    window.open(presentationMediaDownloadUri);
  };

  // Controllers (presenter/moderator) get the sync dock for shared media.
  const showPresenterDock = canControlExternalVideo
    && !isPresentationAudio
    && !!playerUrl;

  return (
    <Styled.Container
      data-skyroom-stage-media="true"
      data-aparat-player={isAparatSource ? 'true' : undefined}
      data-presentation-media={isPresentationMedia ? presentationMediaKind || 'video' : undefined}
      style={{
        height,
        width,
        top,
        left,
        right,
        zIndex: externalVideo.zIndex,
      }}
      isResizing={isResizing}
      isMinimized={isMinimized}
    >
      <Styled.VideoPlayerWrapper
        fullscreen={fullscreenContext}
        $dockedToolbar={showPresenterDock}
        ref={playerParentRef}
        data-test="videoPlayer"
      >
        <Styled.VideoStage>
          {
            showUnsynchedMsg && shouldShowViewerTools
              ? (
                <Styled.AutoPlayWarning>
                  {intl.formatMessage(intlMessages.autoPlayWarning)}
                </Styled.AutoPlayWarning>
              )
              : ''
          }

          {
            playerUrl ? (
              <Styled.VideoPlayer
                className={isPresentationAudio ? 'presentation-media-audio-hidden' : undefined}
                config={videoPlayConfig}
                autoPlay={!isPresentationMedia}
                url={playerUrl}
                playing={playing}
                playbackRate={playerPlaybackRate}
                key={playerKey}
                height="100%"
                width="100%"
                ref={playerRef}
                volume={volume}
                onReady={handleOnReady}
                onError={handleOnError}
                onStart={handleOnStart}
                onPlay={handleOnPlay}
                onSeek={handleOnSeek}
                onProgress={handleProgress}
                onPause={handleOnStop}
                onEnded={handleOnStop}
                onDuration={(mediaDuration: number) => setDuration(mediaDuration)}
                muted={mute || isEchoTest}
                controls={false}
                previewTabIndex={canControlExternalVideo ? 0 : -1}
                onPlaybackRateChange={handlePlaybackRateChange}
              />
            ) : null
          }
          {
            isPresentationAudio ? (
              <PresentationMediaAudioPlayer
                title={presentationMediaTitle}
                playing={playing || reactPlayerPlaying}
                played={played}
                loaded={loaded}
                duration={duration}
                volume={volume}
                muted={mute || isEchoTest}
                controlsEnabled={canControlExternalVideo}
                onPlayPause={handlePresentationMediaPlayPause}
                onSeek={handlePresentationMediaSeek}
                onVolumeChange={changeVolume}
                onMuteToggle={setMute}
              />
            ) : null
          }
          {
            presentationMediaDownloadUri ? (
              <DownloadPresentationButton
                handleDownloadPresentation={handlePresentationMediaDownload}
                dark
              />
            ) : null
          }
          {
            // Block non-controller clicks so only presenter/moderator drive sync.
            !canControlExternalVideo && !isPresentationAudio ? (
              <Styled.AparatViewerBlocker
                data-test="externalVideoViewerBlocker"
                aria-hidden="true"
              />
            ) : null
          }
          {
            shouldShowViewerTools ? (
              <ExternalVideoPlayerToolbar
                handleOnMuted={(m: boolean) => setMute(m)}
                handleReload={() => setPlayerKey(uniqueId('react-player'))}
                setShowHoverToolBar={setShowHoverToolBar}
                toolbarStyle={toolbarStyle}
                handleVolumeChanged={changeVolume}
                volume={volume}
                muted={mute || isEchoTest}
                mutedByEchoTest={isEchoTest}
                playing={playing}
                playerName={playerName}
                toggleSubtitle={() => setSubtitlesOn(!subtitlesOn)}
                playerParent={playerParentRef.current}
                played={played}
                loaded={loaded}
                subtitlesOn={subtitlesOn}
                hideVolume={hideVolume[playerName as keyof typeof hideVolume]}
                showUnsynchedMsg={showUnsynchedMsg}
              />
            ) : null
          }
          {
            isPresenter ? (
              <Styled.ExternalVideoCloseButton
                color="primary"
                icon="close"
                size="sm"
                onClick={stopExternalVideoShare}
                data-test="stopExternalVideoShare"
                label={intl.formatMessage(
                  isPresentationAudio
                    ? intlMessages.closeExternalAudioLabel
                    : intlMessages.closeExternalVideoLabel,
                )}
                hideLabel
                className={Styled.ExternalVideoCloseButton}
              />
            ) : null
          }
        </Styled.VideoStage>
        {
          showPresenterDock ? (
            <PresenterSyncToolbar
              playing={playing || reactPlayerPlaying}
              played={played}
              loaded={loaded}
              duration={duration}
              volume={volume}
              muted={mute || isEchoTest}
              playbackRate={playerPlaybackRate || 1}
              isFullscreen={fullscreenContext}
              fullscreenRef={playerParentRef.current}
              elementName={intl.formatMessage(intlMessages.fullscreenLabel)}
              onPlayPause={handlePresenterPlayPause}
              onSeek={handlePresentationMediaSeek}
              onSkipSeconds={handlePresenterSkipSeconds}
              onPlaybackRateChange={handlePresenterPlaybackRate}
              onVolumeChange={changeVolume}
              onMuteToggle={setMute}
            />
          ) : null
        }
      </Styled.VideoPlayerWrapper>
    </Styled.Container>
  );
};

const ExternalVideoPlayerContainer: React.FC = () => {
  /* eslint no-underscore-dangle: "off" */
  // @ts-ignore - temporary while hybrid (meteor+GraphQl)
  const isEchoTest = useReactiveVar(audioManager._isEchoTest.value) as boolean;
  const { data: currentUser } = useCurrentUser((user) => ({
    presenter: user.presenter,
    isModerator: user.isModerator,
  }));
  const { data: currentMeeting } = useMeeting((m) => ({
    externalVideo: m.externalVideo,
    layout: m.layout,
  }));
  const currentVolume = React.useRef(0);
  const isMuted = React.useRef(false);
  const hasExternalVideo = useRef(false);
  const lastMessageRef = useRef<{
    event: string;
    rate: number;
    time: number;
    state?: string;
  }>({ event: '', rate: 0, time: 0 });

  const [updateExternalVideo] = useMutation(EXTERNAL_VIDEO_UPDATE);

  const sendMessage = async (event: string, data: { rate: number | Promise<number>; time: number; state?: string }) => {
    const resolvedRate = data.rate instanceof Promise ? await data.rate : data.rate;

    // don't register to redis a viewer joined message
    if (event === 'viewerJoined') {
      return;
    }

    lastMessageRef.current = { ...data, event, rate: resolvedRate };

    // Use an integer for playing state
    // 0: stopped 1: playing
    // We might use more states in the future
    const state = data.state ? 1 : 0;

    updateExternalVideo({
      variables: {
        status: event,
        rate: resolvedRate,
        time: data.time,
        state,
      },
    });
  };

  useEffect(() => {
    // clear lastMessageRef when video is changed
    if (lastMessageRef?.current?.event) {
      lastMessageRef.current.event = '';
      lastMessageRef.current.rate = 0;
      lastMessageRef.current.time = 0;
      lastMessageRef.current.state = undefined;
    }
  }, [currentMeeting?.externalVideo?.externalVideoUrl]);

  // --- Plugin related code ---
  useEffect(() => {
    // Define functions to first inform ui data hooks that subscribe to these events
    const updateUiDataHookCurrentVolumeForPlugin = () => {
      window.dispatchEvent(new CustomEvent(PluginSdk.ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE, {
        detail: {
          value: currentVolume.current,
        } as ExternalVideoVolumeUiDataPayloads[PluginSdk.ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE],
      }));
    };
    const updateUiDataHookIsMutedPlugin = () => {
      window.dispatchEvent(new CustomEvent(PluginSdk.ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED, {
        detail: {
          value: isMuted.current,
        } as ExternalVideoVolumeUiDataPayloads[PluginSdk.ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED],
      }));
    };

    // When component mount, add event listener to send first information
    // about these ui data hooks to plugin
    window.addEventListener(
      `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE}`,
      updateUiDataHookCurrentVolumeForPlugin,
    );
    window.addEventListener(
      `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED}`,
      updateUiDataHookIsMutedPlugin,
    );
    // Before component unmount, remove event listeners for plugin ui data hooks
    return () => {
      window.removeEventListener(
        `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ExternalVideoVolumeUiDataNames.CURRENT_VOLUME_VALUE}`,
        updateUiDataHookCurrentVolumeForPlugin,
      );
      window.removeEventListener(
        `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ExternalVideoVolumeUiDataNames.IS_VOLUME_MUTED}`,
        updateUiDataHookIsMutedPlugin,
      );
    };
  }, []);
  // --- End of plugin related code ---

  const [timeSync] = useTimeSync();

  const fullscreenElementId = 'ExternalVideo';
  const externalVideo: ExternalVideo = layoutSelectOutput((i: Output) => i.externalVideo);
  const hasExternalVideoOnLayout: boolean = layoutSelectInput((i: Input) => i.externalVideo?.hasExternalVideo);
  const cameraDock = layoutSelectInput((i: Input) => i.cameraDock);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const { isOpen: isSidebarContentOpen } = sidebarContent;
  const { isResizing } = cameraDock;
  const layoutContextDispatch = layoutDispatch();
  const fullscreen = layoutSelect((i: Layout) => i.fullscreen);
  const { element } = fullscreen;
  const fullscreenContext = (element === fullscreenElementId);
  const [key, setKey] = React.useState(uniqueId('react-player'));
  const externalVideoUrl = currentMeeting?.externalVideo?.externalVideoUrl ?? '';
  const isPresentationMedia = isPresentationMediaUrl(externalVideoUrl);
  const presentationMediaKind = isPresentationMedia
    ? getPresentationMediaKindFromUrl(externalVideoUrl)
    : null;

  // Keep layout pile + stage visibility in sync for ALL clients. After screenshare
  // ends, viewers can be left with a missing EXTERNAL_VIDEO pile entry while the
  // GraphQL URL is restored — re-push and open the stage so they do not need a
  // manual hide/show presentation toggle.
  useEffect(() => {
    const hasUrl = Boolean(externalVideoUrl);

    if (hasUrl) {
      if (!hasExternalVideoOnLayout) {
        layoutContextDispatch({
          type: ACTIONS.SET_PILE_CONTENT_FOR_PRESENTATION_AREA,
          value: {
            content: PRESENTATION_AREA.EXTERNAL_VIDEO,
            open: true,
          },
        });
        layoutContextDispatch({
          type: ACTIONS.SET_PRESENTATION_IS_OPEN,
          value: true,
        });
        Session.setItem('presentationLastState', true);
      }
      hasExternalVideo.current = true;
      return;
    }

    if (hasExternalVideo.current || hasExternalVideoOnLayout) {
      layoutContextDispatch({
        type: ACTIONS.SET_PILE_CONTENT_FOR_PRESENTATION_AREA,
        value: {
          content: PRESENTATION_AREA.EXTERNAL_VIDEO,
          open: false,
        },
      });
      hasExternalVideo.current = false;
    }
  }, [
    externalVideoUrl,
    hasExternalVideoOnLayout,
    layoutContextDispatch,
  ]);

  const { data: presentationPageData } = useDeduplicatedSubscription<CurrentPresentationPagesSubscriptionResponse>(
    CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
    { skip: !isPresentationMedia || !externalVideoUrl },
  );

  const APP_CONFIG = window.meetingClientSettings.public.app;
  const presentationMediaDownloadUri = React.useMemo(() => {
    if (!isPresentationMedia) return undefined;
    const currentPresentationPage = presentationPageData?.pres_page_curr?.[0];
    if (!currentPresentationPage?.downloadable) return undefined;
    if (currentPresentationPage.downloadFileUri) {
      return Auth.authenticateURL(`${APP_CONFIG.bbbWebBase}/${currentPresentationPage.downloadFileUri}`);
    }
    return getAuthenticatedPresentationMediaDownloadUrlFromPlaybackUrl(externalVideoUrl);
  }, [isPresentationMedia, presentationPageData, externalVideoUrl]);

  if (!currentUser || !currentMeeting?.externalVideo || !externalVideo?.display) return null;
  if (!hasExternalVideoOnLayout) return null;
  const isPresenter = currentUser.presenter ?? false;
  const isModerator = currentUser.isModerator ?? false;
  const isGridLayout = currentMeeting.layout?.currentLayoutType === 'VIDEO_FOCUS';
  const {
    updatedAt = new Date().toISOString(),
    playerPlaybackRate = 1,
    playerPlaying: playing = false,
    externalVideoUrl: videoUrl = '',
  } = currentMeeting.externalVideo;
  const getServerCurrentTime = () => calculateCurrentTime(timeSync, currentMeeting.externalVideo);

  return (
    <ExternalVideoPlayer
      isSidebarContentOpen={isSidebarContentOpen}
      isGridLayout={isGridLayout}
      currentVolume={currentVolume}
      isMuted={isMuted}
      isEchoTest={isEchoTest}
      isPresenter={isPresenter ?? false}
      isModerator={isModerator}
      videoUrl={videoUrl}
      playing={playing}
      playerPlaybackRate={playerPlaybackRate}
      isResizing={isResizing}
      fullscreenContext={fullscreenContext}
      externalVideo={externalVideo}
      getServerCurrentTime={getServerCurrentTime}
      playerKey={key}
      setPlayerKey={setKey}
      sendMessage={sendMessage}
      updatedAt={updatedAt}
      isPresentationMedia={isPresentationMedia}
      presentationMediaKind={presentationMediaKind}
      presentationMediaDownloadUri={presentationMediaDownloadUri}
    />
  );
};

export default ExternalVideoPlayerContainer;
