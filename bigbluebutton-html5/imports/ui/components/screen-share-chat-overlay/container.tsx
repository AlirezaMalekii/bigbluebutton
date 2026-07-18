import React, { useCallback, useEffect, useRef } from 'react';
import { useReactiveVar } from '@apollo/client';
import { useIntl } from 'react-intl';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import {
  CONTENT_TYPE_CAMERA,
  CONTENT_TYPE_SCREENSHARE,
  useCameraAsContentDeviceIdType,
  useIsSharing,
  useSharingContentType,
} from '/imports/ui/components/screenshare/service';
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

const useIsLocalScreenShareActive = (): boolean => {
  const isSharing = useIsSharing();
  const sharingContentType = useSharingContentType();
  const cameraAsContentDeviceId = useCameraAsContentDeviceIdType();

  // Never treat camera-as-content as screen share (floating chat is screenshare-only).
  if (cameraAsContentDeviceId || String(sharingContentType) === CONTENT_TYPE_CAMERA) {
    return false;
  }

  return isSharing && String(sharingContentType) === CONTENT_TYPE_SCREENSHARE;
};

const ScreenShareChatOverlayContainer: React.FC = () => {
  const intl = useIntl();
  const [currentLocale] = useCurrentLocale();
  const isLocalScreenShareActive = useIsLocalScreenShareActive();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const wasSharingRef = useRef(false);
  const autoOpenAttemptedRef = useRef(false);

  const buildOpenOptions = useCallback(() => ({
    isRTL,
    locale: currentLocale,
    messages: intl.messages as Record<string, string>,
  }), [currentLocale, intl.messages, isRTL]);

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
    if (isLocalScreenShareActive && !wasSharingRef.current) {
      autoOpenAttemptedRef.current = false;
    }

    if (!isLocalScreenShareActive && wasSharingRef.current) {
      closeOverlayOnScreenshareEnd();
      autoOpenAttemptedRef.current = false;
    }

    wasSharingRef.current = isLocalScreenShareActive;
  }, [isLocalScreenShareActive]);

  useEffect(() => {
    if (!isLocalScreenShareActive || autoOpenAttemptedRef.current || isOverlayOpen()) {
      return undefined;
    }

    autoOpenAttemptedRef.current = true;

    // Delay slightly so getDisplayMedia / bridge settle before opening PiP/popup.
    const timer = window.setTimeout(() => {
      openOverlay(buildOpenOptions()).then((opened) => {
        if (!opened) {
          notify(intl.formatMessage({
            id: 'app.screenShareChatOverlay.promptOpen',
            description: 'Prompt to manually open floating chat during screen share',
          }), 'info', 'chat', 8000);
        }
      });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [buildOpenOptions, intl, isLocalScreenShareActive]);

  return null;
};

export const useScreenShareChatOverlayControls = () => {
  const intl = useIntl();
  const [currentLocale] = useCurrentLocale();
  const isLocalScreenShareActive = useIsLocalScreenShareActive();
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
    isSharing: isLocalScreenShareActive,
    overlayVisibility,
    isOverlayOpen: isOverlayOpen(),
    open,
    reopen,
    focus: focusOverlay,
    getOverlayVisibility,
  };
};

export default ScreenShareChatOverlayContainer;
