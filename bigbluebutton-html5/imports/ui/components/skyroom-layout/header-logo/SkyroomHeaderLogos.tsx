import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [actionsBarEl, setActionsBarEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (placement !== 'footer' || !isMobile) {
      setActionsBarEl(null);
      return undefined;
    }

    const resolveTarget = () => document.getElementById('ActionsBar');

    setActionsBarEl(resolveTarget());

    const observer = new MutationObserver(() => {
      setActionsBarEl(resolveTarget());
    });
    const layout = document.getElementById('layout');
    if (layout) {
      observer.observe(layout, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [placement, isMobile]);

  if (!isSkyroomColumnLayout()) return null;

  const footerIconOnly = placement === 'footer' && isMobile;

  const logos = (
    <Styled.Group data-test="skyroomHeaderLogos">
      <SkyroomPlatformLogo iconOnly={footerIconOnly} />
      {!footerIconOnly && <SkyroomHeaderLogo />}
    </Styled.Group>
  );

  if (placement === 'footer') {
    const slot = (
      <Styled.FooterSlot data-in-actions-bar={isMobile && actionsBarEl ? 'true' : undefined}>
        {logos}
      </Styled.FooterSlot>
    );

    if (isMobile && actionsBarEl) {
      return createPortal(slot, actionsBarEl);
    }

    return slot;
  }

  return logos;
};

export default SkyroomHeaderLogos;
