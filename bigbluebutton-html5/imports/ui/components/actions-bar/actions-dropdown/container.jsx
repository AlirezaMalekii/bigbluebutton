import React, { useContext } from 'react';
import { useMutation } from '@apollo/client';
import ActionsDropdown from './component';
import { layoutSelectInput, layoutDispatch, layoutSelect } from '../../layout/context';
import { SMALL_VIEWPORT_BREAKPOINT } from '../../layout/enums';
import {
  useIsCameraAsContentEnabled,
  useIsPresentationEnabled,
  useIsTimerFeatureEnabled,
} from '/imports/ui/services/features';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import { useShortcut } from '/imports/ui/core/hooks/useShortcut';
import {
  PRESENTATIONS_SUBSCRIPTION,
} from '/imports/ui/components/whiteboard/queries';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { SET_PRESENTER } from '/imports/ui/core/graphql/mutations/userMutations';
import {
  TIMER_ACTIVATE,
  TIMER_DEACTIVATE,
  TIMER_SET_SONG_TRACK,
  TIMER_SET_TIME,
  TIMER_START,
  TIMER_SWITCH_MODE,
} from '../../timer/mutations';
import Auth from '/imports/ui/services/auth';
import { PRESENTATION_SET_CURRENT } from '../../presentation/mutations';
import {
  EXTERNAL_VIDEO_START,
  EXTERNAL_VIDEO_STOP,
} from '../../external-video-player/mutations';
import {
  isPresentationMedia,
  startPresentationMediaExternalVideo,
} from '../../presentation/presentation-uploader/presentationMediaSync';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import { useMeetingIsBreakout } from '/imports/ui/components/app/service';
import { useIsQuizEnabled } from '../../../services/features';
import useMeeting from '/imports/ui/core/hooks/useMeeting';

const ActionsDropdownContainer = (props) => {
  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const sidebarNavigation = layoutSelectInput((i) => i.sidebarNavigation);
  const { width: browserWidth } = layoutSelectInput((i) => i.browser);
  const isMobile = browserWidth <= SMALL_VIEWPORT_BREAKPOINT;
  const layoutContextDispatch = layoutDispatch();
  const isRTL = layoutSelect((i) => i.isRTL);
  const { pluginsExtensibleAreasAggregatedState } = useContext(PluginsContext);
  const meetingIsBreakout = useMeetingIsBreakout();

  let actionButtonDropdownItems = [];
  if (pluginsExtensibleAreasAggregatedState.actionButtonDropdownItems) {
    actionButtonDropdownItems = [
      ...pluginsExtensibleAreasAggregatedState.actionButtonDropdownItems,
    ];
  }

  const openActions = useShortcut('openActions');

  const { data: presentationData } = useDeduplicatedSubscription(
    PRESENTATIONS_SUBSCRIPTION,
  );
  const presentations = presentationData?.pres_presentation || [];

  const {
    allowPresentationManagementInBreakouts,
  } = window.meetingClientSettings.public.app.breakouts;

  const isPresentationManagementDisabled = meetingIsBreakout
    && !allowPresentationManagementInBreakouts;

  const [setPresenter] = useMutation(SET_PRESENTER);
  const [timerActivate] = useMutation(TIMER_ACTIVATE);
  const [timerDeactivate] = useMutation(TIMER_DEACTIVATE);
  const [timerSetSongTrack] = useMutation(TIMER_SET_SONG_TRACK);
  const [timerSetTime] = useMutation(TIMER_SET_TIME);
  const [timerStart] = useMutation(TIMER_START);
  const [timerSwitchMode] = useMutation(TIMER_SWITCH_MODE);
  const [presentationSetCurrent] = useMutation(PRESENTATION_SET_CURRENT);
  const [startExternalVideoMutation] = useMutation(EXTERNAL_VIDEO_START);
  const [stopExternalVideoMutation] = useMutation(EXTERNAL_VIDEO_STOP);

  const startExternalVideo = (externalVideoUrl) => {
    if (!externalVideoUrl) return;
    startExternalVideoMutation({ variables: { externalVideoUrl } });
  };

  const stopExternalVideo = () => {
    stopExternalVideoMutation();
  };

  const handleTakePresenter = () => {
    setPresenter({ variables: { userId: Auth.userID } });
  };

  const setPresentation = (presentationId) => {
    const presentation = presentations.find((p) => p.presentationId === presentationId);
    if (presentation && isPresentationMedia(presentation)) {
      presentationSetCurrent({ variables: { presentationId } });
      startPresentationMediaExternalVideo(
        presentation,
        presentations,
        { startExternalVideo, stopExternalVideo },
      );
      return;
    }

    stopExternalVideo();
    presentationSetCurrent({ variables: { presentationId } });
  };

  const activateTimer = async ({
    stopwatch = false,
    running = false,
    time = 0,
    songTrack = 'noTrack',
  } = {}) => {
    const TIMER_CONFIG = window.meetingClientSettings.public.timer;
    const defaultTime = TIMER_CONFIG.time * 60000;
    const normalizedTime = stopwatch ? 0 : Math.max(0, time || defaultTime);

    // Ensure mode is updated even when re-activating after a previous mode was used.
    await timerSwitchMode({ variables: { stopwatch } });
    if (!stopwatch && normalizedTime > 0) {
      await timerSetTime({ variables: { time: normalizedTime } });
    }
    await timerActivate({
      variables: {
        stopwatch,
        running: false,
        time: normalizedTime,
      },
    });
    if (TIMER_CONFIG.music?.enabled) {
      await timerSetSongTrack({ variables: { track: songTrack || 'noTrack' } });
    }
    if (running) {
      await timerStart();
    }
  };

  const isDropdownOpen = useStorageKey('dropdownOpen');
  const isPresentationEnabled = useIsPresentationEnabled();
  const isTimerFeatureEnabled = useIsTimerFeatureEnabled();
  const isCameraAsContentEnabled = useIsCameraAsContentEnabled();
  const isQuizEnabled = useIsQuizEnabled();

  const { data: meetingData } = useMeeting((m) => ({
    hasPoll: m?.componentsFlags?.hasPoll,
  }));

  return (
    <ActionsDropdown
      {...{
        hasActivePoll: meetingData?.hasPoll ?? false,
        layoutContextDispatch,
        sidebarContent,
        sidebarNavigation,
        isMobile,
        isRTL,
        actionButtonDropdownItems,
        presentations: presentations.filter((p) => p).filter((p) => p.uploadCompleted),
        isTimerFeatureEnabled,
        isDropdownOpen,
        setPresentation,
        isCameraAsContentEnabled,
        handleTakePresenter,
        activateTimer,
        deactivateTimer: timerDeactivate,
        shortcuts: openActions,
        isPresentationEnabled,
        isPresentationManagementDisabled,
        isQuizEnabled,
        isBreakout: meetingIsBreakout,
        ...props,
      }}
    />
  );
};

export default ActionsDropdownContainer;
