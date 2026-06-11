import React from 'react';
import PropTypes from 'prop-types';
import Styled from './styles';

const propTypes = {
  hideBorder: PropTypes.bool,
  headerPosition: PropTypes.string,
  shouldShowCloseButton: PropTypes.bool,
  modalDismissDescription: PropTypes.string,
  closeButtonProps: PropTypes.shape({
    label: PropTypes.string,
    'aria-label': PropTypes.string,
    onClick: PropTypes.func,
  }),
};

const Header = ({
  children,
  closeButtonProps = {},
  headerPosition = 'inner',
  hideBorder = true,
  modalDismissDescription = '',
  shouldShowCloseButton = true,
  ...other
}) => {
  const {
    onClick: closeButtonOnClick = () => {},
    ...restCloseButtonProps
  } = closeButtonProps;
  if (!shouldShowCloseButton && !children) return null;

  const headerOnTop = headerPosition === 'top';
  const innerHeader = headerPosition === 'inner';

  return (
    <Styled.Header
      $hideBorder={hideBorder}
      $headerOnTop={headerOnTop}
      $innerHeader={innerHeader}
      {...other}
    >
      <Styled.Title
        $hasMarginBottom={innerHeader}
        $headerOnTop={headerOnTop}
        $innerHeader={innerHeader}
      >
        {children}
      </Styled.Title>
      {shouldShowCloseButton ? (
        <Styled.DismissButton
          data-test="closeModal"
          icon="close"
          circle
          hideLabel
          aria-describedby="modalDismissDescription"
          $headerOnTop={headerOnTop}
          $innerHeader={innerHeader}
          onClick={closeButtonOnClick}
          {...restCloseButtonProps}
        />
      ) : null}
      <div id="modalDismissDescription" hidden>{modalDismissDescription}</div>
    </Styled.Header>
  );
};

Header.propTypes = propTypes;

export default Header;
