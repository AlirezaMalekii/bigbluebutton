import React from 'react';
import PropTypes from 'prop-types';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import './index.scss';

const intlMessages = defineMessages({
  submit: {
    id: 'player.search.modal.submit',
    description: 'Label for the search submit button',
  },
});

const propTypes = {
  disabled: PropTypes.bool,
  handleOnClick: PropTypes.func,
};

const defaultProps = {
  disabled: false,
  handleOnClick: () => {},
};

const Footer = ({
  disabled,
  handleOnClick,
}) => {
  const intl = useIntl();

  return (
    <div className="search-footer">
      <button
        className="search-submit"
        disabled={disabled}
        onClick={() => handleOnClick()}
        type="button"
      >
        {intl.formatMessage(intlMessages.submit)}
      </button>
    </div>
  );
};

Footer.propTypes = propTypes;
Footer.defaultProps = defaultProps;

export default Footer;
