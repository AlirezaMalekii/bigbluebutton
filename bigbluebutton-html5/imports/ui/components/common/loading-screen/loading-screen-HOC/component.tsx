import React from 'react';
import LoadingScreen from '../component';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import useSkyroomLoadingSource from '/imports/ui/components/skyroom-layout/loading/useSkyroomLoadingSource';

interface LoadingContent {
  isLoading: boolean;
}

interface LoadingContextContent extends LoadingContent {
  setLoading: (isLoading: boolean) => void;
}

export const LoadingContext = React.createContext<LoadingContextContent>({
  isLoading: false,
  setLoading: () => { },
});

interface LoadingScreenHOCProps {
  children: React.ReactNode;
}

const LoadingScreenHOC: React.FC<LoadingScreenHOCProps> = ({
  children,
}) => {
  const skyroomTheme = isSkyroomTheme();
  const [loading, setLoading] = React.useState<LoadingContent>({
    // Skyroom keeps the overlay up until join completes; connection starts immediately.
    isLoading: skyroomTheme,
  });

  useSkyroomLoadingSource('connection', skyroomTheme && loading.isLoading);

  return (
    <LoadingContext.Provider value={{
      isLoading: loading.isLoading,
      setLoading: (isLoading: boolean) => {
        setLoading({
          isLoading,
        });
      },
    }}
    >
      {loading.isLoading && !skyroomTheme ? (
        <LoadingScreen />
      ) : null}
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingScreenHOC;
