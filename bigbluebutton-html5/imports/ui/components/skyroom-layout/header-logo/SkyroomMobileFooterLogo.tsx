import React, { useEffect, useState } from 'react';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomPlatformLogo from './SkyroomPlatformLogo';
import Styled from './styles';

/**
 * Icon-only platform mark for the mobile actions bar (left edge, vertically centered).
 * Rendered as an absolute sibling of the action-button row, so it never changes
 * the footer flex layout.
 */
const SkyroomMobileFooterLogo: React.FC = () => {
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport());
  const [columnOn, setColumnOn] = useState(isSkyroomColumnLayout());
  const [layoutMobile, setLayoutMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const layout = document.getElementById('layout');
    if (!layout) return undefined;

    const sync = () => {
      setColumnOn(isSkyroomColumnLayout());
      setLayoutMobile(layout.hasAttribute('data-skyroom-mobile'));
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(layout, {
      attributes: true,
      attributeFilter: ['data-skyroom-column', 'data-skyroom-mobile'],
    });

    return () => observer.disconnect();
  }, []);

  if (!columnOn || (!isMobile && !layoutMobile)) return null;

  return (
    <Styled.FooterSlot
      data-mobile-footer="true"
      data-in-actions-bar="true"
    >
      <Styled.Group data-test="skyroomHeaderLogos">
        <SkyroomPlatformLogo iconOnly />
      </Styled.Group>
    </Styled.FooterSlot>
  );
};

export default SkyroomMobileFooterLogo;
