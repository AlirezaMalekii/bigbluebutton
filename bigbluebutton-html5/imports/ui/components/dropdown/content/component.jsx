import React, { Children, cloneElement } from 'react';
import Styled from './styles';

const defaultProps = {
  'aria-expanded': false,
};

const DropdownContent = ({
  children,
  dropdownToggle,
  dropdownShow,
  dropdownHide,
  dropdownIsOpen,
  keepOpen,
  ...restProps
}) => {
  const boundChildren = Children.map(children, (child) => cloneElement(child, {
    dropdownIsOpen,
    dropdownToggle,
    dropdownShow,
    dropdownHide,
    keepOpen,
  }));

  return (
    <Styled.Content
      data-test="dropdownContent"
      {...restProps}
    >
      <Styled.Scrollable>
        {boundChildren}
      </Styled.Scrollable>
    </Styled.Content>
  );
};

DropdownContent.defaultProps = defaultProps;

export default DropdownContent;
