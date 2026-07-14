import React from 'react';
import TimerIndicatorContainer from '/imports/ui/components/timer/indicator/component';
import SkyroomActivePollSummary from './SkyroomActivePollSummary';
import SkyroomPendingPollParticipation from './SkyroomPendingPollParticipation';

/**
 * Groups live poll/quiz summary and timer in the header control rail
 * (same zone as the countdown pill in Skyroom layout).
 */
const SkyroomHeaderStatusCluster: React.FC = () => (
  <div data-test="skyroom-header-status-cluster">
    <SkyroomPendingPollParticipation />
    <SkyroomActivePollSummary />
    <TimerIndicatorContainer />
  </div>
);

export default SkyroomHeaderStatusCluster;
