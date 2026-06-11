import { useLayoutEffect } from 'react';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import { setSkyroomLoadingSource } from './skyroom-loading-controller';

/**
 * Registers a named bootstrap loading phase for the Skyroom global overlay.
 * Updates synchronously during render so adjacent phases never leave a gap.
 */
const useSkyroomLoadingSource = (source: string, active: boolean): void => {
  const skyroomTheme = isSkyroomTheme();

  if (skyroomTheme) {
    setSkyroomLoadingSource(source, active);
  }

  useLayoutEffect(() => {
    if (!skyroomTheme) return undefined;

    setSkyroomLoadingSource(source, active);
    return () => setSkyroomLoadingSource(source, false);
  }, [source, active, skyroomTheme]);
};

export default useSkyroomLoadingSource;
