import React, { useCallback } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import {
  getExternalOverlayWindow,
  hideOverlay,
  closeOverlay,
  showOverlay,
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
  hide: {
    id: 'app.screenShareChatOverlay.hide',
    description: 'Hide floating chat overlay',
  },
  close: {
    id: 'app.screenShareChatOverlay.close',
    description: 'Close floating chat overlay',
  },
  restore: {
    id: 'app.screenShareChatOverlay.restore',
    description: 'Restore floating chat overlay',
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
  collapsed?: boolean;
}

const attachWindowDrag = (
  event: React.PointerEvent<HTMLElement>,
  externalWindow: Window,
): void => {
  const startScreenX = event.screenX;
  const startScreenY = event.screenY;
  const startWinX = externalWindow.screenX;
  const startWinY = externalWindow.screenY;
  const dragDoc = externalWindow.document;

  const onPointerMove = (moveEvent: PointerEvent) => {
    externalWindow.moveTo(
      startWinX + (moveEvent.screenX - startScreenX),
      startWinY + (moveEvent.screenY - startScreenY),
    );
  };

  const onPointerUp = () => {
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
  collapsed = false,
}) => {
  const intl = useIntl();

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
            <Icon iconName="undo" />
          </HeaderButton>
        ) : (
          <HeaderButton
            type="button"
            aria-label={intl.formatMessage(intlMessages.hide)}
            title={intl.formatMessage(intlMessages.hide)}
            onClick={() => hideOverlay()}
          >
            <Icon iconName="minus" />
          </HeaderButton>
        )}
        <HeaderButton
          type="button"
          aria-label={intl.formatMessage(intlMessages.close)}
          title={intl.formatMessage(intlMessages.close)}
          onClick={() => closeOverlay()}
        >
          <Icon iconName="close" />
        </HeaderButton>
      </HeaderActions>
    </OverlayHeader>
  );
};

export default OverlayHeaderBar;
