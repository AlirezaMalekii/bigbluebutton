import React from 'react';
import { defineMessages, useIntl } from 'react-intl';

type SkyroomSpinnerSize = 'sm' | 'md' | 'lg';

interface SkyroomSpinnerProps {
  size?: SkyroomSpinnerSize;
  className?: string;
  'data-test'?: string;
}

const intlMessages = defineMessages({
  loading: {
    id: 'app.skyroom.loading',
    description: 'Accessible loading status',
  },
});

const SkyroomSpinner: React.FC<SkyroomSpinnerProps> = ({
  size = 'md',
  className = '',
  'data-test': dataTest,
}) => {
  const intl = useIntl();

  return (
    <span
      className={`skyroom-spinner skyroom-spinner--${size} ${className}`.trim()}
      role="status"
      aria-label={intl.formatMessage(intlMessages.loading)}
      data-test={dataTest}
    >
      <span className="skyroom-spinner__ring" />
    </span>
  );
};

export default SkyroomSpinner;
