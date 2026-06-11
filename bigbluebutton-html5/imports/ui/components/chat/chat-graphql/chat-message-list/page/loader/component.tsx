import React from 'react';
import SkyroomSpinner from '/imports/ui/components/skyroom-layout/loading/SkyroomSpinner';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import { CircularProgress } from '@mui/material';
import Styled from './styles';

const ChatPageLoading = () => (
  <Styled.ChatPageLoading>
    {isSkyroomTheme()
      ? <SkyroomSpinner size="sm" />
      : <CircularProgress />}
  </Styled.ChatPageLoading>
);

export default ChatPageLoading;
