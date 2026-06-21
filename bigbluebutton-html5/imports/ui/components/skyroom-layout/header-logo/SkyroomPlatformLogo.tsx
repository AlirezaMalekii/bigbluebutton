import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  SKYROOM_PLATFORM_LOGO_PATH,
  SKYROOM_PLATFORM_URL,
} from '/imports/ui/components/skyroom-layout/white-label';
import Styled from './styles';

const intlMessages = defineMessages({
  logoAlt: {
    id: 'app.skyroom.platformLogo.alt',
    description: 'Alt text for SafeMeet platform logo in header',
  },
  logoLinkAria: {
    id: 'app.skyroom.platformLogo.linkAria',
    description: 'Accessible label for clickable platform logo link',
  },
});

const getPlatformLogoSrc = () => {
  const basename = window.meetingClientSettings?.public?.app?.basename ?? '';
  return `${basename}${SKYROOM_PLATFORM_LOGO_PATH}`;
};

const SkyroomPlatformLogo: React.FC = () => {
  const intl = useIntl();
  const alt = intl.formatMessage(intlMessages.logoAlt);

  return (
    <Styled.PlatformWrap data-test="skyroomPlatformLogo">
      <Styled.PlatformLink
        href={SKYROOM_PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={intl.formatMessage(intlMessages.logoLinkAria)}
      >
        <Styled.PlatformLogoObject
          data={getPlatformLogoSrc()}
          type="image/svg+xml"
          aria-label={alt}
        />
      </Styled.PlatformLink>
    </Styled.PlatformWrap>
  );
};

export default SkyroomPlatformLogo;
