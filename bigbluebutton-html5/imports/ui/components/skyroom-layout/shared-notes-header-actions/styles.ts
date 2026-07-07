import styled from 'styled-components';
import { PanelOptionsGroup } from '../panel-chrome/styles';

const OptionsGroup = styled(PanelOptionsGroup)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
`;

export default {
  OptionsGroup,
};
