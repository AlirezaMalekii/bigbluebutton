import styled from 'styled-components';
import {
  PanelHeaderContainer,
  PanelTitle,
  PanelTitleButton,
  PanelTitleText,
} from '../panel-chrome/styles';

const Container = styled(PanelHeaderContainer)`
  flex-wrap: wrap;
  align-content: flex-start;
  row-gap: 6px;
`;

export default {
  Container,
  SmallTitle: PanelTitle,
  TitleButton: PanelTitleButton,
  TitleText: PanelTitleText,
};
