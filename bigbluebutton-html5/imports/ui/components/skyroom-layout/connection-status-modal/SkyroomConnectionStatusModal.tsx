import React from 'react';
import { FormattedTime, defineMessages, IntlShape } from 'react-intl';
import UserAvatar from '/imports/ui/components/user-avatar/component';
import TooltipContainer from '/imports/ui/components/common/tooltip/container';
import Icon from '/imports/ui/components/connection-status/icon/component';
import Auth from '/imports/ui/services/auth';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import SkyroomConnectionStatusHero from './SkyroomConnectionStatusHero';
import Styled from './styles';
import {
  StatsTabIcon,
  MyLogsTabIcon,
  SessionLogsTabIcon,
  UploadIcon,
  DownloadIcon,
  AudioIcon,
  VideoIcon,
  NetworkIcon,
  CopyIcon,
  EmptyStateIcon,
} from './icons';

const intlMessages = defineMessages({
  title: {
    id: 'app.connection-status.title',
    description: 'Connection status title',
  },
  description: {
    id: 'app.connection-status.description',
    description: 'Connection status description',
  },
  connectionStats: {
    id: 'app.connection-status.connectionStats',
    description: 'Label for Connection Stats tab',
  },
  myLogs: {
    id: 'app.connection-status.myLogs',
    description: 'Label for My Logs tab',
  },
  sessionLogs: {
    id: 'app.connection-status.sessionLogs',
    description: 'Label for Session Logs tab',
  },
  empty: {
    id: 'app.connection-status.empty',
    description: 'Connection status empty',
  },
  emptySubtitle: {
    id: 'app.connection-status.emptySubtitle',
    description: 'Empty state subtitle',
  },
  offline: {
    id: 'app.connection-status.offline',
    description: 'Offline user',
  },
  copy: {
    id: 'app.connection-status.copy',
    description: 'Copy network data',
  },
  copied: {
    id: 'app.connection-status.copied',
    description: 'Copied network data',
  },
  no: {
    id: 'app.connection-status.no',
    description: 'No to is using turn',
  },
  yes: {
    id: 'app.connection-status.yes',
    description: 'Yes to is using turn',
  },
  usingTurn: {
    id: 'app.connection-status.usingTurn',
    description: 'User is using turn server',
  },
  jitter: {
    id: 'app.connection-status.jitter',
    description: 'Jitter buffer in ms',
  },
  lostPackets: {
    id: 'app.connection-status.lostPackets',
    description: 'Number of lost packets',
  },
  audioUploadRate: {
    id: 'app.connection-status.audioUploadRate',
    description: 'Label for audio current upload rate',
  },
  audioDownloadRate: {
    id: 'app.connection-status.audioDownloadRate',
    description: 'Label for audio current download rate',
  },
  videoUploadRate: {
    id: 'app.connection-status.videoUploadRate',
    description: 'Label for video current upload rate',
  },
  videoDownloadRate: {
    id: 'app.connection-status.videoDownloadRate',
    description: 'Label for video current download rate',
  },
  uploadSection: {
    id: 'app.connection-status.uploadSection',
    description: 'Upload metrics section',
  },
  downloadSection: {
    id: 'app.connection-status.downloadSection',
    description: 'Download metrics section',
  },
  qualitySection: {
    id: 'app.connection-status.qualitySection',
    description: 'Network quality section',
  },
  clientNotResponding: {
    id: 'app.connection-status.clientNotRespondingWarning',
    description: 'Text for Client not responding warning',
  },
  lastTimeActive: {
    id: 'app.connection-status.lastTimeActive',
    description: 'Last time the client confirmed its connection was alive',
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
  statusCritical: {
    id: 'app.connection-status.statusCritical',
    description: 'Critical connection quality',
  },
});

type ConnectionEntry = {
  user: {
    userId: string;
    name: string;
    avatar: string;
    isModerator: boolean;
    color: string;
    currentlyInMeeting: boolean;
  };
  lastUnstableStatus: string;
  lastUnstableStatusAt: string;
  clientNotResponding?: boolean;
  connectionAliveAt?: string;
};

interface NetworkData {
  ready?: boolean;
  audio: {
    audioCurrentUploadRate: number;
    audioCurrentDownloadRate: number;
    jitter: number;
    packetsLost: number;
    transportStats?: {
      isUsingTurn?: boolean;
    };
  };
  video: {
    videoCurrentUploadRate: number;
    videoCurrentDownloadRate: number;
  };
}

interface SkyroomConnectionStatusModalProps {
  intl: IntlShape;
  selectedTab: number;
  onSelectTab: (tab: number) => void;
  amIModerator: boolean;
  connectionData: ConnectionEntry[];
  networkData: NetworkData;
  copyButtonText: string;
  onCopyNetworkData: () => void;
  setModalIsOpen: (open: boolean) => void;
}

const isConnectionStatusEmpty = (data: ConnectionEntry[] | null | undefined) => {
  if (!data || !Array.isArray(data) || data.length === 0) return true;
  return false;
};

const LEVEL_LABELS: Record<string, keyof typeof intlMessages> = {
  normal: 'statusExcellent',
  warning: 'statusGood',
  danger: 'statusFair',
  critical: 'statusCritical',
};

const SkyroomConnectionStatusModal: React.FC<SkyroomConnectionStatusModalProps> = ({
  intl,
  selectedTab,
  onSelectTab,
  amIModerator,
  connectionData,
  networkData,
  copyButtonText,
  onCopyNetworkData,
  setModalIsOpen,
}) => {
  const tabs = [
    {
      id: 'stats',
      label: intl.formatMessage(intlMessages.connectionStats),
      icon: StatsTabIcon,
    },
    {
      id: 'my-logs',
      label: intl.formatMessage(intlMessages.myLogs),
      icon: MyLogsTabIcon,
    },
    ...(amIModerator ? [{
      id: 'session-logs',
      label: intl.formatMessage(intlMessages.sessionLogs),
      icon: SessionLogsTabIcon,
    }] : []),
  ];

  const renderEmpty = () => (
    <Styled.EmptyState data-test="connectionStatusItemEmpty">
      <Styled.EmptyIcon>
        <EmptyStateIcon />
      </Styled.EmptyIcon>
      <Styled.EmptyTitle>
        {intl.formatMessage(intlMessages.empty)}
      </Styled.EmptyTitle>
      <Styled.EmptySubtitle>
        {intl.formatMessage(intlMessages.emptySubtitle)}
      </Styled.EmptySubtitle>
    </Styled.EmptyState>
  );

  const getConnectionsForTab = (): ConnectionEntry[] => {
    if (selectedTab === 0) return [];
    if (selectedTab === 1) {
      let connections = connectionData.filter((c) => c.user.userId === Auth.userID);
      if (isConnectionStatusEmpty(connections)) {
        connections = connectionStatus.getUserNetworkHistory() as unknown as ConnectionEntry[];
      }
      return connections;
    }
    return connectionData;
  };

  const renderLogEntries = () => {
    const connections = getConnectionsForTab();

    if (isConnectionStatusEmpty(connections)) {
      return renderEmpty();
    }

    return (
      <Styled.LogList>
        {connections.map((conn) => {
          const dateTime = new Date(conn.lastUnstableStatusAt);
          const lastActiveConnection = conn.connectionAliveAt
            ? new Date(conn.connectionAliveAt)
            : new Date();
          const level = conn.lastUnstableStatus || 'normal';
          const statusLabel = LEVEL_LABELS[level]
            ? intl.formatMessage(intlMessages[LEVEL_LABELS[level]])
            : level;

          return (
            <Styled.LogCard
              key={`${conn.user.name}-${conn.user.userId}`}
              data-test="connectionStatusItemUser"
            >
              <Styled.LogAvatar>
                <UserAvatar
                  avatar={conn.user.avatar}
                  moderator={conn.user.isModerator}
                  color={conn.user.color}
                >
                  <span>{(conn.user.name?.toLowerCase()?.slice(0, 2)) || ''}</span>
                </UserAvatar>
              </Styled.LogAvatar>

              <Styled.LogMain>
                <Styled.LogNameRow>
                  <Styled.LogName
                    $offline={!conn.user.currentlyInMeeting}
                    data-test={!conn.user.currentlyInMeeting ? 'offlineUser' : null}
                  >
                    {conn.user.name}
                    {!conn.user.currentlyInMeeting
                      ? ` (${intl.formatMessage(intlMessages.offline)})`
                      : null}
                  </Styled.LogName>

                  {!conn.clientNotResponding ? (
                    <Styled.StatusBadge $level={level}>
                      <Styled.BadgeIcon>
                        <Icon level={level} grayscale={false} />
                      </Styled.BadgeIcon>
                      {statusLabel}
                    </Styled.StatusBadge>
                  ) : null}
                </Styled.LogNameRow>

                {conn.clientNotResponding && conn.user.currentlyInMeeting ? (
                  <Styled.LogWarning>
                    {intl.formatMessage(intlMessages.clientNotResponding)}
                  </Styled.LogWarning>
                ) : null}
              </Styled.LogMain>

              <Styled.LogTime>
                {!conn.clientNotResponding ? (
                  <Styled.LogTimeValue dateTime={dateTime.toISOString()}>
                    <FormattedTime value={dateTime} />
                  </Styled.LogTimeValue>
                ) : (
                  <TooltipContainer
                    placement="top"
                    title={intl.formatMessage(intlMessages.lastTimeActive)}
                  >
                    <Styled.LogTimeActive dateTime={lastActiveConnection.toISOString()}>
                      <FormattedTime value={lastActiveConnection} />
                    </Styled.LogTimeActive>
                  </TooltipContainer>
                )}
              </Styled.LogTime>
            </Styled.LogCard>
          );
        })}
      </Styled.LogList>
    );
  };

  const renderMetric = (
    label: string,
    value: string,
    icon: React.ReactNode,
    variant: 'upload' | 'download' | 'neutral',
  ) => (
    <Styled.MetricCard>
      <Styled.MetricIcon $variant={variant}>
        {icon}
      </Styled.MetricIcon>
      <Styled.MetricContent>
        <Styled.MetricLabel>{label}</Styled.MetricLabel>
        <Styled.MetricValue>{value}</Styled.MetricValue>
      </Styled.MetricContent>
    </Styled.MetricCard>
  );

  const renderStatsPanel = () => {
    const { enableNetworkStats } = window.meetingClientSettings.public.app;
    const { enableCopyNetworkStatsButton } = window.meetingClientSettings.public.app;
    const isCopied = copyButtonText === intl.formatMessage(intlMessages.copied);

    if (!enableNetworkStats) {
      return (
        <Styled.PanelScroll>
          <SkyroomConnectionStatusHero closeModal={() => setModalIsOpen(false)} />
        </Styled.PanelScroll>
      );
    }

    const {
      audioCurrentUploadRate,
      audioCurrentDownloadRate,
      jitter,
      packetsLost,
      transportStats,
    } = networkData.audio;

    const {
      videoCurrentUploadRate,
      videoCurrentDownloadRate,
    } = networkData.video;

    let isUsingTurn = '--';
    if (transportStats) {
      switch (transportStats.isUsingTurn) {
        case true:
          isUsingTurn = intl.formatMessage(intlMessages.yes);
          break;
        case false:
          isUsingTurn = intl.formatMessage(intlMessages.no);
          break;
        default:
          break;
      }
    }

    return (
      <>
        <Styled.PanelScroll>
          <SkyroomConnectionStatusHero closeModal={() => setModalIsOpen(false)} />

          <Styled.SectionLabel>
            {intl.formatMessage(intlMessages.uploadSection)}
          </Styled.SectionLabel>
          <Styled.MetricGrid data-test="networkDataContainer">
            {renderMetric(
              intl.formatMessage(intlMessages.audioUploadRate),
              `${audioCurrentUploadRate}k ↑`,
              <AudioIcon />,
              'upload',
            )}
            {renderMetric(
              intl.formatMessage(intlMessages.videoUploadRate),
              `${videoCurrentUploadRate}k ↑`,
              <VideoIcon />,
              'upload',
            )}
          </Styled.MetricGrid>

          <Styled.SectionLabel>
            {intl.formatMessage(intlMessages.downloadSection)}
          </Styled.SectionLabel>
          <Styled.MetricGrid>
            {renderMetric(
              intl.formatMessage(intlMessages.audioDownloadRate),
              `${audioCurrentDownloadRate}k ↓`,
              <AudioIcon />,
              'download',
            )}
            {renderMetric(
              intl.formatMessage(intlMessages.videoDownloadRate),
              `${videoCurrentDownloadRate}k ↓`,
              <VideoIcon />,
              'download',
            )}
          </Styled.MetricGrid>

          <Styled.SectionLabel>
            {intl.formatMessage(intlMessages.qualitySection)}
          </Styled.SectionLabel>
          <Styled.MetricGrid>
            {renderMetric(
              intl.formatMessage(intlMessages.jitter),
              `${jitter} ms`,
              <NetworkIcon />,
              'neutral',
            )}
            {renderMetric(
              intl.formatMessage(intlMessages.lostPackets),
              `${packetsLost}`,
              <DownloadIcon />,
              'neutral',
            )}
            {renderMetric(
              intl.formatMessage(intlMessages.usingTurn),
              isUsingTurn,
              <UploadIcon />,
              'neutral',
            )}
          </Styled.MetricGrid>
        </Styled.PanelScroll>

        {enableCopyNetworkStatsButton ? (
          <Styled.CopyButton
            type="button"
            disabled={!networkData?.ready}
            $copied={isCopied}
            data-test="copyStats"
            onClick={onCopyNetworkData}
            aria-live="polite"
          >
            <CopyIcon />
            {copyButtonText}
          </Styled.CopyButton>
        ) : null}
      </>
    );
  };

  const renderPanelContent = () => {
    if (selectedTab === 0) return renderStatsPanel();
    return (
      <Styled.PanelScroll>
        {renderLogEntries()}
      </Styled.PanelScroll>
    );
  };

  return (
    <Styled.Shell className="skyroom-conn-modal">
      <Styled.TopBar>
        <Styled.TopBarIcon aria-hidden>
          <NetworkIcon />
        </Styled.TopBarIcon>
        <Styled.TopBarText>
          <Styled.ModalTitle>
            {intl.formatMessage(intlMessages.title)}
          </Styled.ModalTitle>
          <Styled.ModalDescription>
            {intl.formatMessage(intlMessages.description)}
          </Styled.ModalDescription>
        </Styled.TopBarText>
      </Styled.TopBar>

      <Styled.Body>
        <Styled.Nav aria-label={intl.formatMessage(intlMessages.title)}>
          {tabs.map((tab, index) => {
            const TabIcon = tab.icon;
            return (
              <Styled.NavButton
                key={tab.id}
                type="button"
                $active={selectedTab === index}
                aria-selected={selectedTab === index}
                onClick={() => onSelectTab(index)}
              >
                <TabIcon />
                <span>{tab.label}</span>
              </Styled.NavButton>
            );
          })}
        </Styled.Nav>

        <Styled.Panel>
          {renderPanelContent()}
        </Styled.Panel>
      </Styled.Body>
    </Styled.Shell>
  );
};

export default SkyroomConnectionStatusModal;
