import React, {
  useEffect, useLayoutEffect, useReducer, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '../panel-toggles';
import useSkyroomHeaderStatusVisible from '../active-poll-summary/useSkyroomHeaderStatusVisible';
import SkyroomHeaderStatusCluster from '../active-poll-summary/SkyroomHeaderStatusCluster';
import {
  setSkyroomMobileStatusRailActive,
  setSkyroomMobileStatusRailMeasuredHeight,
  subscribeSkyroomMobileStatusRail,
} from '../mobile-status-rail-state';

const SkyroomMobileStatusRail: React.FC = () => {
  const statusVisible = useSkyroomHeaderStatusVisible();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);
  const [layoutMobileOn, setLayoutMobileOn] = useState(() => (
    typeof document !== 'undefined'
      ? Boolean(document.getElementById('layout')?.hasAttribute('data-skyroom-mobile'))
      : false
  ));
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSkyroomMobileStatusRail(force), []);

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

  const showRail = isMobile && isSkyroomColumnLayout() && statusVisible && layoutMobileOn;

  useLayoutEffect(() => {
    if (!showRail) {
      setSkyroomMobileStatusRailActive(false);
      setSkyroomMobileStatusRailMeasuredHeight(0);
      return undefined;
    }

    setSkyroomMobileStatusRailActive(true);

    const rail = railRef.current;
    if (!rail) return undefined;

    const apply = () => {
      const { height } = rail.getBoundingClientRect();
      setSkyroomMobileStatusRailMeasuredHeight(Math.ceil(height));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(rail);
    return () => {
      ro.disconnect();
    };
  }, [showRail, statusVisible]);

  if (!showRail) return null;

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl) return null;

  return createPortal(
    <div
      ref={railRef}
      className="skyroom-mobile-status-rail"
      data-test="skyroom-mobile-status-rail"
    >
      <SkyroomHeaderStatusCluster />
    </div>,
    layoutEl,
  );
};

export default SkyroomMobileStatusRail;
