import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import BreakoutRoomItem from './component';
import { layoutSelectInput, layoutDispatch } from '../../../layout/context';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { ACTIONS, PANELS } from '../../../layout/enums';
import { isSkyroomMobileViewport } from '/imports/ui/components/skyroom-layout/panel-toggles';

const BreakoutRoomContainer = ({ breakoutRoom }) => {
  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const { sidebarContentPanel } = sidebarContent;
  const layoutContextDispatch = layoutDispatch();

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
  // Desktop/tablet users list: show the breakout entry card.
  // Phone: breakout lives in its own bottom tab — never show the card inside Users.
  const shouldShowEntry = hasBreakoutRoom
    && (hasInvitation || isModerator)
    && !isSkyroomMobileViewport();

  // Only close the breakout panel when rooms actually end (true → false).
  // Closing whenever `!hasBreakoutRoom` races create: the modal opens the panel
  // before GraphQL flips the flag, which wiped the panel and left chat closed.
  const prevHasBreakoutRoomRef = useRef(hasBreakoutRoom);
  useEffect(() => {
    const hadBreakoutRoom = prevHasBreakoutRoomRef.current;
    prevHasBreakoutRoomRef.current = hasBreakoutRoom;
    if (hadBreakoutRoom && !hasBreakoutRoom && sidebarContentPanel === PANELS.BREAKOUT) {
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
