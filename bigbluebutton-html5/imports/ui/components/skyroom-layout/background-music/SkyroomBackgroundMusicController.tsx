import React from 'react';
import { isSkyroomTheme } from '../panel-toggles';
import SkyroomBackgroundMusicModal from './SkyroomBackgroundMusicModal';
import SkyroomBackgroundMusicPlayer from './SkyroomBackgroundMusicPlayer';
import useSkyroomBackgroundMusicSync from './useSkyroomBackgroundMusicSync';

const SkyroomBackgroundMusicController: React.FC = () => {
  const { enabled } = useSkyroomBackgroundMusicSync();
  if (!enabled || !isSkyroomTheme()) return null;

  return (
    <>
      <SkyroomBackgroundMusicPlayer />
      <SkyroomBackgroundMusicModal />
    </>
  );
};

export default SkyroomBackgroundMusicController;
