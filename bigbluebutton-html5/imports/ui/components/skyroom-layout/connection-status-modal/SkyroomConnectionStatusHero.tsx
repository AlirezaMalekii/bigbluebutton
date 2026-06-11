import React, { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useReactiveVar } from '@apollo/client';
import Icon from '/imports/ui/components/connection-status/icon/component';
import SettingsMenuContainer from '/imports/ui/components/settings/container';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import { getWorstStatus } from '/imports/ui/components/connection-status/service';
import Styled from './styles';

const intlMessages = defineMessages({
  label: {
    id: 'app.connection-status.label',
    description: 'Connection status label',
  },
  settings: {
    id: 'app.connection-status.settings',
    description: 'Connection settings label',
  },
  statusExcellent: {
    id: 'app.connection-status.statusExcellent',
    description: 'Excellent connection quality',
  },
  statusGood: {
    id: 'app.connection-status.statusGood',
    description: 'Good connection quality',
  },
  statusFair: {
    id: 'app.connection-status.statusFair',
    description: 'Fair connection quality',
  },
  statusPoor: {
    id: 'app.connection-status.statusPoor',
    description: 'Poor connection quality',
  },
  statusCritical: {
    id: 'app.connection-status.statusCritical',
    description: 'Critical connection quality',
  },
  metricsLive: {
    id: 'app.connection-status.metricsLive',
    description: 'Live metrics indicator',
  },
});

type ConnectionLevel = 'critical' | 'danger' | 'warning' | 'normal';

const STATUS_COPY: Record<ConnectionLevel, { messageId: keyof typeof intlMessages; tone: string }> = {
  normal: { messageId: 'statusExcellent', tone: 'excellent' },
  warning: { messageId: 'statusGood', tone: 'good' },
  danger: { messageId: 'statusFair', tone: 'fair' },
  critical: { messageId: 'statusCritical', tone: 'critical' },
};

interface SkyroomConnectionStatusHeroProps {
  closeModal: () => void;
}

const SkyroomConnectionStatusHero: React.FC<SkyroomConnectionStatusHeroProps> = ({
  closeModal,
}) => {
  const intl = useIntl();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const rttStatus = useReactiveVar(connectionStatus.getRttStatusVar());
  const packetLossStatus = useReactiveVar(connectionStatus.getPacketLossStatusVar());
  const liveKitConnQuality = useReactiveVar(connectionStatus.getLiveKitConnectionStatusVar());
  const currentStatus = getWorstStatus([
    rttStatus,
    packetLossStatus,
    liveKitConnQuality,
  ]) as ConnectionLevel;

  const statusMeta = STATUS_COPY[currentStatus] ?? STATUS_COPY.normal;
  const showSettings = currentStatus === 'critical'
    || currentStatus === 'danger'
    || isSettingsOpen;

  const handleSettingsClose = (value: boolean) => {
    setIsSettingsOpen(value);
    if (!value) closeModal();
  };

  return (
    <Styled.Hero data-tone={statusMeta.tone}>
      <Styled.HeroRing aria-hidden>
        <Styled.HeroIconWrap>
          <Icon level={currentStatus} grayscale />
        </Styled.HeroIconWrap>
      </Styled.HeroRing>

      <Styled.HeroBody>
        <Styled.HeroEyebrow>
          <Styled.LiveDot aria-hidden />
          {intl.formatMessage(intlMessages.metricsLive)}
        </Styled.HeroEyebrow>
        <Styled.HeroTitle>
          {intl.formatMessage(intlMessages[statusMeta.messageId])}
        </Styled.HeroTitle>
        <Styled.HeroSubtitle>
          {intl.formatMessage(intlMessages.label)}
        </Styled.HeroSubtitle>

        {showSettings ? (
          <Styled.HeroAction
            type="button"
            onClick={() => setIsSettingsOpen(true)}
          >
            {intl.formatMessage(intlMessages.settings)}
          </Styled.HeroAction>
        ) : null}
      </Styled.HeroBody>

      {isSettingsOpen ? (
        <SettingsMenuContainer
          selectedTab={2}
          onRequestClose={() => handleSettingsClose(false)}
          priority="medium"
          setIsOpen={handleSettingsClose}
          isOpen={isSettingsOpen}
        />
      ) : null}
    </Styled.Hero>
  );
};

export default SkyroomConnectionStatusHero;
