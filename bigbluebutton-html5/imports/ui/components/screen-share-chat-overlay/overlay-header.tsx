import React, { useCallback } from 'react';
import { useReactiveVar } from '@apollo/client';
import { defineMessages, useIntl } from 'react-intl';
import {
  getExternalOverlayWindow,
  closeOverlay,
  showOverlay,
  toggleCompactOverlay,
  overlayVisibilityVar,
  rememberOverlayPosition,
} from './service';
import {
  OverlayHeader,
  DragHandle,
  DragGrip,
  HeaderTitle,
  HeaderActions,
  HeaderButton,
  CollapsedHint,
} from './styles';

const intlMessages = defineMessages({
  title: {
    id: 'app.screenShareChatOverlay.title',
    description: 'Screen share floating chat title',
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
});

interface OverlayHeaderBarProps {
  isRTL: boolean;
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

const OverlayHeaderBar: React.FC<OverlayHeaderBarProps> = ({ isRTL }) => {
  const intl = useIntl();
  const visibility = useReactiveVar(overlayVisibilityVar);
  const collapsed = visibility === 'hidden';
  const compact = visibility === 'compact';

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;

    const externalWindow = getExternalOverlayWindow();
    if (!externalWindow || externalWindow.closed) return;

    event.preventDefault();
    attachWindowDrag(event, externalWindow);
  }, []);

  const title = intl.formatMessage(intlMessages.title);

  return (
    <OverlayHeader
      $isRTL={isRTL}
      $collapsed={collapsed}
      onPointerDown={handlePointerDown}
      role="toolbar"
      aria-label={title}
    >
      <DragHandle aria-label={intl.formatMessage(intlMessages.dragHandle)}>
        <DragGrip aria-hidden />
        <HeaderTitle>{title}</HeaderTitle>
        {collapsed && (
          <CollapsedHint>
            {intl.formatMessage(intlMessages.collapsedHint)}
          </CollapsedHint>
        )}
      </DragHandle>
      <HeaderActions $isRTL={isRTL}>
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
