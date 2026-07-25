import React, { useCallback } from 'react';
import { useReactiveVar } from '@apollo/client';
import { defineMessages, useIntl } from 'react-intl';
import { OverlayTab } from './types';
import {
  getExternalOverlayWindow,
  closeOverlay,
  showOverlay,
  toggleCompactOverlay,
  overlayVisibilityVar,
  overlaySelfWebcamEnabledVar,
  rememberOverlayPosition,
} from './service';
import {
  OverlayHeader,
  DragHandle,
  DragGrip,
  HeaderTabs,
  HeaderTabButton,
  HeaderActions,
  HeaderButton,
  CollapsedHint,
} from './styles';

const intlMessages = defineMessages({
  title: {
    id: 'app.screenShareChatOverlay.title',
    description: 'Screen share floating chat title',
  },
  usersTab: {
    id: 'app.screenShareChatOverlay.usersTab',
    description: 'Users tab label in floating overlay header',
  },
  close: {
    id: 'app.screenShareChatOverlay.close',
    description: 'Close floating chat overlay',
  },
  restore: {
    id: 'app.screenShareChatOverlay.restore',
    description: 'Restore floating chat overlay from hidden',
  },
  compact: {
    id: 'app.screenShareChatOverlay.compact',
    description: 'Shrink floating chat to compact size',
  },
  expand: {
    id: 'app.screenShareChatOverlay.expand',
    description: 'Expand floating chat to full size',
  },
  collapsedHint: {
    id: 'app.screenShareChatOverlay.collapsedHint',
    description: 'Hint shown when overlay is collapsed',
  },
  dragHandle: {
    id: 'app.screenShareChatOverlay.dragHandle',
    description: 'Drag handle label for floating chat overlay',
  },
  showSelfWebcam: {
    id: 'app.screenShareChatOverlay.showSelfWebcam',
    description: 'Show presenter webcam above floating overlay',
  },
  hideSelfWebcam: {
    id: 'app.screenShareChatOverlay.hideSelfWebcam',
    description: 'Hide presenter webcam above floating overlay',
  },
  selfWebcamUnavailable: {
    id: 'app.screenShareChatOverlay.selfWebcamToggleUnavailable',
    description: 'Webcam toggle disabled because local camera is off',
  },
});

interface OverlayHeaderBarProps {
  isRTL: boolean;
  activeTab: OverlayTab;
  onTabChange: (tab: OverlayTab) => void;
  hasLocalWebcam: boolean;
}

const attachWindowDrag = (
  event: React.PointerEvent<HTMLElement>,
  win: Window,
): void => {
  const startScreenX = event.screenX;
  const startScreenY = event.screenY;
  const startWinX = win.screenX;
  const startWinY = win.screenY;
  const dragDoc = win.document;

  const onPointerMove = (moveEvent: PointerEvent) => {
    win.moveTo(
      startWinX + (moveEvent.screenX - startScreenX),
      startWinY + (moveEvent.screenY - startScreenY),
    );
  };

  const onPointerUp = () => {
    rememberOverlayPosition();
    dragDoc.removeEventListener('pointermove', onPointerMove);
    dragDoc.removeEventListener('pointerup', onPointerUp);
    dragDoc.removeEventListener('pointercancel', onPointerUp);
  };

  dragDoc.addEventListener('pointermove', onPointerMove);
  dragDoc.addEventListener('pointerup', onPointerUp);
  dragDoc.addEventListener('pointercancel', onPointerUp);
};

const OverlayHeaderBar: React.FC<OverlayHeaderBarProps> = ({
  isRTL,
  activeTab,
  onTabChange,
  hasLocalWebcam,
}) => {
  const intl = useIntl();
  const visibility = useReactiveVar(overlayVisibilityVar);
  const selfWebcamEnabled = useReactiveVar(overlaySelfWebcamEnabledVar);
  const collapsed = visibility === 'hidden';
  const compact = visibility === 'compact';

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;

    const externalWindow = getExternalOverlayWindow();
    if (!externalWindow || externalWindow.closed) return;

    event.preventDefault();
    attachWindowDrag(event, externalWindow);
  }, []);

  const chatLabel = intl.formatMessage(intlMessages.title);
  const usersLabel = intl.formatMessage(intlMessages.usersTab);
  const webcamToggleLabel = !hasLocalWebcam
    ? intl.formatMessage(intlMessages.selfWebcamUnavailable)
    : intl.formatMessage(
      selfWebcamEnabled ? intlMessages.hideSelfWebcam : intlMessages.showSelfWebcam,
    );

  return (
    <OverlayHeader
      $isRTL={isRTL}
      $collapsed={collapsed}
      onPointerDown={handlePointerDown}
      role="toolbar"
      aria-label={chatLabel}
    >
      <DragHandle aria-label={intl.formatMessage(intlMessages.dragHandle)}>
        <DragGrip aria-hidden />
        {!collapsed && (
          <HeaderTabs role="tablist" aria-label={chatLabel}>
            <HeaderTabButton
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              $active={activeTab === 'chat'}
              data-test="screenShareChatOverlayTabChat"
              onClick={() => onTabChange('chat')}
            >
              {chatLabel}
            </HeaderTabButton>
            <HeaderTabButton
              type="button"
              role="tab"
              aria-selected={activeTab === 'users'}
              $active={activeTab === 'users'}
              data-test="screenShareChatOverlayTabUsers"
              onClick={() => onTabChange('users')}
            >
              {usersLabel}
            </HeaderTabButton>
          </HeaderTabs>
        )}
        {collapsed && (
          <CollapsedHint>
            {intl.formatMessage(intlMessages.collapsedHint)}
          </CollapsedHint>
        )}
      </DragHandle>
      <HeaderActions $isRTL={isRTL}>
        {!collapsed && (
          <HeaderButton
            type="button"
            aria-label={webcamToggleLabel}
            title={webcamToggleLabel}
            aria-pressed={selfWebcamEnabled && hasLocalWebcam}
            $active={selfWebcamEnabled && hasLocalWebcam}
            $disabledLook={!hasLocalWebcam}
            disabled={!hasLocalWebcam}
            data-test="screenShareChatOverlaySelfWebcamToggle"
            onClick={() => overlaySelfWebcamEnabledVar(!selfWebcamEnabled)}
          >
            <span aria-hidden style={{ display: 'inline-flex' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="2.5"
                  y="6"
                  width="13.5"
                  height="12"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill={selfWebcamEnabled && hasLocalWebcam ? 'currentColor' : 'none'}
                  opacity={selfWebcamEnabled && hasLocalWebcam ? 0.28 : 1}
                />
                <path
                  d="M16.5 10.2L21 7.5v9l-4.5-2.7v-3.6z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  fill={selfWebcamEnabled && hasLocalWebcam ? 'currentColor' : 'none'}
                  opacity={selfWebcamEnabled && hasLocalWebcam ? 0.28 : 1}
                />
                {!selfWebcamEnabled && (
                  <path
                    d="M3.5 4.5L20.5 19.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </span>
          </HeaderButton>
        )}
        {collapsed ? (
          <HeaderButton
            type="button"
            aria-label={intl.formatMessage(intlMessages.restore)}
            title={intl.formatMessage(intlMessages.restore)}
            onClick={() => showOverlay()}
          >
            <span aria-hidden>↗</span>
          </HeaderButton>
        ) : (
          <HeaderButton
            type="button"
            aria-label={intl.formatMessage(
              compact ? intlMessages.expand : intlMessages.compact,
            )}
            title={intl.formatMessage(
              compact ? intlMessages.expand : intlMessages.compact,
            )}
            data-test="screenShareChatOverlayCompact"
            onClick={() => toggleCompactOverlay()}
          >
            <span aria-hidden>{compact ? '↗' : '↙'}</span>
          </HeaderButton>
        )}
        <HeaderButton
          type="button"
          aria-label={intl.formatMessage(intlMessages.close)}
          title={intl.formatMessage(intlMessages.close)}
          onClick={() => closeOverlay()}
        >
          <span aria-hidden>×</span>
        </HeaderButton>
      </HeaderActions>
    </OverlayHeader>
  );
};

export default OverlayHeaderBar;
