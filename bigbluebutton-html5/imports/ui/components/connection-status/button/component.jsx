import React, { PureComponent } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import ConnectionStatusModalComponent from '/imports/ui/components/connection-status/modal/container';
import ConnectionStatusService from '/imports/ui/components/connection-status/service';
import Icon from '/imports/ui/components/connection-status/icon/component';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import Styled from './styles';
import { isMobile } from '/imports/utils/deviceInfo';
import { ModalRegistration } from '/imports/ui/core/singletons/modalController';

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

class ConnectionStatusButton extends PureComponent {
  constructor(props) {
    super(props);
    this.previousStatus = props.myCurrentStatus ?? 'normal';
    this.setModalIsOpen = () => {};
  }

  componentDidUpdate(prevProps) {
    const { connected, myCurrentStatus, intl } = this.props;

    if (!connected) {
      this.previousStatus = myCurrentStatus ?? 'normal';
      return;
    }

    if (
      myCurrentStatus === 'danger'
      && prevProps.myCurrentStatus !== 'danger'
      && this.previousStatus !== 'danger'
    ) {
      ConnectionStatusService.notification('warning', intl);
    } else if (
      myCurrentStatus === 'critical'
      && prevProps.myCurrentStatus !== 'critical'
      && this.previousStatus !== 'critical'
    ) {
      ConnectionStatusService.notification('error', intl);
    }

    this.previousStatus = myCurrentStatus ?? 'normal';
  }

  static renderIcon(level = 'normal', connected = true) {
    return (
      <Styled.IconWrapper>
        <Icon
          level={level}
          grayscale
          connected={connected}
        />
      </Styled.IconWrapper>
    );
  }

  render() {
    const {
      intl,
      connected,
      myCurrentStatus = 'normal',
    } = this.props;

    const skyroomConnBtn = isSkyroomTheme();

    const connectionStatusModal = (
      <ModalRegistration id="connectionStatusModal" priority="low">
        {({
          isOpen, open, close,
        }) => {
          this.setModalIsOpen = (value) => {
            if (value) open();
            else close();
          };
          if (!isOpen) return null;
          return (
            <ConnectionStatusModalComponent
              isModalOpen={isOpen}
              setModalIsOpen={(value) => {
                if (value) open();
                else close();
              }}
            />
          );
        }}
      </ModalRegistration>
    );

    if (!connected) {
      return (
        <Styled.ButtonWrapper>
          <Button
            customIcon={ConnectionStatusButton.renderIcon('normal', false)}
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
          customIcon={ConnectionStatusButton.renderIcon(myCurrentStatus)}
          label={intl.formatMessage(intlMessages.label)}
          hideLabel
          aria-label={intl.formatMessage(intlMessages.description)}
          size="sm"
          color={color}
          circle={!skyroomConnBtn}
          onClick={() => this.setModalIsOpen(true)}
          data-test="connectionStatusButton"
        />
        {connectionStatusModal}
      </Styled.ButtonWrapper>
    );
  }
}

export default injectIntl(ConnectionStatusButton);
