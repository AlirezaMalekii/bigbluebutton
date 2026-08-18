import { useEffect, useState } from 'react';
import { useIsSharedNotesEnabled } from '/imports/ui/services/features';
import {
  getSkyroomNotesFeatureVisible,
  subscribeSkyroomNotesFeatureVisible,
} from './notes-panel-state';
import { isSkyroomColumnLayout } from './panel-toggles';

/** Shared-notes nav/tab/column visibility for SafeMeet column layout. */
const useSkyroomSharedNotesUiVisible = (): boolean => {
  const isSharedNotesCapable = useIsSharedNotesEnabled();
  const [featureVisible, setFeatureVisible] = useState(getSkyroomNotesFeatureVisible);

  useEffect(() => subscribeSkyroomNotesFeatureVisible(setFeatureVisible), []);

  if (!isSkyroomColumnLayout()) {
    return isSharedNotesCapable;
  }

  return isSharedNotesCapable && featureVisible;
};

export default useSkyroomSharedNotesUiVisible;
