import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Tooltip from '/imports/ui/components/common/tooltip/component';
import useSkyroomTheme from './hook';
import Styled from './styles';

const intlMessages = defineMessages({
  toggleToDark: {
    id: 'app.skyroom.themeToggle.toggleToDark',
    description: 'Tooltip on the theme toggle button when current theme is light',
    defaultMessage: 'Switch to dark mode',
  },
  toggleToLight: {
    id: 'app.skyroom.themeToggle.toggleToLight',
    description: 'Tooltip on the theme toggle button when current theme is dark',
    defaultMessage: 'Switch to light mode',
  },
  ariaToggle: {
    id: 'app.skyroom.themeToggle.aria',
    description: 'ARIA label for the theme toggle button',
    defaultMessage: 'Toggle color theme',
  },
});

const SunIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4.25" fill="currentColor" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line
        key={deg}
        x1="12"
        y1="2.5"
        x2="12"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        transform={`rotate(${deg} 12 12)`}
      />
    ))}
  </svg>
);

const MoonIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20.5 14.5A8 8 0 1 1 9.5 3.5a6.5 6.5 0 0 0 11 11Z"
      fill="currentColor"
    />
  </svg>
);

const ThemeToggle: React.FC = () => {
  const intl = useIntl();
  const { isDark, toggle } = useSkyroomTheme();

  const tooltipLabel = intl.formatMessage(
    isDark ? intlMessages.toggleToLight : intlMessages.toggleToDark,
  );
  const ariaLabel = intl.formatMessage(intlMessages.ariaToggle);

  return (
    <Tooltip title={tooltipLabel} position="bottom">
      <Styled.ToggleButton
        type="button"
        onClick={toggle}
        $isDark={isDark}
        aria-label={ariaLabel}
        aria-pressed={isDark}
        data-test="themeToggleBtn"
      >
        <Styled.IconWrap key={isDark ? 'moon' : 'sun'}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Styled.IconWrap>
      </Styled.ToggleButton>
    </Tooltip>
  );
};

export default ThemeToggle;
