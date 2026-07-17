import React, { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import { useQuery } from '@apollo/client';
import { GET_WELCOME_MESSAGE, WelcomeMsgsResponse } from './queries';
import Styled from './styles';
import deviceInfo from '/imports/utils/deviceInfo';
import { getFormattedDialIn, hasDisplayableSessionDetails, stripHtml } from './utils';

const intlMessages = defineMessages({
  title: {
    id: 'app.sessionDetails.title',
    description: 'Session details title',
  },
  dismissLabel: {
    id: 'app.sessionDetails.dismissLabel',
    description: 'Dismiss button label',
  },
  dismissDesc: {
    id: 'app.sessionDetails.dismissDesc',
    description: 'adds descriptive context to dissmissLabel',
  },
  joinByUrlLabel: {
    id: 'app.sessionDetails.joinByUrl',
    description: 'adds descriptive context to dissmissLabel',
  },
  joinByPhoneLabel: {
    id: 'app.sessionDetails.joinByPhone',
    description: 'adds descriptive context to dissmissLabel',
  },
  copyUrlTooltip: {
    id: 'app.sessionDetails.copyUrlTooltip',
    description: 'adds descriptive context to dissmissLabel',
  },
  copyPhoneTooltip: {
    id: 'app.sessionDetails.copyPhoneTooltip',
    description: 'adds descriptive context to dissmissLabel',
  },
  phonePinLabel: {
    id: 'app.sessionDetails.phonePin',
    description: 'adds descriptive context to dissmissLabel',
  },
  copied: {
    id: 'app.sessionDetails.copied',
    description: 'Copied join data',
  },
});

interface SessionDetailsContainerProps {
  isOpen: boolean,
  onRequestClose: () => void,
  priority: string,
}

interface SessionDetailsProps extends SessionDetailsContainerProps {
  welcomeMessage: string;
  welcomeMsgForModerators: string;
  loginUrl: string,
  formattedDialNum: string,
  formattedTelVoice: string,
  anchorElement: HTMLElement | null,
}

const COPY_MESSAGE_TIMEOUT = 3000;

const SessionDetails: React.FC<SessionDetailsProps> = (props) => {
  const {
    welcomeMessage,
    welcomeMsgForModerators,
    isOpen,
    onRequestClose,
    priority,
    loginUrl,
    formattedDialNum,
    formattedTelVoice,
    anchorElement,
  } = props;
  const intl = useIntl();
  const [copyingJoinUrl, setCopyingJoinUrl] = useState(false);
  const [copyingDialIn, setCopyingDialIn] = useState(false);

  const formattedPin = formattedTelVoice.replace(/(?=(\d{3})+(?!\d))/g, ' ');

  const copyData = async (
    content: string,
    type: 'join-url' | 'dial-in',
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (type === 'join-url') setCopyingJoinUrl(true);
    if (type === 'dial-in') setCopyingDialIn(true);

    try {
      await navigator.clipboard.writeText(content);
    } finally {
      // Blur so focus does not keep a tooltip/hit-target stuck over the modal.
      event?.currentTarget?.blur();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }

    setTimeout(() => {
      if (type === 'join-url') setCopyingJoinUrl(false);
      if (type === 'dial-in') setCopyingDialIn(false);
    }, COPY_MESSAGE_TIMEOUT);
  };

  const { isMobile } = deviceInfo;

  const showWelcome = stripHtml(welcomeMessage).length > 0;
  const showModWelcome = stripHtml(welcomeMsgForModerators).length > 0;

  return (
    <ModalSimple
      title={intl.formatMessage(intlMessages.title)}
      dismiss={{
        label: intl.formatMessage(intlMessages.dismissLabel),
        description: intl.formatMessage(intlMessages.dismissDesc),
      }}
      data-test="sessionDetailsModal"
      modalIsOpen={isOpen}
      onRequestClose={onRequestClose}
      priority={priority}
      anchorElement={anchorElement}
    >
      {!isMobile && <Styled.Chevron />}
      <Styled.Container
        isFullWidth={isMobile || !(loginUrl || (formattedDialNum && formattedTelVoice))}
      >
        <div>
          {showWelcome && (
            <Styled.WelcomeMessage dangerouslySetInnerHTML={{ __html: welcomeMessage }} />
          )}
          {showModWelcome && (
            <Styled.WelcomeMessage dangerouslySetInnerHTML={{ __html: welcomeMsgForModerators }} />
          )}
        </div>
        <div>
          {loginUrl && (
            <>
              <Styled.JoinTitle>
                {intl.formatMessage(intlMessages.joinByUrlLabel)}
              </Styled.JoinTitle>
              <Styled.LtrRow>
                <Styled.LtrValue dir="ltr">{loginUrl}</Styled.LtrValue>
                <Styled.CopyButton
                  type="button"
                  data-test="sessionDetailsCopyUrl"
                  $copied={copyingJoinUrl}
                  onClick={(event) => copyData(loginUrl, 'join-url', event)}
                  title={copyingJoinUrl
                    ? intl.formatMessage(intlMessages.copied)
                    : intl.formatMessage(intlMessages.copyUrlTooltip)}
                  aria-label={copyingJoinUrl
                    ? intl.formatMessage(intlMessages.copied)
                    : intl.formatMessage(intlMessages.copyUrlTooltip)}
                >
                  <Icon iconName={copyingJoinUrl ? 'check' : 'copy'} />
                </Styled.CopyButton>
              </Styled.LtrRow>
            </>
          )}
          {formattedDialNum && formattedTelVoice && (
            <>
              <Styled.JoinTitle>
                {intl.formatMessage(intlMessages.joinByPhoneLabel)}
                <Styled.CopyButton
                  type="button"
                  data-test="sessionDetailsCopyDialIn"
                  $copied={copyingDialIn}
                  onClick={(event) => copyData(formattedDialNum, 'dial-in', event)}
                  title={copyingDialIn
                    ? intl.formatMessage(intlMessages.copied)
                    : intl.formatMessage(intlMessages.copyPhoneTooltip)}
                  aria-label={copyingDialIn
                    ? intl.formatMessage(intlMessages.copied)
                    : intl.formatMessage(intlMessages.copyPhoneTooltip)}
                >
                  <Icon iconName={copyingDialIn ? 'check' : 'copy'} />
                </Styled.CopyButton>
              </Styled.JoinTitle>
              <Styled.LtrRow>
                <Styled.LtrValue dir="ltr">{formattedDialNum}</Styled.LtrValue>
              </Styled.LtrRow>
              <p>
                <b>
                  {`${intl.formatMessage(intlMessages.phonePinLabel)}:`}
                </b>
                {' '}
                <Styled.LtrValue dir="ltr">{`${formattedPin} #`}</Styled.LtrValue>
              </p>
            </>
          )}
        </div>
      </Styled.Container>
    </ModalSimple>
  );
};

const SessionDetailsContainer: React.FC<SessionDetailsContainerProps> = ({
  isOpen,
  onRequestClose,
  priority,
}) => {
  const {
    data: welcomeData,
    loading: welcomeLoading,
    error: welcomeError,
  } = useQuery<WelcomeMsgsResponse>(GET_WELCOME_MESSAGE);

  const { loading, data: currentMeeting } = useMeeting((m) => {
    return {
      name: m.name,
      loginUrl: m.loginUrl,
      voiceSettings: m.voiceSettings,
    };
  });

  const { data: currentUserData } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
  }));

  if (welcomeLoading) return null;
  if (welcomeError) return <div>{JSON.stringify(welcomeError)}</div>;
  if (!welcomeData || loading || !currentMeeting) return null;

  const { formattedDialNum, formattedTelVoice } = getFormattedDialIn(currentMeeting?.voiceSettings);

  const { isMobile } = deviceInfo;

  const anchorElement = isMobile
    ? null
    : document.getElementById('presentationTitle') as HTMLElement;

  // login url should only be displayed for moderators
  let loginUrl = currentMeeting.loginUrl ?? '';
  const isModerator = currentUserData?.isModerator;

  if (!isModerator) {
    loginUrl = '';
  }

  const welcomeMessage = welcomeData.user_welcomeMsgs[0]?.welcomeMsg ?? '';
  const welcomeMsgForModerators = welcomeData.user_welcomeMsgs[0]?.welcomeMsgForModerators ?? '';

  if (!hasDisplayableSessionDetails({
    welcome: welcomeMessage,
    welcomeForModerators: welcomeMsgForModerators,
    loginUrl,
    formattedDialNum,
    formattedTelVoice,
  })) {
    return null;
  }

  return (
    <SessionDetails
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      priority={priority}
      loginUrl={loginUrl}
      welcomeMessage={welcomeMessage}
      welcomeMsgForModerators={welcomeMsgForModerators}
      formattedDialNum={formattedDialNum}
      formattedTelVoice={formattedTelVoice}
      anchorElement={anchorElement}
    />
  );
};

export default SessionDetailsContainer;
