import React from 'react';
import PropTypes from 'prop-types';
import Styled from './styles';
import Left from './left/component';
import Right from './right/component';

const Header = ({
  leftButtonProps,
  rightButtonProps,
  customRightButton,
  'data-test': dataTest,
  ...rest
}) => {
  const renderCloseButton = () => (
    <Right {...rightButtonProps} />
  );

  const renderCustomRightButton = () => (
    <Styled.RightWrapper>
      {customRightButton}
    </Styled.RightWrapper>
  );

  let rightContent = null;
  if (customRightButton) {
    rightContent = renderCustomRightButton();
  } else if (rightButtonProps) {
    rightContent = renderCloseButton();
  }

  return (
    <Styled.Header data-test={dataTest || ''} {...rest}>
      {leftButtonProps ? <Left {...leftButtonProps} /> : <div />}
      {rightContent}
    </Styled.Header>
  );
};

Header.propTypes = {
  leftButtonProps: PropTypes.shape({}),
  rightButtonProps: PropTypes.shape({}),
  customRightButton: PropTypes.element,
  dataTest: PropTypes.string,
};

export default Header;
