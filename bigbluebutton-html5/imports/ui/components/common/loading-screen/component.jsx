import React from 'react';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomLoadingScreen from '/imports/ui/components/skyroom-layout/loading/SkyroomLoadingScreen';
import Styled from './styles';

const DefaultLoadingScreen = () => (
  <Styled.Background data-test="loadingScreen">
    <Styled.Spinner animations>
      <Styled.Bounce1 animations />
      <Styled.Bounce2 animations />
      <div />
    </Styled.Spinner>
  </Styled.Background>
);

const LoadingScreen = () => (
  isSkyroomTheme() ? <SkyroomLoadingScreen /> : <DefaultLoadingScreen />
);

export default LoadingScreen;
