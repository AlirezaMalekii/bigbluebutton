import styled from 'styled-components';

import { smPaddingX, lgPaddingY } from '/imports/ui/stylesheets/styled-components/general';

import {
  colorGray,
  colorPrimary,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';

export const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${lgPaddingY};
  margin-top: ${smPaddingX};
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
`;

export const SmallTitle = styled.h2`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0;
  color: ${colorGray};
  flex: 0 0 auto;
  margin: 0;
  min-width: 0;
  order: 0;

  & > span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
    white-space: nowrap;
  }
`;

export const TitleText = styled.span`
  flex-shrink: 0;
`;

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
