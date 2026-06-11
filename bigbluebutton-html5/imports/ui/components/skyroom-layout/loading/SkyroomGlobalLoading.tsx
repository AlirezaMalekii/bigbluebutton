import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomLoadingScreen from './SkyroomLoadingScreen';
import {
  isSkyroomLoadingActive,
  subscribeSkyroomLoading,
} from './skyroom-loading-controller';

/** Single persistent overlay — prevents bootstrap flicker between loading phases. */
const SkyroomGlobalLoading: React.FC = () => {
  const [active, setActive] = useState(() => isSkyroomLoadingActive());

  useEffect(() => subscribeSkyroomLoading(setActive), []);

  if (!isSkyroomTheme() || !active) return null;

  return createPortal(<SkyroomLoadingScreen />, document.body);
};

export default SkyroomGlobalLoading;
