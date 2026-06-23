import React, { useEffect, useState } from 'react';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomPlatformLogo from './SkyroomPlatformLogo';
import SkyroomHeaderLogo from './SkyroomHeaderLogo';
import Styled from './styles';

type SkyroomHeaderLogosProps = {
  placement?: 'header' | 'footer';
};

const SkyroomHeaderLogos: React.FC<SkyroomHeaderLogosProps> = ({ placement = 'header' }) => {
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport());

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!isSkyroomColumnLayout()) return null;

  const footerIconOnly = placement === 'footer' && isMobile;

  const logos = (
    <Styled.Group data-test="skyroomHeaderLogos">
      <SkyroomPlatformLogo iconOnly={footerIconOnly} />
      {!footerIconOnly && <SkyroomHeaderLogo />}
    </Styled.Group>
  );

  if (placement === 'footer') {
    return <Styled.FooterSlot>{logos}</Styled.FooterSlot>;
  }

  return logos;
};

export default SkyroomHeaderLogos;
