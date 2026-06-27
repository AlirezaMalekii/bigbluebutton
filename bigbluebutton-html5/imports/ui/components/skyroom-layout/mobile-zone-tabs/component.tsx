import React, {
  useEffect, useReducer, useState, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import { layoutDispatch, layoutSelectInput } from '/imports/ui/components/layout/context';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import Icon from '/imports/ui/components/common/icon/component';
import { useIsSharedNotesEnabled } from '/imports/ui/services/features';
import { useLayoutWebcamCount } from '/imports/ui/components/video-provider/hooks';
import {
  SKYROOM_FOOTER_H,
  SKYROOM_MOBILE_EDGE,
  SKYROOM_MOBILE_TAB_H,
} from '../column-layout';
import {
  isPublicChatOpen,
  isSkyroomMobileViewport,
  isSkyroomColumnLayout,
  openSkyroomMobileBox,
} from '../panel-toggles';
import { getSkyroomNotesOpen, subscribeSkyroomNotesOpen } from '../notes-panel-state';
import {
  resolveSkyroomMobileBox,
  subscribeSkyroomMobileBottom,
  SkyroomMobileBox,
} from '../mobile-bottom-state';

const messages = defineMessages({
  webcams: {
    id: 'app.skyroom.mobileTabs.webcams',
    description: 'Skyroom mobile bottom tab — webcams',
    defaultMessage: 'Webcams',
  },
  chat: {
    id: 'app.skyroom.mobileTabs.chat',
    description: 'Skyroom mobile bottom tab — chat',
    defaultMessage: 'Chat',
  },
  users: {
    id: 'app.skyroom.mobileTabs.users',
    description: 'Skyroom mobile bottom tab — users',
    defaultMessage: 'Participants',
  },
  notes: {
    id: 'app.skyroom.mobileTabs.notes',
    description: 'Skyroom mobile bottom tab — shared notes',
    defaultMessage: 'Shared notes',
  },
});

type TabKey = Exclude<SkyroomMobileBox, null>;

const SkyroomMobileZoneTabs: React.FC = () => {
  const intl = useIntl();
  const layoutContextDispatch = layoutDispatch();
  const sidebarNavigation = layoutSelectInput((i: Input) => i.sidebarNavigation);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const layoutWebcamCount = useLayoutWebcamCount();
  const presentation = layoutSelectInput((i: Input) => i.presentation);
  const screenShare = layoutSelectInput((i: Input) => i.screenShare);
  const notesEnabled = useIsSharedNotesEnabled();

  const [notesOpen, setNotesOpen] = useState(getSkyroomNotesOpen);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);
  useEffect(() => subscribeSkyroomMobileBottom(force), []);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTab = useCallback((box: TabKey, active: boolean) => {
    openSkyroomMobileBox(layoutContextDispatch, active ? null : box);
  }, [layoutContextDispatch]);

  if (!isMobile || !isSkyroomColumnLayout()) return null;

  const usersOpen = sidebarNavigation.isOpen;
  const chatOpen = isPublicChatOpen(sidebarContent);
  const activeBox = resolveSkyroomMobileBox({ usersOpen, chatOpen, notesOpen });

  const hasStage = Boolean(presentation.isOpen || screenShare.hasScreenShare);
  const hasCameras = layoutWebcamCount > 0;
  // Webcams are a bottom box only while something is shared on the stage;
  // otherwise they live in the top zone and need no tab.
  const showWebcams = hasCameras && hasStage;

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    showWebcams ? { key: 'webcams', icon: 'video', label: intl.formatMessage(messages.webcams) } : null,
    { key: 'chat', icon: 'chat', label: intl.formatMessage(messages.chat) },
    { key: 'users', icon: 'user', label: intl.formatMessage(messages.users) },
    notesEnabled ? { key: 'notes', icon: 'copy', label: intl.formatMessage(messages.notes) } : null,
  ].filter(Boolean) as { key: TabKey; icon: string; label: string }[];

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl) return null;

  const bar = (
    <nav
      className="skyroom-mobile-zone-tabs"
      data-test="skyroomMobileZoneTabs"
      aria-label="Bottom panel tabs"
      style={{
        position: 'fixed',
        left: SKYROOM_MOBILE_EDGE,
        right: SKYROOM_MOBILE_EDGE,
        bottom: SKYROOM_FOOTER_H + SKYROOM_MOBILE_EDGE,
        height: SKYROOM_MOBILE_TAB_H,
        zIndex: 11,
      }}
    >
      {tabs.map(({ key, icon, label }) => {
        const active = activeBox === key;
        return (
          <button
            key={key}
            type="button"
            className={`skyroom-mobile-zone-tab${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => handleTab(key, active)}
          >
            <Icon iconName={icon} />
          </button>
        );
      })}
    </nav>
  );

  return createPortal(bar, layoutEl);
};

export default SkyroomMobileZoneTabs;
