import React, { useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import PresentationMenu from './component';
import { layoutSelect, layoutDispatch } from '/imports/ui/components/layout/context';
import { useIsSnapshotOfCurrentSlideEnabled } from '/imports/ui/services/features';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { SKYROOM_MOBILE_ZONE_FS_EVENT } from '/imports/ui/components/skyroom-layout/mobile-zone-fullscreen-state';
import { isPresentationFullscreenActive } from '../presentation-fullscreen';

import {
  persistShape,
} from '/imports/ui/components/whiteboard/service';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';

const PresentationMenuContainer = (props) => {
  const fullscreen = layoutSelect((i) => i.fullscreen);
  const { element: currentElement, group: currentGroup } = fullscreen;
  const layoutContextDispatch = layoutDispatch();
  const { elementId, currentUser } = props;
  const [, forceRender] = useReducer((x) => x + 1, 0);
  const isFullscreen = isPresentationFullscreenActive({
    fullscreenContext: currentElement === elementId,
    currentElement,
    elementId,
  });
  const Settings = getSettingsSingletonInstance();
  const { isRTL } = Settings.application;
  const { pluginsExtensibleAreasAggregatedState } = useContext(PluginsContext);
  let presentationDropdownItems = [];
  if (pluginsExtensibleAreasAggregatedState.presentationDropdownItems) {
    presentationDropdownItems = [
      ...pluginsExtensibleAreasAggregatedState.presentationDropdownItems,
    ];
  }

  const hasWBAccess = currentUser?.whiteboardWriteAccess;

  const meetingInfo = useMeeting((meeting) => ({
    name: meeting?.name,
  }));

  useEffect(() => {
    const onMobileZoneFs = () => forceRender();
    window.addEventListener(SKYROOM_MOBILE_ZONE_FS_EVENT, onMobileZoneFs);
    return () => window.removeEventListener(SKYROOM_MOBILE_ZONE_FS_EVENT, onMobileZoneFs);
  }, []);

  const isIphone = !!(navigator.userAgent.match(/iPhone/i));
  const allowSnapshotOfCurrentSlide = useIsSnapshotOfCurrentSlideEnabled();

  return (
    <PresentationMenu
      {...props}
      {...{
        currentElement,
        currentGroup,
        isFullscreen,
        layoutContextDispatch,
        isRTL,
        presentationDropdownItems,
        hasWBAccess,
        meetingName: meetingInfo?.name,
        isIphone,
        allowSnapshotOfCurrentSlide,
        persistShape,
      }}
    />
  );
};

export default PresentationMenuContainer;

PresentationMenuContainer.propTypes = {
  elementId: PropTypes.string.isRequired,
  currentUser: PropTypes.shape({
    whiteboardWriteAccess: PropTypes.bool,
  }).isRequired,
};
