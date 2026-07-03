import React, { useEffect, useState } from 'react';
import Presentation from 'components/presentation';
import TldrawPresentationV2 from './index';
import { preloadTldrawAssets } from 'utils/tldrawAssets';

const TldrawPresentationV2WithFallback = (props) => {
  const [ready, setReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    preloadTldrawAssets()
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setUseFallback(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUseFallback(true);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <Presentation />;
  }

  if (useFallback) {
    return <Presentation />;
  }

  return <TldrawPresentationV2 {...props} />;
};

export default TldrawPresentationV2WithFallback;
