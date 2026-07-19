import React from 'react';
import PropTypes from 'prop-types';
import Base from './base';
import Styled from './styles';

export default class Checkbox extends Base {
  render() {
    const {
      ariaLabel, ariaDesc, ariaDescribedBy, ariaLabelledBy, checked, disabled, label,
    } = this.props;

    const checkbox = (
      <Styled.Checkbox
        checked={checked}
        disabled={disabled}
        focusRipple
        inputProps={{
          'aria-label': ariaLabel,
          'aria-describedby': ariaDescribedBy,
          'aria-labelledby': ariaLabelledBy,
        }}
        onChange={this.handleChange}
        ref={this.element}
      />
    );

    return (
      <>
        {label ? (
          <Styled.Label
            label={label}
            control={checkbox}
          />
        ) : checkbox}
        <div id={ariaDescribedBy} hidden>{ariaDesc}</div>
      </>
    );
  }
}

Checkbox.propTypes = {
  ...Base.propTypes,
  checked: PropTypes.bool,
  ariaLabelledBy: PropTypes.string,
  ariaLabel: PropTypes.string,
  ariaDescribedBy: PropTypes.string,
  ariaDesc: PropTypes.string,
  label: PropTypes.node,
};

Checkbox.defaultProps = {
  ...Base.defaultProps,
  checked: false,
  ariaLabelledBy: null,
  ariaLabel: null,
  ariaDescribedBy: null,
  ariaDesc: null,
  label: null,
};
