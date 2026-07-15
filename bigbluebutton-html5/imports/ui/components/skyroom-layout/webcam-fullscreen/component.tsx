import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import { layoutDispatch, layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import { exitWebcamFullscreen } from './webcam-fullscreen';

const messages = defineMessages({
  close: {
    id: 'app.videoDock.webcamExitFullscreenLabel',
    description: 'Exit fullscreen webcam',
  },
});

const SkyroomWebcamFullscreenController: React.FC = () => {
  const intl = useIntl();
  const fullscreen = layoutSelect((i: Layout) => i.fullscreen);
  const layoutContextDispatch = layoutDispatch();
  const isActive = fullscreen.group === 'webcams' && Boolean(fullscreen.element);

  const handleExit = useCallback(() => {
    exitWebcamFullscreen(layoutContextDispatch);
  }, [layoutContextDispatch]);

  useEffect(() => {
    const layoutEl = document.getElementById('layout');
    if (!layoutEl) return undefined;

    if (isActive) {
      layoutEl.setAttribute('data-skyroom-webcam-fullscreen', fullscreen.element);
    } else {
      layoutEl.removeAttribute('data-skyroom-webcam-fullscreen');
    }

    return () => {
      layoutEl.removeAttribute('data-skyroom-webcam-fullscreen');
    };
  }, [isActive, fullscreen.element]);

  useEffect(() => {
    if (!isActive) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      handleExit();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isActive, handleExit]);

  if (!isActive) return null;

  const label = intl.formatMessage(messages.close);

  return createPortal(
    <button
      type="button"
      className="skyroom-webcam-fs-close"
      data-test="skyroomWebcamFullscreenClose"
      aria-label={label}
      title={label}
      onClick={handleExit}
    >
      <Icon iconName="close" />
    </button>,
    document.body,
  );
};

export default SkyroomWebcamFullscreenController;
