import { useEffect, useState } from 'react';
import Session from '/imports/ui/services/storage/in-memory';
import {
  isSkyroomMobileViewport,
  isSkyroomTheme,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import useSkyroomLoadingSource from './useSkyroomLoadingSource';

/** Never block join longer than this — avoids a stuck overlay if layout races. */
const MOBILE_LAYOUT_GATE_MAX_MS = 4000;

const isMobileLayoutReady = (): boolean => {
  if (!isSkyroomMobileViewport() || !isSkyroomTheme()) return true;
  const layoutEl = document.getElementById('layout');
  if (!layoutEl?.hasAttribute('data-skyroom-column')) return false;
  if (!Session.equals('layoutReady', true)) return false;
  return layoutEl.hasAttribute('data-skyroom-mobile');
};

/**
 * Keeps the global Skyroom loading overlay up on phone until the mobile split
 * engine has tagged #layout and layoutReady is true — avoids a flash of desktop
 * panel geometry in the wrong place.
 */
const useSkyroomMobileLayoutLoading = (): void => {
  const [ready, setReady] = useState(isMobileLayoutReady);

  useEffect(() => {
    if (isMobileLayoutReady()) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    const sync = () => {
      if (!cancelled && isMobileLayoutReady()) {
        setReady(true);
      }
    };

    sync();
    const interval = window.setInterval(sync, 50);
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, MOBILE_LAYOUT_GATE_MAX_MS);

    const layoutEl = document.getElementById('layout');
    const observer = layoutEl
      ? new MutationObserver(sync)
      : null;
    if (layoutEl) {
      observer?.observe(layoutEl, {
        attributes: true,
        attributeFilter: ['data-skyroom-mobile', 'data-skyroom-column'],
      });
    }
    window.addEventListener('resize', sync);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(failSafe);
      observer?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  const gateActive = isSkyroomTheme()
    && isSkyroomMobileViewport()
    && !ready;

  useSkyroomLoadingSource('mobileLayout', gateActive);
};

export default useSkyroomMobileLayoutLoading;
