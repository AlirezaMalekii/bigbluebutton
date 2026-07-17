import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import BreakoutRoomItem from './component';
import { layoutSelectInput, layoutDispatch } from '../../../layout/context';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { ACTIONS, PANELS } from '../../../layout/enums';
import {
  isSkyroomColumnLayout,
  openSkyroomBreakoutPanel,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

const BreakoutRoomContainer = ({ breakoutRoom }) => {
  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const { sidebarContentPanel } = sidebarContent;
  const layoutContextDispatch = layoutDispatch();
  const prevShouldShowRef = useRef(null);

  const {
    data: currentMeeting,
  } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const {
    data: currentUser,
  } = useCurrentUser((u) => ({
    userId: u?.userId,
    isModerator: u?.isModerator,
    breakoutRoomsSummary: u?.breakoutRoomsSummary,
  }));

  const hasBreakoutRoom = currentMeeting?.componentsFlags?.hasBreakoutRoom ?? false;
  const hasInvitation = (
    (currentUser?.breakoutRoomsSummary?.totalOfJoinURL ?? 0) > 0
    || (currentUser?.breakoutRoomsSummary?.totalOfShowInvitation ?? 0) > 0
  );
  const isModerator = currentUser?.isModerator ?? false;
  const shouldShowEntry = hasBreakoutRoom && (hasInvitation || isModerator);

  // Auto-open breakout box/tab when rooms first become available for this user
  // (creator/moderator or assigned invitee) — desktop sidebar + mobile tab.
  useEffect(() => {
    if (!isSkyroomColumnLayout()) {
      prevShouldShowRef.current = shouldShowEntry;
      return undefined;
    }

    if (prevShouldShowRef.current === null) {
      prevShouldShowRef.current = shouldShowEntry;
      return undefined;
    }

    if (shouldShowEntry && !prevShouldShowRef.current) {
      openSkyroomBreakoutPanel(layoutContextDispatch);
    }

    prevShouldShowRef.current = shouldShowEntry;
    return undefined;
  }, [shouldShowEntry, layoutContextDispatch]);

  useEffect(() => {
    if (!hasBreakoutRoom && sidebarContentPanel === PANELS.BREAKOUT) {
      layoutContextDispatch({
        type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
        value: false,
      });
      layoutContextDispatch({
        type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
        value: PANELS.NONE,
      });
    }
  }, [hasBreakoutRoom, sidebarContentPanel, layoutContextDispatch]);

  return (
    <BreakoutRoomItem {...{
      layoutContextDispatch,
      sidebarContentPanel,
      hasBreakoutRoom: shouldShowEntry,
      isModerator,
      breakoutRoom,
    }}
    />
  );
};

BreakoutRoomContainer.propTypes = {
  breakoutRoom: PropTypes.shape({
    isActive: PropTypes.bool,
  }),
};

BreakoutRoomContainer.defaultProps = {
  breakoutRoom: null,
};

export default BreakoutRoomContainer;
