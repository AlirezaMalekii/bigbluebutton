import React, {
  useEffect, useLayoutEffect, useReducer, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import TalkingIndicator from '/imports/ui/components/nav-bar/nav-bar-graphql/talking-indicator/component';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '../panel-toggles';
import useSkyroomMobileTalkingVisible from './useSkyroomMobileTalkingVisible';
import {
  setSkyroomMobileTalkingRailActive,
  setSkyroomMobileTalkingRailMeasuredHeight,
  subscribeSkyroomMobileTalkingRail,
} from '../mobile-talking-rail-state';

const intlMessages = defineMessages({
  speakersListLabel: {
    id: 'app.navBar.speakersListLabel',
    description: 'Label for speakers list',
  },
});

const SkyroomMobileTalkingRail: React.FC = () => {
  const intl = useIntl();
  const talkingVisible = useSkyroomMobileTalkingVisible();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);
  const [layoutMobileOn, setLayoutMobileOn] = useState(() => (
    typeof document !== 'undefined'
      ? Boolean(document.getElementById('layout')?.hasAttribute('data-skyroom-mobile'))
      : false
  ));
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSkyroomMobileTalkingRail(force), []);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const layoutEl = document.getElementById('layout');
    if (!layoutEl) return undefined;

    const sync = () => {
      setLayoutMobileOn(layoutEl.hasAttribute('data-skyroom-mobile'));
    };

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(layoutEl, { attributes: true, attributeFilter: ['data-skyroom-mobile'] });
    return () => mo.disconnect();
  }, []);

  const showRail = isMobile && isSkyroomColumnLayout() && talkingVisible && layoutMobileOn;

  useLayoutEffect(() => {
    if (!showRail) {
      setSkyroomMobileTalkingRailActive(false);
      setSkyroomMobileTalkingRailMeasuredHeight(0);
      return undefined;
    }

    setSkyroomMobileTalkingRailActive(true);

    const rail = railRef.current;
    if (!rail) return undefined;

    const apply = () => {
      setSkyroomMobileTalkingRailMeasuredHeight(28);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(rail);
    return () => {
      ro.disconnect();
    };
  }, [showRail, talkingVisible]);

  if (!showRail) return null;

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl) return null;

  return createPortal(
    <div
      ref={railRef}
      className="skyroom-mobile-talking-rail"
      data-test="skyroom-mobile-talking-rail"
    >
      <h2 className="sr-only">{intl.formatMessage(intlMessages.speakersListLabel)}</h2>
      <div data-test="skyroom-talking-rail">
        <TalkingIndicator />
      </div>
    </div>,
    layoutEl,
  );
};

export default SkyroomMobileTalkingRail;
