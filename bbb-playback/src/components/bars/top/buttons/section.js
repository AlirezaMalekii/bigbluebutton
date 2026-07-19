import React from 'react';
import PropTypes from 'prop-types';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import Button from 'components/utils/button';
import { controls as config } from 'config';
import layout from 'utils/layout';

const intlMessages = defineMessages({
  section: {
    id: 'button.section.aria',
    description: 'Aria label for the section button',
  },
});

const propTypes = {
  section: PropTypes.bool,
  toggleSection: PropTypes.func,
};

const defaultProps = {
  section: true,
  toggleSection: () => {},
};

const Section = ({
  section,
  toggleSection,
}) => {
  const intl = useIntl();

  if (!layout.control || !config.section) return null;

  // Mirror chevrons in RTL so the control still points toward the side section.
  const isRTL = typeof document !== 'undefined' && document.dir === 'rtl';
  const icon = section
    ? (isRTL ? 'right' : 'left')
    : (isRTL ? 'left' : 'right');

  return (
    <Button
      aria={intl.formatMessage(intlMessages.section)}
      circle
      handleOnClick={toggleSection}
      icon={icon}
    />
  );
};

Section.propTypes = propTypes;
Section.defaultProps = defaultProps;

export default Section;
