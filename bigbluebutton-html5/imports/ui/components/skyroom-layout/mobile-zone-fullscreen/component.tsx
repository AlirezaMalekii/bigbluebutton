import React, {
  useCallback, useEffect, useReducer, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
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

const bottomHeaderSlot = (activeBox: SkyroomMobileBox): HTMLElement | null => {
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

  useEffect(() => {
    const sync = () => setHeaderSlot(bottomHeaderSlot(activeBox));
    sync();
    const layoutEl = document.getElementById('layout');
    const mo = layoutEl
      ? new MutationObserver(sync)
      : null;
    if (layoutEl && mo) {
      mo.observe(layoutEl, { childList: true, subtree: true, attributes: true });
    }
    window.addEventListener('resize', sync);
    return () => {
      mo?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [activeBox]);

  const onTop = useCallback(() => toggleSkyroomMobileZoneFullscreen('top'), []);
  const onBottom = useCallback(() => toggleSkyroomMobileZoneFullscreen('bottom'), []);

  if (!isMobile || !isSkyroomColumnLayout()) return null;

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl?.hasAttribute('data-skyroom-mobile')) return null;

  const showTopBtn = layoutEl.getAttribute('data-skyroom-mobile-has-top') === 'true';
  const showBottomBtn = layoutEl.getAttribute('data-skyroom-mobile-has-bottom') === 'true';

  if (!showTopBtn && !showBottomBtn) return null;

  const renderBtn = (
    zone: 'top' | 'bottom',
    onClick: () => void,
    classSuffix: string,
    inHeader = false,
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
          `skyroom-mobile-zone-fs-btn--${classSuffix}`,
          inHeader ? 'skyroom-mobile-zone-fs-btn--in-header' : '',
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

  const showTopForUser = showTopBtn && !isPresenter && expanded !== 'bottom';
  const bottomInHeader = Boolean(headerSlot);
  const showBottomForUser = showBottomBtn && expanded !== 'top';

  return (
    <>
      {showTopForUser && layoutEl && createPortal(
        renderBtn('top', onTop, 'top'),
        layoutEl,
      )}
      {showBottomForUser && bottomInHeader && headerSlot && createPortal(
        renderBtn('bottom', onBottom, 'bottom', true),
        headerSlot,
      )}
      {showBottomForUser && !bottomInHeader && layoutEl && createPortal(
        renderBtn('bottom', onBottom, 'bottom'),
        layoutEl,
      )}
    </>
  );
};

export default SkyroomMobileZoneFullscreenButtons;
