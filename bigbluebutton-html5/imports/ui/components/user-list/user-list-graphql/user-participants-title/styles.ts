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
  border: 1px solid var(--skyroom-accent-border, rgba(32, 199, 187, 0.36));
  border-radius: var(--radius-pill, 999px);
  box-shadow: var(--shadow-glow-sm, 0 0 0 1px rgba(20, 169, 158, 0.10));
  color: ${colorWhite};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  height: 1.4rem;
  justify-content: center;
  line-height: 1;
  min-width: 1.4rem;
  padding: 0 0.45rem;
`;

export default {
  Container,
  SmallTitle,
  TitleText,
  CountBadge,
};
