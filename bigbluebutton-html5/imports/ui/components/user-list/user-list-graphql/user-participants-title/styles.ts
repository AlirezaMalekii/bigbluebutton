import styled from 'styled-components';
import {
  PanelHeaderContainer,
  PanelTitle,
  PanelTitleText,
} from '/imports/ui/components/skyroom-layout/panel-chrome/styles';
import {
  colorPrimary,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';

export const Container = PanelHeaderContainer;

export const SmallTitle = PanelTitle;

export const TitleText = PanelTitleText;

export const CountBadge = styled.span`
  align-items: center;
  background: linear-gradient(
    135deg,
    var(--skyroom-brand-500, ${colorPrimary}) 0%,
    var(--skyroom-brand-700, #075952) 100%
  );
  border-radius: 999px;
  color: ${colorWhite};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  justify-content: center;
  line-height: 1;
  min-width: 1.1rem;
  padding: 0.14rem 0.32rem;
`;

export default {
  Container,
  SmallTitle,
  TitleText,
  CountBadge,
};
