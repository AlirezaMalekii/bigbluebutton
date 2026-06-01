import { useMutation } from '@apollo/client';
import React, { useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import humanizeSeconds from '/imports/utils/humanizeSeconds';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { layoutSelectInput } from '../../layout/context';
import { Input } from '../../layout/layoutTypes';
import { TIMER_START, TIMER_STOP } from '../mutations';
import useTimer from '/imports/ui/core/hooks/useTimer';
import usePreviousValue from '/imports/ui/hooks/usePreviousValue';

interface TimerIndicatorProps {
  timePassed: number;
  songTrack: string;
  stopwatch: boolean;
  elapsed?: boolean;
  running: boolean;
  isModerator: boolean;
  sidebarNavigationIsOpen: boolean;
  sidebarContentIsOpen: boolean;
}

const intlMessages = defineMessages({
  timer: {
    id: 'app.timer.timer.title',
    description: 'Timer label',
  },
  stopwatch: {
    id: 'app.timer.stopwatch.title',
    description: 'Stopwatch label',
  },
  stateRunning: {
    id: 'app.timer.state.running',
    description: 'Timer running state',
  },
  statePaused: {
    id: 'app.timer.state.paused',
    description: 'Timer paused state',
  },
  stateElapsed: {
    id: 'app.timer.state.elapsed',
    description: 'Timer elapsed state',
  },
  toolTipTimerStopped: {
    id: 'app.timer.toolTipTimerStopped',
    description: 'Timer stopped tooltip',
  },
  toolTipTimerRunning: {
    id: 'app.timer.toolTipTimerRunning',
    description: 'Timer running tooltip',
  },
  toolTipStopwatchStopped: {
    id: 'app.timer.toolTipStopwatchStopped',
    description: 'Stopwatch stopped tooltip',
  },
  toolTipStopwatchRunning: {
    id: 'app.timer.toolTipStopwatchRunning',
    description: 'Stopwatch running tooltip',
  },
  toolTipTimerStoppedMod: {
    id: 'app.timer.toolTipTimerStoppedMod',
    description: 'Timer stopped tooltip for moderator',
  },
  toolTipTimerRunningMod: {
    id: 'app.timer.toolTipTimerRunningMod',
    description: 'Timer running tooltip for moderator',
  },
  toolTipStopwatchStoppedMod: {
    id: 'app.timer.toolTipStopwatchStoppedMod',
    description: 'Stopwatch stopped tooltip for moderator',
  },
  toolTipStopwatchRunningMod: {
    id: 'app.timer.toolTipStopwatchRunningMod',
    description: 'Stopwatch running tooltip for moderator',
  },
});

const TimerIndicator: React.FC<TimerIndicatorProps> = ({
  timePassed,
  songTrack,
  stopwatch,
  elapsed,
  running,
  isModerator,
  sidebarNavigationIsOpen,
  sidebarContentIsOpen,
}) => {
  const intl = useIntl();
  const timeRef = useRef<HTMLSpanElement>(null);
  const alarm = useRef<HTMLAudioElement>();
  const music = useRef<HTMLAudioElement>();
  const triggered = useRef<boolean>(true);
  const alreadyNotified = useRef<boolean>(false);
  const [startTimerMutation] = useMutation(TIMER_START);
  const [stopTimerMutation] = useMutation(TIMER_STOP);
  const [songTrackState, setSongTrackState] = useState<string>(songTrack);
  const prevElapsed = usePreviousValue<boolean | undefined>(elapsed);

  const CDN = window.meetingClientSettings.public.app.cdn;
  const BASENAME = window.meetingClientSettings.public.app.basename;
  const HOST = CDN + BASENAME;
  const trackName = window.meetingClientSettings.public.timer.music;
  const MUSIC_VOLUME = window.meetingClientSettings.public.timer.music.volume;

  type ObjectKey = keyof typeof trackName;

  const startTimer = () => {
    startTimerMutation();
  };

  const stopTimer = () => {
    stopTimerMutation();
  };

  useEffect(() => {
    if (songTrackState !== songTrack) {
      if (music.current) music.current.pause();
    }
    if (songTrack in trackName) {
      music.current = new Audio(`${HOST}/resources/sounds/${trackName[songTrack as ObjectKey]}.mp3`);
      music.current.volume = MUSIC_VOLUME;
      setSongTrackState(songTrack);
      music.current.addEventListener('timeupdate', () => {
        const buffer = 0.19;
        // Start playing the music before it ends to make the loop gapless
        if (!music.current) return null;
        if (music.current.currentTime > music.current.duration - buffer) {
          music.current.currentTime = 0;
          music.current.play();
        }
        return null;
      });
    }

    return () => {
      if (music.current) music.current.pause();
    };
  }, [songTrack]);

  useEffect(() => {
    alarm.current = new Audio(`${HOST}/resources/sounds/alarm.mp3`);
  }, []);

  useEffect(() => {
    // Prevent the alarm from triggering for users that join the conference
    // after the timer has elapsed. It only triggers for users that see the
    // elapsed property of timer change from false to true
    if (elapsed && prevElapsed === false) {
      if (!alreadyNotified.current) {
        triggered.current = false;
        alreadyNotified.current = true;
        if (alarm.current) alarm.current.play();
      }
    }
  }, [elapsed]);

  useEffect(() => {
    if (!timeRef.current) {
      if (music.current) music.current.pause();
      if (alarm.current) alarm.current.pause();
    }
  }, [timePassed]);

  useEffect(() => {
    if (running && songTrack !== 'noTrack') {
      if (music.current) music.current.play();
    } else if (!running || songTrack === 'noTrack') {
      if (music.current) music.current.pause();
    }
    if (running && alreadyNotified.current) {
      alreadyNotified.current = false;
    }
  }, [running, songTrackState]);

  const onClick = running ? stopTimer : startTimer;
  const modeLabel = stopwatch
    ? intl.formatMessage(intlMessages.stopwatch)
    : intl.formatMessage(intlMessages.timer);
  let stateLabel = intl.formatMessage(intlMessages.statePaused);
  if (elapsed) {
    stateLabel = intl.formatMessage(intlMessages.stateElapsed);
  } else if (running) {
    stateLabel = intl.formatMessage(intlMessages.stateRunning);
  }

  let tooltipMessage;
  if (stopwatch) {
    tooltipMessage = running
      ? intlMessages[isModerator ? 'toolTipStopwatchRunningMod' : 'toolTipStopwatchRunning']
      : intlMessages[isModerator ? 'toolTipStopwatchStoppedMod' : 'toolTipStopwatchStopped'];
  } else {
    tooltipMessage = running
      ? intlMessages[isModerator ? 'toolTipTimerRunningMod' : 'toolTipTimerRunning']
      : intlMessages[isModerator ? 'toolTipTimerStoppedMod' : 'toolTipTimerStopped'];
  }
  const fullLabel = `${modeLabel}: ${humanizeSeconds(Math.floor(timePassed / 1000))}. ${stateLabel}.`;

  return (
    <Styled.TimerWrapper>
      <Styled.Timer>
        <Styled.TimerButton
          running={running}
          disabled={!isModerator}
          hide={sidebarNavigationIsOpen && sidebarContentIsOpen}
          role="button"
          tabIndex={0}
          onClick={isModerator ? onClick : () => {}}
          data-test="timeIndicator"
          title={intl.formatMessage(tooltipMessage)}
          aria-label={fullLabel}
        >
          <Styled.TimerContent>
            <Styled.TimerIcon>
              <Icon iconName="time" />
            </Styled.TimerIcon>
            <Styled.TimerMeta>
              <Styled.TimeWithStatus>
                <Styled.PrimaryLine>
                  <Styled.TimerPill running={running}>
                    {modeLabel}
                  </Styled.TimerPill>
                  <Styled.Dot running={running} />
                  <Styled.TimerStatus>{stateLabel}</Styled.TimerStatus>
                </Styled.PrimaryLine>
                <Styled.SecondaryLine>
                  <Styled.TimerTime
                    aria-hidden
                    ref={timeRef}
                  >
                    {humanizeSeconds(Math.floor(timePassed / 1000))}
                  </Styled.TimerTime>
                </Styled.SecondaryLine>
              </Styled.TimeWithStatus>
            </Styled.TimerMeta>
          </Styled.TimerContent>
        </Styled.TimerButton>
      </Styled.Timer>
    </Styled.TimerWrapper>
  );
};

const TimerIndicatorContainer: React.FC = () => {
  const { data: currentUser } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
  }));

  const {
    data: timerData,
  } = useTimer({ isIndicator: true });

  const sidebarNavigation = layoutSelectInput((i: Input) => i.sidebarNavigation);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const sidebarNavigationIsOpen = sidebarNavigation.isOpen;
  const sidebarContentIsOpen = sidebarContent.isOpen;

  const currentTimer = timerData;
  if (!currentTimer?.active) return null;
  const {
    timePassed = 0,
    songTrack,
    stopwatch,
    elapsed,
    running,
  } = currentTimer;

  return (
    <TimerIndicator
      timePassed={timePassed}
      songTrack={songTrack}
      stopwatch={stopwatch}
      elapsed={elapsed}
      running={running}
      isModerator={currentUser?.isModerator ?? false}
      sidebarNavigationIsOpen={sidebarNavigationIsOpen}
      sidebarContentIsOpen={sidebarContentIsOpen}
    />
  );
};

export default TimerIndicatorContainer;
