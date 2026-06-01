import React from 'react';
import Styled from './styles';

const CustomLogo = ({ CustomLogoUrl }) => (
  <div>
    <Styled.Branding data-test="brandingArea">
      <img src={CustomLogoUrl} alt="custom branding logo" />
    </Styled.Branding>
    <Styled.Separator />
  </div>
);

export default CustomLogo;
