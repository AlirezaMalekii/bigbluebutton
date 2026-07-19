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
  breakoutDurationCompact: {
    id: 'app.breakout.manager.sidebarTime',
    description: 'Compact breakout remaining time for sidebar chip',
  },
});

interface BreakoutRemainingTimeContainerProps {
  boldText?: boolean;
  /** Short timer label for dense UI (e.g. users-list entry chip). */
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
        {intl.formatMessage(intlMessages.calculatingBreakoutTimeRemaining)}
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

  const durationLabel = compact
    ? intlMessages.breakoutDurationCompact
    : intlMessages.breakoutDuration;

  return (
    <RemainingTime
      referenceStartedTime={breakoutStartedTime}
      durationInSeconds={breakoutDuration}
      durationLabel={durationLabel}
      boldText={boldText}
      isBreakout={false}
    />
  );
};

export default BreakoutRemainingTimeContainer;
