import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { LoadingContext } from '../../common/loading-screen/loading-screen-HOC/component';
import { resolveGuestLobbyMessages } from '/imports/ui/core/utils/guestLobbyMessages';
import Styled from './styles';

const REDIRECT_TIMEOUT = 15000;

export const GUEST_STATUSES = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  WAIT: 'WAIT',
};

const intlMessages = defineMessages({
  windowTitle: {
    id: 'app.guest.windowTitle',
    description: 'tab title',
  },
  guestWait: {
    id: 'app.guest.guestWait',
    description: '',
  },
  noSessionToken: {
    id: 'app.guest.noSessionToken',
    description: '',
  },
  guestInvalid: {
    id: 'app.guest.guestInvalid',
    description: '',
  },
  allow: {
    id: 'app.guest.allow',
    description: '',
  },
  deny: {
    id: 'app.guest.guestDeny',
    description: '',
  },
  firstPosition: {
    id: 'app.guest.firstPositionInWaitingQueue',
    description: '',
  },
  position: {
    id: 'app.guest.positionInWaitingQueue',
    description: '',
  },
  calculating: {
    id: 'app.guest.calculating',
    description: '',
  },
  privateMessageFromHost: {
    id: 'app.guest.privateMessageFromHost',
    description: 'Label for private host message in guest lobby',
    defaultMessage: 'Private message from host',
  },
  publicMessageFromHost: {
    id: 'app.guest.publicMessageFromHost',
    description: 'Label for public host message in guest lobby',
    defaultMessage: 'Public message from host',
  },
  waitingForApproval: {
    id: 'app.guest.waitingForApproval',
    description: 'Waiting status text',
    defaultMessage: 'Waiting for approval',
  },
});

function getSearchParam(name: string) {
  const params = new URLSearchParams(window.location.search);

  if (params && params.has(name)) {
    const param = params.get(name);

    return param;
  }

  return null;
}

interface GuestWaitProps {
  guestStatus: string | null;
  guestLobbyMessage: string | null;
  publicGuestLobbyMessage: string | null;
  positionInWaitingQueue: number | null;
  logoutUrl: string;
}

const renderLobbyMessage = (message: string) => (
  <Styled.MessageText
    aria-live="polite"
    data-test="guestMessage"
    // eslint-disable-next-line react/no-danger
    dangerouslySetInnerHTML={{ __html: message }}
  />
);

const GuestWait: React.FC<GuestWaitProps> = (props) => {
  const {
    guestLobbyMessage,
    publicGuestLobbyMessage,
    guestStatus,
    logoutUrl,
    positionInWaitingQueue,
  } = props;

  const intl = useIntl();
  const [animate, setAnimate] = useState(true);
  const [statusMessage, setStatusMessage] = useState(intl.formatMessage(intlMessages.guestWait));
  const [positionMessage, setPositionMessage] = useState(intl.formatMessage(intlMessages.calculating));
  const positionInWaitingQueueRef = useRef('');
  const loadingContextInfo = useContext(LoadingContext);

  const updatePositionInWaitingQueue = useCallback((newPositionInWaitingQueue: number) => {
    if (positionInWaitingQueueRef.current !== newPositionInWaitingQueue.toString()) {
      positionInWaitingQueueRef.current = newPositionInWaitingQueue.toString();
      if (positionInWaitingQueueRef.current === '1') {
        setPositionMessage(intl.formatMessage(intlMessages.firstPosition));
      } else {
        setPositionMessage(`${intl.formatMessage(intlMessages.position).trim()} ${positionInWaitingQueueRef.current}`);
      }
    }
  }, [intl]);

  useEffect(() => {
    document.title = intl.formatMessage(intlMessages.windowTitle);
  }, []);

  useEffect(() => {
    const sessionToken = getSearchParam('sessionToken');

    if (loadingContextInfo.isLoading) {
      loadingContextInfo.setLoading(false);
    }

    if (!sessionToken) {
      setAnimate(false);
      setStatusMessage(intl.formatMessage(intlMessages.noSessionToken));
      return;
    }

    if (!guestStatus) {
      setAnimate(false);
      setPositionMessage('');
      setStatusMessage(intl.formatMessage(intlMessages.guestInvalid));
      return;
    }

    if (guestStatus === GUEST_STATUSES.ALLOW) {
      setPositionMessage('');
      setStatusMessage(intl.formatMessage(intlMessages.allow));
      setAnimate(false);
      return;
    }

    if (guestStatus === GUEST_STATUSES.DENY) {
      setAnimate(false);
      setPositionMessage('');
      setStatusMessage(intl.formatMessage(intlMessages.deny));
      setTimeout(() => {
        window.location.assign(logoutUrl);
      }, REDIRECT_TIMEOUT);
      return;
    }

    setStatusMessage(intl.formatMessage(intlMessages.guestWait));
    if (positionInWaitingQueue) {
      updatePositionInWaitingQueue(positionInWaitingQueue);
    }
  }, [
    guestStatus,
    logoutUrl,
    positionInWaitingQueue,
    intl,
    updatePositionInWaitingQueue,
  ]);

  const { privateMessage, publicMessage } = resolveGuestLobbyMessages(
    guestLobbyMessage,
    publicGuestLobbyMessage,
  );
  const hasLobbyMessages = Boolean(privateMessage || publicMessage);
  const showDefaultWaitMessage = guestStatus === GUEST_STATUSES.WAIT && !hasLobbyMessages;

  return (
    <Styled.Container>
      <Styled.Content id="content">
        <Styled.Heading id="heading">{intl.formatMessage(intlMessages.windowTitle)}</Styled.Heading>
        <Styled.Position id="positionInWaitingQueue">
          <p aria-live="polite">{positionMessage}</p>
        </Styled.Position>
        {publicMessage && (
          <Styled.MessageContainer data-test="guestPublicLobbyMessage">
            <Styled.MessageLabel>
              {intl.formatMessage(intlMessages.publicMessageFromHost)}
            </Styled.MessageLabel>
            {renderLobbyMessage(publicMessage)}
          </Styled.MessageContainer>
        )}
        {privateMessage && (
          <Styled.MessageContainer data-test="guestPrivateLobbyMessage">
            <Styled.MessageLabel>
              {intl.formatMessage(intlMessages.privateMessageFromHost)}
            </Styled.MessageLabel>
            {renderLobbyMessage(privateMessage)}
          </Styled.MessageContainer>
        )}
        {(showDefaultWaitMessage || guestStatus !== GUEST_STATUSES.WAIT) && (
          <p
            aria-live="polite"
            data-test="guestMessage"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: statusMessage }}
          />
        )}
        {animate && (
          <Styled.WaitingIndicator>
            <Styled.WaitingDot />
            <span>{intl.formatMessage(intlMessages.waitingForApproval)}</span>
          </Styled.WaitingIndicator>
        )}
      </Styled.Content>
    </Styled.Container>
  );
};

export default GuestWait;
