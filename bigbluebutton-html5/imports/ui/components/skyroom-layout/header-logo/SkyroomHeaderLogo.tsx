import React, { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { isDarkThemeEnabled } from '/imports/ui/components/app/service';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import Styled from './styles';

const intlMessages = defineMessages({
  logoAlt: {
    id: 'app.skyroom.headerLogo.alt',
    description: 'Alt text for custom meeting logo in header',
  },
  logoLinkAria: {
    id: 'app.skyroom.headerLogo.linkAria',
    description: 'Accessible label for clickable meeting logo link',
  },
});

const SkyroomHeaderLogo: React.FC = () => {
  const intl = useIntl();
  const [darkMode, setDarkMode] = useState(isDarkThemeEnabled());

  useEffect(() => {
    const handleDarkModeChange = (event: Event) => {
      const { enabled } = (event as CustomEvent<{ enabled: boolean }>).detail;
      setDarkMode(enabled);
    };

    window.addEventListener('darkmodechange', handleDarkModeChange);
    return () => window.removeEventListener('darkmodechange', handleDarkModeChange);
  }, []);

  const { data: meeting } = useMeeting((m) => ({
    customLogoUrl: m.customLogoUrl,
    customDarkLogoUrl: m.customDarkLogoUrl,
    loginUrl: m.loginUrl,
  }));

  if (!isSkyroomColumnLayout()) return null;

  const customLogoUrl = meeting?.customLogoUrl?.trim() ?? '';
  const customDarkLogoUrl = meeting?.customDarkLogoUrl?.trim() ?? '';
  const loginUrl = meeting?.loginUrl?.trim() ?? '';

  const logoUrl = darkMode && customDarkLogoUrl ? customDarkLogoUrl : customLogoUrl;
  if (!logoUrl) return null;

  const image = (
    <Styled.LogoImage
      src={logoUrl}
      alt={intl.formatMessage(intlMessages.logoAlt)}
      draggable={false}
    />
  );

  if (loginUrl) {
    return (
      <Styled.Wrap data-test="skyroomHeaderLogo">
        <Styled.Link
          href={loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={intl.formatMessage(intlMessages.logoLinkAria)}
        >
          {image}
        </Styled.Link>
      </Styled.Wrap>
    );
  }

  return (
    <Styled.Wrap data-test="skyroomHeaderLogo">
      <Styled.Plate>{image}</Styled.Plate>
    </Styled.Wrap>
  );
};

export default SkyroomHeaderLogo;
