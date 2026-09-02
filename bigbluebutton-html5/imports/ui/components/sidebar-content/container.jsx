import React from 'react';
import SidebarContent from './component';
import { layoutSelectInput, layoutSelectOutput, layoutDispatch } from '../layout/context';

import {
  CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
} from '/imports/ui/components/whiteboard/queries';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useDeduplicatedSubscription from '../../core/hooks/useDeduplicatedSubscription';

import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import { PANELS } from '../layout/enums';

const SidebarContentContainer = (props) => {
  const { isSharedNotesPinned } = props;
  const sidebarContentInput = layoutSelectInput((i) => i.sidebarContent);
  const sidebarContentOutput = layoutSelectOutput((i) => i.sidebarContent);
  const layoutContextDispatch = layoutDispatch();
  const { sidebarContentPanel } = sidebarContentInput;
  const { data: currentUserData } = useCurrentUser((user) => ({
    presenter: user.presenter,
    isModerator: user.isModerator,
  }));
  const amIPresenter = currentUserData?.presenter;
  const amIModerator = currentUserData?.isModerator;

  const { data: presentationPageData } = useDeduplicatedSubscription(
    CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
  );
  const presentationPage = presentationPageData?.pres_page_curr[0] || {};

  const currentSlideId = presentationPage?.pageId;
  const keepChatMountedOnMobile = isSkyroomColumnLayout()
    && isSkyroomMobileViewport()
    && sidebarContentPanel === PANELS.CHAT;

  if (sidebarContentOutput.display === false && !keepChatMountedOnMobile) return null;

  const hiddenOnMobile = sidebarContentOutput.display === false && keepChatMountedOnMobile;

  return (
    <div
      hidden={hiddenOnMobile}
      aria-hidden={hiddenOnMobile}
      style={hiddenOnMobile ? {
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        visibility: 'hidden',
        width: 0,
      } : undefined}
    >
      <SidebarContent
        {...sidebarContentOutput}
        contextDispatch={layoutContextDispatch}
        sidebarContentPanel={sidebarContentPanel}
        amIPresenter={amIPresenter}
        amIModerator={amIModerator}
        currentSlideId={currentSlideId}
        isSharedNotesPinned={isSharedNotesPinned}
      />
    </div>
  );
};

export default SidebarContentContainer;
