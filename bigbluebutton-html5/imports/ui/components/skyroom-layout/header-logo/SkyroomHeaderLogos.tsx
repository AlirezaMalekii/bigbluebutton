import React, { useEffect, useState } from 'react';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomPlatformLogo from './SkyroomPlatformLogo';
import Styled from './styles';

type SkyroomHeaderLogosProps = {
  placement?: 'header' | 'footer';
};

const SkyroomHeaderLogos: React.FC<SkyroomHeaderLogosProps> = ({ placement = 'header' }) => {
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport());
  const [layoutMobile, setLayoutMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const layout = document.getElementById('layout');
    if (!layout) return undefined;

    const syncLayoutMobile = () => {
      setLayoutMobile(layout.hasAttribute('data-skyroom-mobile'));
    };

    syncLayoutMobile();
    const observer = new MutationObserver(syncLayoutMobile);
    observer.observe(layout, {
      attributes: true,
      attributeFilter: ['data-skyroom-mobile'],
    });

    return () => observer.disconnect();
  }, []);

  if (!isSkyroomColumnLayout()) return null;

  const footerIconOnly = placement === 'footer' && (isMobile || layoutMobile);

  const logos = (
    <Styled.Group data-test="skyroomHeaderLogos">
      <SkyroomPlatformLogo iconOnly={footerIconOnly} />
    </Styled.Group>
  );

  if (placement === 'footer') {
    // Mobile footer logo is rendered inside #ActionsBar (see SkyroomMobileFooterLogo).
    if (footerIconOnly) return null;

    return (
      <Styled.FooterSlot>
        {logos}
      </Styled.FooterSlot>
    );
  }

  return logos;
};

export default SkyroomHeaderLogos;
