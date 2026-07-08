import React, { useCallback, useEffect, useRef } from 'react';
import { useReactiveVar } from '@apollo/client';
import { useIntl } from 'react-intl';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import { useIsSharing } from '/imports/ui/components/screenshare/service';
import { notify } from '/imports/ui/services/notification';
import useCurrentLocale from '/imports/ui/core/local-states/useCurrentLocale';
import { setupOverlayRenderer } from './overlay-root';
import {
  closeOverlayOnScreenshareEnd,
  focusOverlay,
  getOverlayVisibility,
  isOverlayOpen,
  openOverlay,
  overlayVisibilityVar,
} from './service';

let rendererRegistered = false;

const ensureRendererRegistered = (): void => {
  if (rendererRegistered) return;
  setupOverlayRenderer();
  rendererRegistered = true;
};

const ScreenShareChatOverlayContainer: React.FC = () => {
  const intl = useIntl();
  const [currentLocale] = useCurrentLocale();
  const isSharing = useIsSharing();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const autoOpenAttemptedRef = useRef(false);
  const wasSharingRef = useRef(false);

  const buildOpenOptions = useCallback(() => ({
    isRTL,
    locale: currentLocale,
    messages: intl.messages as Record<string, string>,
  }), [currentLocale, intl.messages, isRTL]);

  const handleOpenOverlay = useCallback(async () => {
    ensureRendererRegistered();
    const opened = await openOverlay(buildOpenOptions());
    if (!opened) {
      notify(intl.formatMessage({
        id: 'app.screenShareChatOverlay.openFailed',
        description: 'Toast when floating chat overlay cannot be opened',
      }), 'warning', 'main', 5000);
    }
    return opened;
  }, [buildOpenOptions, intl]);

  useEffect(() => {
    ensureRendererRegistered();
  }, []);

  useEffect(() => {
    const handleExternalClose = () => {
      overlayVisibilityVar('closed');
    };

    window.addEventListener('bbb-screen-share-chat-overlay-closed', handleExternalClose);
    return () => {
      window.removeEventListener('bbb-screen-share-chat-overlay-closed', handleExternalClose);
    };
  }, []);

  useEffect(() => {
    if (isSharing && !wasSharingRef.current) {
      autoOpenAttemptedRef.current = false;
    }

    if (!isSharing && wasSharingRef.current) {
      closeOverlayOnScreenshareEnd();
      autoOpenAttemptedRef.current = false;
    }

    wasSharingRef.current = isSharing;
  }, [isSharing]);

  useEffect(() => {
    if (!isSharing || autoOpenAttemptedRef.current || isOverlayOpen()) return;

    autoOpenAttemptedRef.current = true;

    handleOpenOverlay().then((opened) => {
      if (!opened) {
        notify(intl.formatMessage({
          id: 'app.screenShareChatOverlay.promptOpen',
          description: 'Prompt to manually open floating chat during screen share',
        }), 'info', 'chat', 8000);
      }
    });
  }, [handleOpenOverlay, intl, isSharing]);

  return null;
};

export const useScreenShareChatOverlayControls = () => {
  const intl = useIntl();
  const [currentLocale] = useCurrentLocale();
  const isSharing = useIsSharing();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const overlayVisibility = useReactiveVar(overlayVisibilityVar);

  const buildOpenOptions = useCallback(() => ({
    isRTL,
    locale: currentLocale,
    messages: intl.messages as Record<string, string>,
  }), [currentLocale, intl.messages, isRTL]);

  const open = useCallback(async () => {
    ensureRendererRegistered();
    return openOverlay(buildOpenOptions());
  }, [buildOpenOptions]);

  const reopen = useCallback(async () => {
    ensureRendererRegistered();
    const { reopenOverlay } = await import('./service');
    return reopenOverlay(buildOpenOptions());
  }, [buildOpenOptions]);

  return {
    isSharing,
    overlayVisibility,
    isOverlayOpen: isOverlayOpen(),
    open,
    reopen,
    focus: focusOverlay,
    getOverlayVisibility,
  };
};

export default ScreenShareChatOverlayContainer;
