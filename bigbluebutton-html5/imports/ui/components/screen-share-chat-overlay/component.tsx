import React, { useEffect, useState } from 'react';
import { useReactiveVar } from '@apollo/client';
import OverlayChatMessages from './overlay-chat-messages';
import OverlayChatForm from './overlay-chat-form';
import OverlayHeaderBar from './overlay-header';
import OverlaySelfWebcam from './overlay-self-webcam';
import OverlayUsersPanel from './overlay-users-panel';
import {
  overlayVisibilityVar,
  overlaySelfWebcamEnabledVar,
  syncOverlayWindowSize,
} from './service';
import { OverlayTab } from './types';
import { useHasVideoStream } from '/imports/ui/components/video-provider/hooks';
import {
  OverlayFrame,
  OverlayShell,
  OverlayBody,
  OverlayChatPanel,
} from './styles';

interface ScreenShareChatOverlayPanelProps {
  isRTL: boolean;
}

const ScreenShareChatOverlayPanel: React.FC<ScreenShareChatOverlayPanelProps> = ({
  isRTL,
}) => {
  const visibility = useReactiveVar(overlayVisibilityVar);
  const selfWebcamEnabled = useReactiveVar(overlaySelfWebcamEnabledVar);
  const hasLocalWebcam = useHasVideoStream();
  const [activeTab, setActiveTab] = useState<OverlayTab>('chat');
  const [usersTabVisited, setUsersTabVisited] = useState(false);
  const collapsed = visibility === 'hidden';
  const compact = visibility === 'compact';
  const showSelfWebcam = !collapsed
    && visibility === 'open'
    && selfWebcamEnabled
    && hasLocalWebcam;

  useEffect(() => {
    syncOverlayWindowSize(showSelfWebcam);
  }, [showSelfWebcam, visibility]);

  const handleTabChange = (tab: OverlayTab) => {
    if (tab === 'users') setUsersTabVisited(true);
    setActiveTab(tab);
  };

  return (
    <OverlayFrame $isRTL={isRTL}>
      {showSelfWebcam && <OverlaySelfWebcam />}
      <OverlayShell
        $isRTL={isRTL}
        $compact={compact}
        data-test="screenShareChatOverlay"
      >
        <OverlayHeaderBar
          isRTL={isRTL}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasLocalWebcam={hasLocalWebcam}
        />
        {!collapsed && (
          <OverlayBody $compact={compact}>
            <OverlayChatPanel
              $isRTL={isRTL}
              $compact={compact}
              style={{ display: activeTab === 'chat' ? 'flex' : 'none' }}
              aria-hidden={activeTab !== 'chat'}
            >
              <OverlayChatMessages compact={compact} />
              {!compact && <OverlayChatForm isRTL={isRTL} />}
            </OverlayChatPanel>
            {usersTabVisited && (
              <div
                style={{
                  display: activeTab === 'users' ? 'flex' : 'none',
                  flex: 1,
                  minHeight: 0,
                  flexDirection: 'column',
                }}
                aria-hidden={activeTab !== 'users'}
              >
                <OverlayUsersPanel />
              </div>
            )}
          </OverlayBody>
        )}
      </OverlayShell>
    </OverlayFrame>
  );
};

export default ScreenShareChatOverlayPanel;
