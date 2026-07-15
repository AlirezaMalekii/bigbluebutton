import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useLazyQuery, useMutation } from '@apollo/client';
import { uid } from 'radash';
import BBBMenu from '/imports/ui/components/common/menu/component';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import {
  GET_CHAT_MESSAGE_HISTORY,
  getChatMessageHistory,
} from '/imports/ui/components/chat/chat-graphql/chat-header/chat-actions/queries';
import { generateExportedMessages } from '/imports/ui/components/chat/chat-graphql/chat-header/chat-actions/services';
import { getDateString } from '/imports/utils/string-utils';
import { CHAT_PUBLIC_CLEAR_HISTORY } from '/imports/ui/components/chat/chat-graphql/chat-header/chat-actions/mutations';
import ConfirmationModal from '/imports/ui/components/common/modal/confirmation/component';
import useMeetingSettings from '/imports/ui/core/local-states/useMeetingSettings';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import Styled from './styles';

const intlMessages = defineMessages({
  options: {
    id: 'app.chat.dropdown.options',
    description: 'Chat options menu label',
  },
  clear: {
    id: 'app.chat.dropdown.clear',
    description: 'Clear button label',
  },
  save: {
    id: 'app.chat.dropdown.save',
    description: 'Save button label',
  },
  copy: {
    id: 'app.chat.dropdown.copy',
    description: 'Copy button label',
  },
  clearHistoryConfirmationTitle: {
    id: 'app.chat.clearHistory.confirmationTitle',
    description: 'Clear public chat history confirmation title',
  },
  clearHistoryConfirmationDescription: {
    id: 'app.chat.clearHistory.confirmationDescription',
    description: 'Clear public chat history confirmation description',
  },
  clearHistoryCancelLabel: {
    id: 'app.chat.toolbar.delete.cancelLabel',
    description: 'Cancel clear public chat history',
  },
});

const SkyroomChatHeaderActions: React.FC = () => {
  const [MeetingSettings] = useMeetingSettings();
  const chatConfig = MeetingSettings.public.chat;
  const { enableSaveAndCopyPublicChat } = chatConfig;
  const intl = useIntl();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const uniqueIdsRef = useRef<string[]>([uid(1), uid(2), uid(3)]);
  const downloadOrCopyRef = useRef<'download' | 'copy' | null>(null);
  const [userIsModerator, setUserIsModerator] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [chatPublicClearHistory] = useMutation(CHAT_PUBLIC_CLEAR_HISTORY);
  const { data: currentUserData, loading: currentUserLoading } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
  }));
  const { loading: meetingLoading } = useMeeting((m) => ({
    isBreakout: m.isBreakout,
    name: m.name,
  }));

  const [
    loadHistory,
    { error: errorHistory, data: dataHistory },
  ] = useLazyQuery<getChatMessageHistory>(GET_CHAT_MESSAGE_HISTORY, { fetchPolicy: 'no-cache' });

  useEffect(() => {
    if (!dataHistory) return;
    const exportedString = generateExportedMessages(dataHistory.chat_message_public, intl);
    if (downloadOrCopyRef.current === 'download') {
      const link = document.createElement('a');
      link.setAttribute('download', `bbb-${dataHistory.meeting[0].name}[public-chat]_${getDateString()}.txt`);
      link.setAttribute(
        'href',
        `data:text/plain;charset=utf-8,${encodeURIComponent(exportedString)}`,
      );
      link.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true, view: window }));
      downloadOrCopyRef.current = null;
    } else if (downloadOrCopyRef.current === 'copy') {
      navigator.clipboard.writeText(exportedString);
      downloadOrCopyRef.current = null;
    }
  }, [dataHistory, intl]);

  useEffect(() => {
    if (currentUserData) {
      setUserIsModerator(!!currentUserData.isModerator);
    }
  }, [currentUserData]);

  const actions = useMemo(() => [
    {
      key: uniqueIdsRef.current[0],
      allow: enableSaveAndCopyPublicChat,
      icon: 'download',
      dataTest: 'chatSave',
      label: intl.formatMessage(intlMessages.save),
      onClick: () => {
        loadHistory();
        downloadOrCopyRef.current = 'download';
      },
    },
    {
      key: uniqueIdsRef.current[1],
      allow: enableSaveAndCopyPublicChat,
      icon: 'copy',
      dataTest: 'chatCopy',
      label: intl.formatMessage(intlMessages.copy),
      onClick: () => {
        loadHistory();
        downloadOrCopyRef.current = 'copy';
      },
    },
    {
      key: uniqueIdsRef.current[2],
      allow: true,
      icon: 'delete',
      dataTest: 'chatClear',
      label: intl.formatMessage(intlMessages.clear),
      disabled: !userIsModerator || currentUserLoading || meetingLoading,
      onClick: () => setIsClearHistoryModalOpen(true),
    },
  ].filter(({ allow }) => allow), [
    enableSaveAndCopyPublicChat,
    userIsModerator,
    currentUserLoading,
    meetingLoading,
    intl,
    loadHistory,
  ]);

  if (errorHistory) return null;

  return (
    <Styled.OptionsGroup data-test="skyroom-chat-header-options">
      {isClearHistoryModalOpen ? (
        <ConfirmationModal
          intl={intl}
          isOpen={isClearHistoryModalOpen}
          setIsOpen={setIsClearHistoryModalOpen}
          onRequestClose={() => setIsClearHistoryModalOpen(false)}
          onConfirm={() => chatPublicClearHistory()}
          priority="low"
          title={intl.formatMessage(intlMessages.clearHistoryConfirmationTitle)}
          description={intl.formatMessage(intlMessages.clearHistoryConfirmationDescription)}
          confirmButtonLabel={intl.formatMessage(intlMessages.clear)}
          cancelButtonLabel={intl.formatMessage(intlMessages.clearHistoryCancelLabel)}
          confirmButtonDataTest="chatClearConfirmation"
        />
      ) : null}
      <BBBMenu
        dataTest="chat-options-dropdown-menu"
        overrideMobileStyles
        trigger={(
          <Styled.OptionsButton
            label={intl.formatMessage(intlMessages.options)}
            data-test="chatOptionsMenu"
            icon="more"
            color="light"
            hideLabel
            size="sm"
            circle={false}
            onClick={() => null}
          />
        )}
        actions={actions}
        customStyles={{ zIndex: 1005 }}
        opts={{
          id: 'chat-options-dropdown-menu',
          className: 'skyroom-chat-options-menu',
          keepMounted: true,
          transitionDuration: 0,
          elevation: 8,
          getcontentanchorel: null,
          fullwidth: 'true',
          disableScrollLock: true,
          BackdropProps: {
            invisible: true,
          },
          anchorOrigin: { vertical: 'bottom', horizontal: isRTL ? 'right' : 'left' },
          transformOrigin: { vertical: 'top', horizontal: isRTL ? 'right' : 'left' },
        }}
      />
    </Styled.OptionsGroup>
  );
};

export default SkyroomChatHeaderActions;
