import React, {
  useCallback, useEffect, useReducer, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '../panel-toggles';
import {
  getSkyroomMobileActiveBox,
  subscribeSkyroomMobileBottom,
  SkyroomMobileBox,
} from '../mobile-bottom-state';
import {
  getSkyroomMobileZoneFullscreen,
  subscribeSkyroomMobileZoneFullscreen,
  toggleSkyroomMobileZoneFullscreen,
} from '../mobile-zone-fullscreen-state';

const messages = defineMessages({
  expandTop: {
    id: 'app.skyroom.mobileZoneFullscreen.expandTop',
    description: 'Expand the top stage box on mobile',
    defaultMessage: 'Expand stage',
  },
  expandBottom: {
    id: 'app.skyroom.mobileZoneFullscreen.expandBottom',
    description: 'Expand the bottom panel box on mobile',
    defaultMessage: 'Expand panel',
  },
  collapse: {
    id: 'app.skyroom.mobileZoneFullscreen.collapse',
    description: 'Exit expanded mobile zone view',
    defaultMessage: 'Exit expanded view',
  },
});

const bottomHeaderSlot = (activeBox: SkyroomMobileBox | undefined): HTMLElement | null => {
  if (activeBox === 'chat') {
    return document.querySelector('[data-test="skyroom-chat-header-options"]');
  }
  if (activeBox === 'users') {
    return document.querySelector('[data-test="user-management-options"]');
  }
  if (activeBox === 'notes') {
    return document.querySelector('[data-test="sharedNotesHeaderOptions"]');
  }
  return null;
};

const SkyroomMobileZoneFullscreenButtons: React.FC = () => {
  const intl = useIntl();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);
  const [activeBox, setActiveBox] = useState(getSkyroomMobileActiveBox);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const expanded = getSkyroomMobileZoneFullscreen();

  useEffect(() => subscribeSkyroomMobileZoneFullscreen(force), []);
  useEffect(() => subscribeSkyroomMobileBottom(() => {
    setActiveBox(getSkyroomMobileActiveBox());
  }), []);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Resolve the header portal host without observing #layout subtree.
  // A childList+subtree MutationObserver previously flooded setState during
  // webcam↔chat switches (video DOM + layout attr churn) and froze mobile Chrome.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let raf = 0;

    const sync = () => {
      if (cancelled) return;
      const slot = bottomHeaderSlot(activeBox);
      setHeaderSlot((prev) => (prev === slot ? prev : slot));
      // Chat/users headers mount a frame or two after the tab switch.
      if (!slot && (activeBox === 'chat' || activeBox === 'users' || activeBox === 'notes')
        && tries < 12) {
        tries += 1;
        raf = window.requestAnimationFrame(sync);
      }
    };

    sync();
    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [activeBox]);

  const onTopFs = useCallback(() => toggleSkyroomMobileZoneFullscreen('top'), []);
  const onBottomFs = useCallback(() => toggleSkyroomMobileZoneFullscreen('bottom'), []);

  if (!isMobile || !isSkyroomColumnLayout()) return null;

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl?.hasAttribute('data-skyroom-mobile')) return null;

  const showTopBtn = layoutEl.getAttribute('data-skyroom-mobile-has-top') === 'true';
  const showBottomBtn = layoutEl.getAttribute('data-skyroom-mobile-has-bottom') === 'true';

  if (!showTopBtn && !showBottomBtn) return null;

  const renderFsBtn = (
    zone: 'top' | 'bottom',
    onClick: () => void,
  ) => {
    const isExpanded = expanded === zone;
    const label = isExpanded
      ? intl.formatMessage(messages.collapse)
      : intl.formatMessage(zone === 'top' ? messages.expandTop : messages.expandBottom);

    return (
      <button
        type="button"
        className={[
          'skyroom-mobile-zone-fs-btn',
          isExpanded ? 'is-expanded' : '',
        ].filter(Boolean).join(' ')}
        data-test={zone === 'top' ? 'skyroomMobileExpandTop' : 'skyroomMobileExpandBottom'}
        aria-label={label}
        aria-pressed={isExpanded}
        title={label}
        onClick={onClick}
      >
        <Icon iconName={isExpanded ? 'exit_fullscreen' : 'fullscreen'} />
      </button>
    );
  };

  const renderCluster = (
    zone: 'top' | 'bottom',
    onFs: () => void,
    classSuffix: string,
    inHeader = false,
  ) => (
    <div
      className={[
        'skyroom-mobile-zone-fs-cluster',
        `skyroom-mobile-zone-fs-cluster--${classSuffix}`,
        inHeader ? 'skyroom-mobile-zone-fs-cluster--in-header' : '',
      ].filter(Boolean).join(' ')}
      data-test={zone === 'top' ? 'skyroomMobileTopZoneControls' : 'skyroomMobileBottomZoneControls'}
    >
      {renderFsBtn(zone, onFs)}
    </div>
  );

  const showTopForUser = showTopBtn && expanded !== 'bottom';
  const bottomInHeader = Boolean(headerSlot);
  const showBottomForUser = showBottomBtn && expanded !== 'top';
  return (
    <>
      {showTopForUser && layoutEl && createPortal(
        renderCluster('top', onTopFs, 'top'),
        layoutEl,
      )}
      {showBottomForUser && bottomInHeader && headerSlot && createPortal(
        renderCluster('bottom', onBottomFs, 'bottom', true),
        headerSlot,
      )}
      {showBottomForUser && !bottomInHeader && layoutEl && createPortal(
        renderCluster('bottom', onBottomFs, 'bottom'),
        layoutEl,
      )}
    </>
  );
};

export default SkyroomMobileZoneFullscreenButtons;
