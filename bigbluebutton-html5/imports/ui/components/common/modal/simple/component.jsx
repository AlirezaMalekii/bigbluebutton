/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import FocusTrap from 'focus-trap-react';
import Styled from './styles';
import deviceInfo from '/imports/utils/deviceInfo';

const intlMessages = defineMessages({
  modalClose: {
    id: 'app.modal.close',
    description: 'Close',
  },
  modalCloseDescription: {
    id: 'app.modal.close.description',
    description: 'Disregards changes and closes the modal',
  },
});

const propTypes = {
  title: PropTypes.string,
  dismiss: PropTypes.shape({
    callback: PropTypes.func,
  }),
  headerPosition: PropTypes.string,
  shouldCloseOnOverlayClick: PropTypes.bool,
  shouldShowCloseButton: PropTypes.bool,
  overlayClassName: PropTypes.string,
  modalIsOpen: PropTypes.bool,
  isOpen: PropTypes.bool,
  onOutsideClick: PropTypes.func,
};

const resolveModalOpenState = ({ modalIsOpen, isOpen }) => (
  typeof modalIsOpen === 'boolean' ? modalIsOpen : Boolean(isOpen)
);

const defaultProps = {
  title: '',
  dismiss: {
    callback: null,
  },
  shouldCloseOnOverlayClick: true,
  shouldShowCloseButton: true,
  overlayClassName: 'modalOverlay',
  headerPosition: 'inner',
  modalIsOpen: false,
  onOutsideClick: null,
};

class ModalSimple extends Component {
  constructor(props) {
    super(props);
    this.modalRef = React.createRef();
    this.handleDismiss = this.handleDismiss.bind(this);
    this.handleRequestClose = this.handleRequestClose.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleOutsideClick, false);
    document.addEventListener('touchstart', this.handleOutsideClick, false);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleOutsideClick, false);
    document.removeEventListener('touchstart', this.handleOutsideClick, false);
  }

  handleDismiss() {
    const { modalHide, dismiss } = this.props;
    if (!dismiss || !modalHide) return;
    modalHide(dismiss.callback);
  }

  handleRequestClose(event) {
    const { onRequestClose } = this.props;
    const closeModal = onRequestClose || this.handleDismiss;

    closeModal();

    if (event && event.type === 'click') {
      setTimeout(() => {
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }, 0);
    }
  }

  handleOutsideClick(e) {
    const {
      shouldCloseOnOverlayClick,
      onOutsideClick,
    } = this.props;
    const modalIsOpen = resolveModalOpenState(this.props);
    const clickedInside = this.modalRef.current?.contains(e.target);

    if (!modalIsOpen || clickedInside) return;

    if (shouldCloseOnOverlayClick) {
      this.handleRequestClose(e);
      return;
    }

    if (onOutsideClick) onOutsideClick(e);
  }

  render() {
    const {
      id,
      intl,
      title,
      hideBorder,
      dismiss,
      className,
      modalIsOpen,
      isOpen,
      onRequestClose,
      shouldShowCloseButton,
      contentLabel,
      headerPosition,
      'data-test': dataTest,
      children,
      anchorElement,
      ...otherProps
    } = this.props;

    const resolvedModalIsOpen = resolveModalOpenState({ modalIsOpen, isOpen });

    let modalStyles = {};

    if (anchorElement) {
      // if anchorElement is provided, position of the modal to be centered below it
      const { isMobile } = deviceInfo;

      const marginX = 10;
      const anchorRect = anchorElement.getBoundingClientRect();
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const modalWidth = 600;
      const modalLeft = Math.max(anchorCenterX - modalWidth / 2, marginX);
      const windowWidth = document.documentElement.clientWidth;

      modalStyles = {
        content: {
          top: `${anchorRect.bottom + window.scrollY + 10}px`,
          left: isMobile ? null : `${modalLeft + window.scrollX}px`,
          overflow: 'visible',
          position: 'fixed',
          maxWidth: windowWidth - (isMobile ? 0 : modalLeft + window.scrollX) - marginX * 2,
        },
      };
    }

    return (
      <Styled.SimpleModal
        id={id || 'simpleModal'}
        isOpen={resolvedModalIsOpen}
        className={className}
        onRequestClose={this.handleRequestClose}
        contentLabel={title || contentLabel}
        dataTest={dataTest}
        style={modalStyles}
        {...otherProps}
      >
        <FocusTrap active={resolvedModalIsOpen} focusTrapOptions={{ initialFocus: false, fallbackFocus: '#fallback-element' }}>
          <div ref={this.modalRef}>
            <Styled.Header
              hideBorder={hideBorder}
              headerPosition={headerPosition}
              shouldShowCloseButton={shouldShowCloseButton}
              modalDismissDescription={intl.formatMessage(intlMessages.modalCloseDescription)}
              closeButtonProps={{
                label: intl.formatMessage(intlMessages.modalClose),
                'aria-label': `${intl.formatMessage(intlMessages.modalClose)} ${title || contentLabel}`,
                onClick: this.handleRequestClose,
              }}
            >
              {title || ''}
            </Styled.Header>
            <Styled.Content data-test="modalSimpleBody">
              {children}
              <div id="fallback-element" tabIndex="-1" />
            </Styled.Content>
          </div>
        </FocusTrap>
      </Styled.SimpleModal>
    );
  }
}

ModalSimple.propTypes = propTypes;
ModalSimple.defaultProps = defaultProps;

export default injectIntl(ModalSimple);
