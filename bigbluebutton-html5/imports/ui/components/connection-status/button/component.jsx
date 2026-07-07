import React, { useEffect, useRef } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import ConnectionStatusModalComponent from '/imports/ui/components/connection-status/modal/container';
import ConnectionStatusService from '/imports/ui/components/connection-status/service';
import Icon from '/imports/ui/components/connection-status/icon/component';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import Styled from './styles';
import { isMobile } from '/imports/utils/deviceInfo';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';

const intlMessages = defineMessages({
  label: {
    id: 'app.connection-status.label',
    description: 'Connection status button label',
  },
  description: {
    id: 'app.connection-status.description',
    description: 'Connection status button description',
  },
});

const renderIcon = (level = 'normal', connected = true) => (
  <Styled.IconWrapper>
    <Icon
      level={level}
      grayscale
      connected={connected}
    />
  </Styled.IconWrapper>
);

const ConnectionStatusButton = ({
  intl,
  connected,
  myCurrentStatus = 'normal',
}) => {
  const {
    isOpen,
    open,
    close,
  } = useModalRegistration({ id: 'connectionStatusModal', priority: 'low' });
  const previousStatusRef = useRef(myCurrentStatus);

  useEffect(() => {
    if (!connected) {
      previousStatusRef.current = myCurrentStatus;
      return;
    }

    if (
      myCurrentStatus === 'danger'
      && previousStatusRef.current !== 'danger'
    ) {
      ConnectionStatusService.notification('warning', intl);
    } else if (
      myCurrentStatus === 'critical'
      && previousStatusRef.current !== 'critical'
    ) {
      ConnectionStatusService.notification('error', intl);
    }

    previousStatusRef.current = myCurrentStatus;
  }, [connected, myCurrentStatus, intl]);

  const setModalIsOpen = (value) => {
    if (value) open();
    else close();
  };

  const connectionStatusModal = isOpen ? (
    <ConnectionStatusModalComponent
      isModalOpen={isOpen}
      setModalIsOpen={setModalIsOpen}
    />
  ) : null;

  const skyroomConnBtn = isSkyroomTheme();

  if (!connected) {
    return (
      <Styled.ButtonWrapper>
        <Button
          customIcon={renderIcon('normal', false)}
          label={intl.formatMessage(intlMessages.label)}
          hideLabel
          aria-label={intl.formatMessage(intlMessages.description)}
          size="sm"
          disabled
          ghost
          circle={!skyroomConnBtn}
          color={skyroomConnBtn ? 'dark' : 'default'}
          onClick={() => {}}
          data-test="connectionStatusButton"
          isMobile={isMobile}
        />
        {connectionStatusModal}
      </Styled.ButtonWrapper>
    );
  }

  let color;
  switch (myCurrentStatus) {
    case 'warning':
      color = skyroomConnBtn ? 'dark' : 'success';
      break;
    case 'danger':
      color = skyroomConnBtn ? 'dark' : 'warning';
      break;
    case 'critical':
      color = skyroomConnBtn ? 'dark' : 'danger';
      break;
    default:
      color = skyroomConnBtn ? 'dark' : 'success';
  }

  return (
    <Styled.ButtonWrapper>
      <Button
        customIcon={renderIcon(myCurrentStatus)}
        label={intl.formatMessage(intlMessages.label)}
        hideLabel
        aria-label={intl.formatMessage(intlMessages.description)}
        size="sm"
        color={color}
        circle={!skyroomConnBtn}
        onClick={() => setModalIsOpen(true)}
        data-test="connectionStatusButton"
      />
      {connectionStatusModal}
    </Styled.ButtonWrapper>
  );
};

export default injectIntl(ConnectionStatusButton);
