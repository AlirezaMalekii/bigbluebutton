import React from 'react';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomConnectionIcon from '/imports/ui/components/skyroom-layout/connection-icon/SkyroomConnectionIcon';
import Styled from './styles';

const STATS = {
  critical: {
    bars: 1,
  },
  danger: {
    bars: 2,
  },
  warning: {
    bars: 3,
  },
  normal: {
    bars: 4,
  },
};

const DefaultIcon = ({ level, grayscale }) => (
  <Styled.SignalBars id="connectionBars" level={level} grayscale={grayscale}>
    <Styled.FirstBar />
    <Styled.SecondBar active={STATS[level]?.bars >= 2} />
    <Styled.ThirdBar active={STATS[level]?.bars >= 3} />
    <Styled.FourthBar active={STATS[level]?.bars >= 4} />
  </Styled.SignalBars>
);

const Icon = ({ level, grayscale, connected = true }) => {
  if (isSkyroomTheme()) {
    return (
      <SkyroomConnectionIcon
        level={level}
        connected={connected}
      />
    );
  }

  return <DefaultIcon level={level} grayscale={grayscale} />;
};

export default Icon;
