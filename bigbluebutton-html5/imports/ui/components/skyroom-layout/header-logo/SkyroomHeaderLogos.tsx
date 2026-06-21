import React from 'react';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomPlatformLogo from './SkyroomPlatformLogo';
import SkyroomHeaderLogo from './SkyroomHeaderLogo';
import Styled from './styles';

const SkyroomHeaderLogos: React.FC = () => {
  if (!isSkyroomColumnLayout()) return null;

  return (
    <Styled.Group data-test="skyroomHeaderLogos">
      <SkyroomPlatformLogo />
      <SkyroomHeaderLogo />
    </Styled.Group>
  );
};

export default SkyroomHeaderLogos;
