import React, { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { resolveSkyroomMeetingLogo } from './resolveMeetingLogo';
import Styled from './styles';

const intlMessages = defineMessages({
  safemeetAlt: {
    id: 'app.skyroom.platformLogo.alt',
    description: 'Alt text for SafeMeet platform logo in header',
  },
  safemeetLinkAria: {
    id: 'app.skyroom.platformLogo.linkAria',
    description: 'Accessible label for clickable SafeMeet logo link',
  },
  roomeetAlt: {
    id: 'app.skyroom.platformLogo.roomeetAlt',
    description: 'Alt text for RooMeet platform logo in header',
  },
  roomeetLinkAria: {
    id: 'app.skyroom.platformLogo.roomeetLinkAria',
    description: 'Accessible label for clickable RooMeet logo link',
  },
  customAlt: {
    id: 'app.skyroom.headerLogo.alt',
    description: 'Alt text for custom meeting logo in header',
  },
  customLinkAria: {
    id: 'app.skyroom.headerLogo.linkAria',
    description: 'Accessible label for clickable custom meeting logo link',
  },
});

type SkyroomPlatformLogoProps = {
  iconOnly?: boolean;
  hideTagline?: boolean;
};

const SkyroomPlatformLogo: React.FC<SkyroomPlatformLogoProps> = ({
  iconOnly = false,
  hideTagline = false,
}) => {
  const intl = useIntl();
  const [darkMode, setDarkMode] = useState(true);

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

  const logo = resolveSkyroomMeetingLogo({
    customLogoUrl: meeting?.customLogoUrl?.trim() ?? '',
    customDarkLogoUrl: meeting?.customDarkLogoUrl?.trim() ?? '',
    loginUrl: meeting?.loginUrl?.trim() ?? '',
    darkMode,
    preferIcon: iconOnly,
    hideTagline,
  });

  const altId = {
    custom: intlMessages.customAlt,
    roomeet: intlMessages.roomeetAlt,
    safemeet: intlMessages.safemeetAlt,
  }[logo.source];
  const linkAriaId = {
    custom: intlMessages.customLinkAria,
    roomeet: intlMessages.roomeetLinkAria,
    safemeet: intlMessages.safemeetLinkAria,
  }[logo.source];
  const alt = intl.formatMessage(altId);
  const linkAria = intl.formatMessage(linkAriaId);

  const image = (
    <Styled.PlatformLogoImage
      src={logo.src}
      alt={alt}
      draggable={false}
      $iconOnly={logo.iconOnly}
    />
  );

  if (!logo.href) {
    return (
      <Styled.PlatformWrap
        data-test="skyroomPlatformLogo"
        data-logo-source={logo.source}
        data-icon-only={logo.iconOnly ? 'true' : undefined}
        data-hide-tagline={hideTagline ? 'true' : undefined}
      >
        {image}
      </Styled.PlatformWrap>
    );
  }

  return (
    <Styled.PlatformWrap
      data-test="skyroomPlatformLogo"
      data-logo-source={logo.source}
      data-icon-only={logo.iconOnly ? 'true' : undefined}
      data-hide-tagline={hideTagline ? 'true' : undefined}
    >
      <Styled.PlatformLink
        href={logo.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={linkAria}
        $iconOnly={logo.iconOnly}
      >
        {image}
      </Styled.PlatformLink>
    </Styled.PlatformWrap>
  );
};

export default SkyroomPlatformLogo;
