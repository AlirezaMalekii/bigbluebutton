import React from 'react';

type SkyroomSpinnerSize = 'sm' | 'md' | 'lg';

interface SkyroomSpinnerProps {
  size?: SkyroomSpinnerSize;
  className?: string;
  'data-test'?: string;
}

const SkyroomSpinner: React.FC<SkyroomSpinnerProps> = ({
  size = 'md',
  className = '',
  'data-test': dataTest,
}) => (
  <span
    className={`skyroom-spinner skyroom-spinner--${size} ${className}`.trim()}
    role="status"
    aria-label="Loading"
    data-test={dataTest}
  >
    <span className="skyroom-spinner__ring" />
  </span>
);

export default SkyroomSpinner;
