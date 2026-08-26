import React from 'react';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { resolveLogoClickHref } from '/imports/ui/components/skyroom-layout/header-logo/resolveMeetingLogo';
import Styled from './styles';

const CustomLogo = ({ CustomLogoUrl }) => {
  const { data: meeting } = useMeeting((m) => ({
    loginUrl: m.loginUrl,
  }));
  const href = resolveLogoClickHref(meeting?.loginUrl ?? '');

  const image = (
    <img src={CustomLogoUrl} alt="custom branding logo" />
  );

  return (
    <div>
      <Styled.Branding data-test="brandingArea">
        {href ? (
          <Styled.BrandingLink
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {image}
          </Styled.BrandingLink>
        ) : image}
      </Styled.Branding>
      <Styled.Separator />
    </div>
  );
};

export default CustomLogo;
