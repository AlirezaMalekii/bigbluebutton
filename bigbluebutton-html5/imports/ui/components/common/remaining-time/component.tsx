import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import humanizeSeconds from '/imports/utils/humanizeSeconds';
import { Text, Time } from './styles';
import { notify } from '/imports/ui/services/notification';
import useTimeSync from '/imports/ui/core/local-states/useTimeSync';

type intlMsg = {
  id: string;
  description?: string;
};

interface RemainingTimeProps {
  referenceStartedTime: number;
  durationInSeconds: number;
  durationLabel: intlMsg;
  isBreakout: boolean;
  boldText: boolean;
  endingLabel?: intlMsg;
  alertLabel?: intlMsg;
  /** SafeMeet scheduled ends_at (ms) from join userdata — overrides createdTime + duration. */
  scheduledEndTimeMs?: number;
  /** Show only humanized clock (no i18n sentence) — for dense chips. */
  compact?: boolean;
}

let lastAlertTime: number | null = null;

const RemainingTime: React.FC<RemainingTimeProps> = (props) => {
  const {
    referenceStartedTime,
    durationInSeconds,
    durationLabel,
    endingLabel = undefined,
    alertLabel = undefined,
    isBreakout,
    boldText,
    scheduledEndTimeMs = 0,
    compact = false,
  } = props;

  const intl = useIntl();
  const [timeSync] = useTimeSync();
  const timeRemainingInterval = React.useRef<ReturnType<typeof setInterval>>();
  const [remainingTime, setRemainingTime] = useState<number>(-1);

  const calculateRemainingTime = useCallback(() => {
    const adjustedCurrentTime = Date.now() + timeSync;

    if (scheduledEndTimeMs > 0) {
      return Math.max(0, Math.floor((scheduledEndTimeMs - adjustedCurrentTime) / 1000));
    }

    const durationInMilliseconds = durationInSeconds * 1000;

    return Math.floor(((referenceStartedTime + durationInMilliseconds) - adjustedCurrentTime) / 1000);
  }, [durationInSeconds, referenceStartedTime, scheduledEndTimeMs, timeSync]);

  useEffect(() => {
    const hasScheduledEnd = scheduledEndTimeMs > 0;
    const hasBbbDuration = durationInSeconds > 0 && referenceStartedTime > 0;

    if (!hasScheduledEnd && !hasBbbDuration) {
      return undefined;
    }

    const tick = () => {
      setRemainingTime(calculateRemainingTime());
    };

    tick();
    clearInterval(timeRemainingInterval.current);
    timeRemainingInterval.current = setInterval(tick, 1000);

    return () => {
      clearInterval(timeRemainingInterval.current);
    };
  }, [calculateRemainingTime, durationInSeconds, referenceStartedTime, scheduledEndTimeMs]);

  const meetingTimeMessage = React.useRef<string>('');

  if (remainingTime >= 0) {
    if (remainingTime > 0) {
      const APP_SETTINGS = window.meetingClientSettings.public.app;
      const REMAINING_TIME_ALERT_THRESHOLD_ARRAY: number[] = APP_SETTINGS.remainingTimeAlertThresholdArray;

      const alertsInSeconds = REMAINING_TIME_ALERT_THRESHOLD_ARRAY.map((item) => item * 60);

      if (alertsInSeconds.includes(remainingTime) && remainingTime !== lastAlertTime && alertLabel) {
        const timeInMinutes = remainingTime / 60;
        const msg = { id: `${alertLabel.id}${timeInMinutes === 1 ? 'Singular' : 'Plural'}` };
        const alertMessage = intl.formatMessage(msg, { timeInMinutes });

        lastAlertTime = remainingTime;
        notify(alertMessage, 'info', 'rooms');
      }

      const clock = humanizeSeconds(remainingTime);
      meetingTimeMessage.current = compact
        ? clock
        : intl.formatMessage(durationLabel, { remainingTime: clock });
      if (isBreakout) {
        return (
          <span data-test="timeRemaining">
            {meetingTimeMessage.current}
          </span>
        );
      }
    } else {
      clearInterval(timeRemainingInterval.current);
      if (endingLabel) meetingTimeMessage.current = intl.formatMessage(endingLabel);
      else if (compact) meetingTimeMessage.current = '00:00';
    }
  }

  if (boldText && !compact) {
    const words = meetingTimeMessage.current.split(' ');
    const time = words.pop();
    const text = words.join(' ');

    return (
      <span data-test="timeRemaining">
        <Text>{text}</Text>
        <br />
        <Time data-test="breakoutRemainingTime">{time}</Time>
      </span>
    );
  }

  return (
    <span data-test="timeRemaining">
      {meetingTimeMessage.current}
    </span>
  );
};

export default RemainingTime;
