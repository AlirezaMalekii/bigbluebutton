import React from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Styled from './styles';
import { ACTIONS } from '/imports/ui/components/layout/enums';

const intlMessages = defineMessages({
  fullscreenButton: {
    id: 'app.fullscreenButton.label',
    description: 'Fullscreen label',
  },
  fullscreenUndoButton: {
    id: 'app.fullscreenUndoButton.label',
    description: 'Undo fullscreen label',
  },
});

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  fullscreenRef: PropTypes.instanceOf(Element),
  dark: PropTypes.bool,
  bottom: PropTypes.bool,
  isIphone: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  elementName: PropTypes.string,
  elementId: PropTypes.string,
  elementGroup: PropTypes.string,
  layoutContextDispatch: PropTypes.func,
  currentElement: PropTypes.string,
  currentGroup: PropTypes.string,
  handleToggleFullScreen: PropTypes.func.isRequired,
  color: PropTypes.string,
  fullScreenStyle: PropTypes.bool,
  dataTest: PropTypes.string,
  customToggle: PropTypes.func,
};

const FullscreenButtonComponent = ({
  intl,
  dark = false,
  bottom = false,
  elementName = '',
  elementId,
  elementGroup,
  isIphone = false,
  isFullscreen = false,
  layoutContextDispatch,
  currentElement,
  currentGroup,
  color = 'default',
  fullScreenStyle = true,
  fullscreenRef = null,
  handleToggleFullScreen,
  dataTest = 'webcamFullscreenButton',
  customToggle,
}) => {
  if (isIphone) return null;

  const formattedLabel = (fullscreen) => (fullscreen
    ? intl.formatMessage(
      intlMessages.fullscreenUndoButton,
      ({ elementName: elementName || '' }),
    )
    : intl.formatMessage(
      intlMessages.fullscreenButton,
      ({ elementName: elementName || '' }),
    )
  );

  const handleClick = () => {
    if (customToggle) {
      customToggle();
      return;
    }

    const newElement = (elementId === currentElement) ? '' : elementId;
    const newGroup = (elementGroup === currentGroup) ? '' : elementGroup;

    layoutContextDispatch({
      type: ACTIONS.SET_FULLSCREEN_ELEMENT,
      value: {
        element: newElement,
        group: newGroup,
      },
    });

    // Webcam fullscreen uses layout-only overlay; browser Fullscreen API breaks SafeMeet zones.
    if (elementGroup !== 'webcams') {
      handleToggleFullScreen(fullscreenRef);
    }
  };

  return (
    <Styled.FullscreenButtonWrapper
      theme={dark ? 'dark' : 'light'}
      position={bottom ? 'bottom' : 'top'}
    >
      <Styled.FullscreenButton
        color={color || 'default'}
        icon={!isFullscreen ? 'fullscreen' : 'exit_fullscreen'}
        size="sm"
        onClick={() => handleClick()}
        label={formattedLabel(isFullscreen)}
        hideLabel
        isStyled={fullScreenStyle}
        data-test={dataTest}
      />
    </Styled.FullscreenButtonWrapper>
  );
};

FullscreenButtonComponent.propTypes = propTypes;

export default injectIntl(FullscreenButtonComponent);
