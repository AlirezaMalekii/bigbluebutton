import React from 'react';
import RemainingTime from '/imports/ui/components/common/remaining-time/component';
import { defineMessages, useIntl } from 'react-intl';
import useMeeting from '/imports/ui/core/hooks/useMeeting';

const intlMessages = defineMessages({
  calculatingBreakoutTimeRemaining: {
    id: 'app.calculatingBreakoutTimeRemaining',
    description: 'Message that tells that the remaining time is being calculated',
  },
  breakoutDuration: {
    id: 'app.createBreakoutRoom.duration',
    description: 'breakout duration time',
  },
});

interface BreakoutRemainingTimeContainerProps {
  boldText?: boolean;
  /** Short timer (clock only) for dense UI chips — no i18n sentence. */
  compact?: boolean;
}

const BreakoutRemainingTimeContainer: React.FC<BreakoutRemainingTimeContainerProps> = ({
  boldText = false,
  compact = false,
}) => {
  const intl = useIntl();
  const loadingRemainingTime = () => {
    return (
      <span>
        {compact ? '…' : intl.formatMessage(intlMessages.calculatingBreakoutTimeRemaining)}
      </span>
    );
  };

  const {
    data: currentMeeting,
    loading: currentMeetingLoading,
  } = useMeeting((m) => ({
    breakoutRoomsCommonProperties: m.breakoutRoomsCommonProperties,
  }));

  if (currentMeetingLoading) return loadingRemainingTime();
  if (!currentMeeting?.breakoutRoomsCommonProperties) return null;

  const breakoutDuration: number = currentMeeting?.breakoutRoomsCommonProperties?.durationInSeconds;
  const breakoutStartedAt: Date = new Date(currentMeeting?.breakoutRoomsCommonProperties?.startedAt ?? '');
  const breakoutStartedTime = breakoutStartedAt.getTime();

  return (
    <RemainingTime
      referenceStartedTime={breakoutStartedTime}
      durationInSeconds={breakoutDuration}
      durationLabel={intlMessages.breakoutDuration}
      boldText={boldText}
      isBreakout={false}
      compact={compact}
    />
  );
};

export default BreakoutRemainingTimeContainer;
