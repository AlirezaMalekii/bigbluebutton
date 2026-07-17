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
  aparatPlay: {
    id: 'app.presentationMedia.play',
  },
  aparatPause: {
    id: 'app.presentationMedia.pause',
  },
  aparatViewerHint: {
    id: 'app.presentationUploder.aparatSyncNote',
  },
});

interface ExternalVideoPlayerProps {
  currentVolume: React.MutableRefObject<number>;
  isMuted: React.MutableRefObject<boolean>;
  isEchoTest: boolean;
  isGridLayout: boolean;
  isPresenter: boolean;
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

    return {
      // default option for all players, can be overwritten
      playerOptions: {
        autoPlay: !isPresentationMediaFile,
        playsInline: true,
        controls: !isPresentationAudioFile,
      },
      file: {
        // Authenticated BBB media URLs keep the extension in query params, so
        // react-player cannot detect audio/video from the path — force the element type.
        forceVideo: mediaKind === 'video',
        forceAudio: mediaKind === 'audio',
        attributes: {
          // Custom SafeMeet UI drives presentation audio; native autoPlay+controls
          // on a hidden element races with ReactPlayer `playing` and can glitch AAC/MP3.
          controls: !isPresentationMediaFile,
          autoPlay: !isPresentationMediaFile,
          playsInline: true,
          preload: isPresentationAudioFile ? 'metadata' : 'auto',
        },
      },
      facebook: {
        controls: true,
      },
      dailymotion: {
        params: {
          controls: true,
        },
      },
      youtube: {
        playerVars: {
          autoplay: 1,
          rel: 0,
          controls: 1,
          cc_lang_pref: document.getElementsByTagName('html')[0].lang.substring(0, 2),
        },
        embedOptions: {
          host: 'https://www.youtube-nocookie.com',
        },
      },
      peertube: {
        isPresenter,
      },
      aparat: {
        isPresenter,
        playing,
      },
      twitch: {
        options: {
          controls: true,
        },
        playerId: 'externalVideoPlayerTwitch',
      },
      preload: true,
      showHoverToolBar: false,
    };
  }, [videoUrl, isPresenter, playing]);

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
  const aparatStartedRef = useRef(false);
  const presentationMediaAnchoredRef = useRef(false);
  const isAparatSource = isAparatVideoUrl(videoUrl);

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

  const stopVideo = useCallback((player: ReactPlayer) => {
    if (player) {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer instanceof HTMLVideoElement) {
        internalPlayer.pause();
      } else if (internalPlayer instanceof HTMLAudioElement) {
        internalPlayer.pause();
      } else if (internalPlayer.pauseVideo) {
        internalPlayer.pauseVideo();
      } else if (internalPlayer.pause) {
        internalPlayer?.pause();
      }
    }
  }, []);

  const playVideo = useCallback((player: ReactPlayer) => {
    if (player) {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer instanceof HTMLVideoElement) {
        internalPlayer.play();
      } else if (internalPlayer instanceof HTMLAudioElement) {
        internalPlayer.play();
      } else if (internalPlayer.playVideo) {
        internalPlayer.playVideo();
      } else if (internalPlayer.play) {
        internalPlayer.play();
      }
    }
  }, []);

  const getPlayerCurrentTime = useCallback(async (player: ReactPlayer) => {
    if (player) {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer instanceof HTMLVideoElement) {
        return internalPlayer.currentTime;
      }

      if (internalPlayer instanceof HTMLAudioElement) {
        return internalPlayer.currentTime;
      }

      // Vimeo player returns a promise for getCurrentTime
      try {
        return (await internalPlayer?.getCurrentTime?.()) ?? 0;
      } catch (e) {
        // If the player is not ready yet, we return 0
        return 0;
      }
    }
    return 0;
  }, []);

  const getPlaybackRate = useCallback((player: ReactPlayer) => {
    if (player) {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer instanceof HTMLVideoElement) {
        return internalPlayer.playbackRate;
      }

      if (internalPlayer instanceof HTMLAudioElement) {
        return internalPlayer.playbackRate;
      }

      return internalPlayer?.getPlaybackRate?.() ?? 1;
    }
    return 1;
  }, []);

  const getVolume = useCallback((player: ReactPlayer) => {
    if (player) {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer instanceof HTMLVideoElement) {
        return internalPlayer.volume;
      }

      if (internalPlayer instanceof HTMLAudioElement) {
        return internalPlayer.volume;
      }

      if (internalPlayer?.getVolume) {
        return internalPlayer.getVolume();
      }
    }
    return 1;
  }, []);

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
    aparatStartedRef.current = false;
    presentationMediaAnchoredRef.current = false;
    setDuration(0);
    setPlayed(0);
    setLoaded(0);
  }, [videoUrl, playerKey]);

  const shouldPublishSync = (event: string) => {
    if (!isPresenter) return false;
    if (layoutTransitionRef.current) return false;
    if (isAparatSource) {
      // Aparat has no reliable iframe events — presenter SafeMeet controls publish play/stop.
      return event === 'play' || event === 'stop' || event === 'start';
    }
    return true;
  };

  const handleOnReady = () => {
    if (mediaLoadFailedRef.current || !playerRef.current) return;
    if (isAparatSource) {
      if (playing) playVideo(playerRef.current);
      return;
    }
    // Presentation media: ReactPlayer `playing` already drives playback. Extra play()
    // calls after auto-share (playerPlaying=true from insert) glitch AAC/MP3 and can
    // sound like overlapping tracks. Only re-anchor the share clock once media is ready.
    if (isPresentationMedia) {
      if (
        isPresenter
        && playing
        && !presentationMediaAnchoredRef.current
        && shouldPublishSync('play')
      ) {
        presentationMediaAnchoredRef.current = true;
        getPlayerCurrentTime(playerRef.current as ReactPlayer).then((time) => {
          sendMessage('play', {
            rate: playerPlaybackRate || 1,
            time: Number.isFinite(time) ? time : 0,
            state: 'playing',
          });
        });
      }
      return;
    }
    if (!isPresenter || !playing) return;
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
    if (isPresenter && !playing && shouldPublishSync('start')) {
      const rate = (internalPlayer instanceof HTMLVideoElement || internalPlayer instanceof HTMLAudioElement)
        ? internalPlayer.playbackRate
        : await internalPlayer?.getPlaybackRate?.() ?? 1;

      sendMessage('start', {
        rate,
        time: currentTime,
        state: 'playing',
      });
      if (isAparatSource) {
        aparatStartedRef.current = true;
      }
    }

    // Local file audio/video: wall-clock already advances while the file buffers.
    // Seeking on start overlaps buffers and sounds like doubled/garbled audio.
    if (isPresentationMedia) {
      const drift = Math.abs(currentTime - playerCurrentTime);
      if (!isPresenter && drift > 1.25) {
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
    if (isPresenter && !playing && shouldPublishSync('play')) {
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
      sendMessage('play', {
        rate,
        // if currentTime is greater than playerCurrentTime, means the video was already played
        // and the presenter refreshed his client
        time: (currentTime > playerCurrentTime) && firstPlayRef.current ? currentTime : playerSeekTime,
        state: 'playing',
      });
    }
    if (!playing && !isPresenter) {
      stopVideo(playerRef.current as ReactPlayer);
    }

    if (firstPlayRef.current) {
      firstPlayRef.current = false;
    }
  };

  const handleOnStop = async () => {
    setReactPlayerPlaying(false);
    if (isPresenter && playing && shouldPublishSync('stop')) {
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

    if (!isPresenter && playing) {
      playVideo(playerRef.current as ReactPlayer);
    }
  };

  const handleProgress = async (state: OnProgressProps) => {
    setPlayed(state.played);
    setLoaded(state.loaded);
    if (playing && isPresenter && shouldPublishSync('seek')) {
      currentTime = getServerCurrentTime();
    }
    const interPlayerPlaybackRate = await getPlaybackRate(playerRef.current as ReactPlayer);
    if (isPresenter && interPlayerPlaybackRate !== playerPlaybackRate && shouldPublishSync('seek')) {
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
    if (isPresenter && shouldPublishSync('seek')) {
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
    if (isPresenter && shouldPublishSync('playbackRateChange')) {
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

    if (isMinimized) {
      if (!isAparatSource) {
        stopVideo(playerRef.current);
      }
    } else if (playing) {
      // Presentation media: let ReactPlayer `playing` prop own playback to avoid double start.
      if (!isPresentationMedia) {
        playVideo(playerRef.current);
      }
    } else if (isAparatSource) {
      stopVideo(playerRef.current);
    }

    return () => {
      window.clearTimeout(clearLayoutTransition);
    };
  }, [isMinimized, playing, stopVideo, playVideo, isAparatSource, isPresentationMedia]);

  const handleAparatPresenterToggle = () => {
    if (!isPresenter || !isAparatSource) return;
    const nextPlaying = !(playing || reactPlayerPlaying);
    sendMessage(nextPlaying ? 'play' : 'stop', {
      rate: 1,
      time: getServerCurrentTime(),
      state: nextPlaying ? 'playing' : '',
    });
    if (playerRef.current) {
      if (nextPlaying) {
        playVideo(playerRef.current);
      } else {
        stopVideo(playerRef.current);
      }
    }
  };
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

  const shouldShowTools = () => {
    if (isPresenter || (!isPresenter && isGridLayout && !isSidebarContentOpen) || !videoUrl) {
      return false;
    }
    return true;
  };

  const handlePresentationMediaPlayPause = () => {
    if (!playerRef.current) return;
    if (playing || reactPlayerPlaying) {
      stopVideo(playerRef.current);
      return;
    }
    playVideo(playerRef.current);
  };

  const handlePresentationMediaSeek = (fraction: number) => {
    playerRef.current?.seekTo(fraction, 'fraction');
  };

  const handlePresentationMediaDownload = () => {
    if (!presentationMediaDownloadUri) return;
    window.open(presentationMediaDownloadUri);
  };

  return (
    <Styled.Container
      data-skyroom-stage-media="true"
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
        ref={playerParentRef}
        data-test="videoPlayer"
      >

        {
          showUnsynchedMsg && shouldShowTools()
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
              controls={!isPresentationAudio}
              previewTabIndex={isPresenter ? 0 : -1}
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
          isAparatSource && !isPresenter ? (
            <Styled.AparatViewerBlocker
              data-test="aparatViewerBlocker"
              aria-hidden="true"
            />
          ) : null
        }
        {
          isAparatSource && isPresenter ? (
            <Styled.AparatPresenterControls data-test="aparatPresenterControls">
              <Styled.AparatPlayPauseButton
                type="button"
                onClick={handleAparatPresenterToggle}
                aria-label={intl.formatMessage(
                  (playing || reactPlayerPlaying)
                    ? intlMessages.aparatPause
                    : intlMessages.aparatPlay,
                )}
              >
                {intl.formatMessage(
                  (playing || reactPlayerPlaying)
                    ? intlMessages.aparatPause
                    : intlMessages.aparatPlay,
                )}
              </Styled.AparatPlayPauseButton>
            </Styled.AparatPresenterControls>
          ) : null
        }
        {
          shouldShowTools() && !isPresentationAudio && !isAparatSource ? (
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
              label={intl.formatMessage(intlMessages.closeExternalVideoLabel)}
              hideLabel
              className={Styled.ExternalVideoCloseButton}
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
