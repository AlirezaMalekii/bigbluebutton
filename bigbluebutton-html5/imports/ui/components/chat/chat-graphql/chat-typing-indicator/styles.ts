import styled from 'styled-components';
import { colorGrayDark } from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmaller, fontSizeBase } from '/imports/ui/stylesheets/styled-components/typography';

const SingleTyper = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: bold;
  font-size: ${fontSizeSmaller};
  max-width: 70%;
`;

const CoupleTyper = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: bold;
  font-size: ${fontSizeSmaller};
  max-width: 25%;
`;

const TypingIndicator = styled.span`
  display: flex;
  flex-direction: row;

  > span {
    display: block;
    margin-right: 0.05rem;
    margin-left: 0.05rem;
  }

  text-align: left;
  [dir="rtl"] & {
    text-align: right;
  }
`;

const TypingIndicatorWrapper = styled.div`
  font-size: calc(${fontSizeBase} * .75);
  color: ${colorGrayDark};
  text-align: left;
  vertical-align: top;
  padding: 0.2rem 0 0.3rem;
  height: auto;
  max-height: none;
  min-height: 1.25rem;
  line-height: 1.35;
  overflow-y: visible;
  flex-shrink: 0;

  &:empty {
    display: none;
  }
`;

export default {
  SingleTyper,
  CoupleTyper,
  TypingIndicator,
  TypingIndicatorWrapper,
};
