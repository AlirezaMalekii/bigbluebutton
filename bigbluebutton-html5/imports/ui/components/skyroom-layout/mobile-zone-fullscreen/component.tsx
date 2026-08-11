import React, {
  useCallback, useEffect, useReducer, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { layoutDispatch } from '/imports/ui/components/layout/context';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  openSkyroomMobileBox,
} from '../panel-toggles';
import {
  getSkyroomMobileActiveBox,
  subscribeSkyroomMobileBottom,
  SkyroomMobileBox,
} from '../mobile-bottom-state';
import {
  getSkyroomMobileZoneFullscreen,
  setSkyroomMobileZoneFullscreen,
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
  minimize: {
    id: 'app.skyroom.mobileZoneMinimize.label',
    description: 'Minimize the current mobile box (same as tapping the active tab)',
    defaultMessage: 'Minimize panel',
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
  const layoutContextDispatch = layoutDispatch();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);
  const [activeBox, setActiveBox] = useState(getSkyroomMobileActiveBox);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const expanded = getSkyroomMobileZoneFullscreen();

  const { data: currentUser } = useCurrentUser((u) => ({
    presenter: u.presenter,
  }));
  const isPresenter = Boolean(currentUser?.presenter);

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

  const onMinimizeBottom = useCallback(() => {
    setSkyroomMobileZoneFullscreen(null);
    openSkyroomMobileBox(layoutContextDispatch, null);
  }, [layoutContextDispatch]);

  const onMinimizeTop = useCallback(() => {
    if (getSkyroomMobileZoneFullscreen() === 'top') {
      setSkyroomMobileZoneFullscreen(null);
      return;
    }
    // Same as tapping the active bottom tab to turn it off — stage fills the space.
    openSkyroomMobileBox(layoutContextDispatch, null);
  }, [layoutContextDispatch]);

  if (!isMobile || !isSkyroomColumnLayout()) return null;

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl?.hasAttribute('data-skyroom-mobile')) return null;

  const showTopBtn = layoutEl.getAttribute('data-skyroom-mobile-has-top') === 'true';
  const showBottomBtn = layoutEl.getAttribute('data-skyroom-mobile-has-bottom') === 'true';

  if (!showTopBtn && !showBottomBtn) return null;

  const minimizeLabel = intl.formatMessage(messages.minimize);
  const hasCloseableBox = Boolean(activeBox) || expanded === 'bottom';

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

  const renderMinimizeBtn = (zone: 'top' | 'bottom', onClick: () => void) => (
    <button
      type="button"
      className="skyroom-mobile-zone-fs-btn skyroom-mobile-zone-min-btn"
      data-test={zone === 'top' ? 'skyroomMobileMinimizeTop' : 'skyroomMobileMinimizeBottom'}
      aria-label={minimizeLabel}
      title={minimizeLabel}
      onClick={onClick}
    >
      <Icon iconName="minus" />
    </button>
  );

  const renderCluster = (
    zone: 'top' | 'bottom',
    onFs: () => void,
    onMin: () => void,
    classSuffix: string,
    inHeader = false,
    showMinimize = true,
  ) => (
    <div
      className={[
        'skyroom-mobile-zone-fs-cluster',
        `skyroom-mobile-zone-fs-cluster--${classSuffix}`,
        inHeader ? 'skyroom-mobile-zone-fs-cluster--in-header' : '',
      ].filter(Boolean).join(' ')}
      data-test={zone === 'top' ? 'skyroomMobileTopZoneControls' : 'skyroomMobileBottomZoneControls'}
    >
      {showMinimize ? renderMinimizeBtn(zone, onMin) : null}
      {renderFsBtn(zone, onFs)}
    </div>
  );

  const showTopForUser = showTopBtn && !isPresenter && expanded !== 'bottom';
  const bottomInHeader = Boolean(headerSlot);
  const showBottomForUser = showBottomBtn && expanded !== 'top';
  const showTopMinimize = hasCloseableBox || expanded === 'top';

  return (
    <>
      {showTopForUser && layoutEl && createPortal(
        renderCluster('top', onTopFs, onMinimizeTop, 'top', false, showTopMinimize),
        layoutEl,
      )}
      {showBottomForUser && bottomInHeader && headerSlot && createPortal(
        renderCluster('bottom', onBottomFs, onMinimizeBottom, 'bottom', true, true),
        headerSlot,
      )}
      {showBottomForUser && !bottomInHeader && layoutEl && createPortal(
        renderCluster('bottom', onBottomFs, onMinimizeBottom, 'bottom', false, true),
        layoutEl,
      )}
    </>
  );
};

export default SkyroomMobileZoneFullscreenButtons;
