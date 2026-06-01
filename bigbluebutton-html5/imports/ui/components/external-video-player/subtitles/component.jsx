import React from 'react';
import Styled from './styles';

const Subtitles = ({ toggleSubtitle, label }) => (
  <Styled.SubtitlesWrapper>
    <Styled.SubtitlesButton
      color="primary"
      icon="closed_caption"
      onClick={() => toggleSubtitle()}
      label={label}
      hideLabel
    />
  </Styled.SubtitlesWrapper>
);

export default Subtitles;
