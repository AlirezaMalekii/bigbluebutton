import styled from 'styled-components';
import {
  colorGrayLightest,
  colorGrayDark,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';
import { smPadding } from '/imports/ui/stylesheets/styled-components/general';

const WelcomeMessage = styled.div`
  font-size: 1.0rem;
  margin-bottom: 1rem;
  text-align: start;
  user-select: text;

  [dir='rtl'] & {
    text-align: right;
  }
`;

const Container = styled.div<{ isFullWidth: boolean }>`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
  text-align: start;

  [dir='rtl'] & {
    text-align: right;
  }

  & > div {
    flex: ${({ isFullWidth }) => (isFullWidth ? '1 1 100%' : '1 1 50%')};
    box-sizing: border-box;
    padding: 10px;
    overflow: auto;
    overflow-wrap: break-word;
  }

  & div p {
    margin: 0;
  }

  ${({ isFullWidth }) => !isFullWidth && `
    &::before {
      content: '';
      position: absolute;
      height: 50%;
      left: 50%;
      width: 1px;
      background-color: ${colorGrayLightest};
      transform: translateX(-50%);
    }
  `}

  & a {
    color: ${colorPrimary};
    text-decoration: none;

    &:focus {
      color: ${colorPrimary};
      text-decoration: underline;
    }
    &:hover {
      filter: brightness(90%);
      text-decoration: underline;
    }
    &:active {
      filter: brightness(85%);
      text-decoration: underline;
    }
    &:hover:focus {
      filter: brightness(90%);
      text-decoration: underline;
    }
    &:focus:active {
      filter: brightness(85%);
      text-decoration: underline;
    }
  }
`;

const JoinTitle = styled.h2`
  font-size: 0.9rem;
  text-transform: uppercase;
  color: ${colorGrayDark};
  font-weight: 600;
  text-align: start;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  user-select: text;

  [dir='rtl'] & {
    text-align: right;
  }
`;

const LtrValue = styled.span`
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-all;
  user-select: text;
`;

const LtrRow = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  user-select: text;

  [dir='rtl'] & {
    justify-content: flex-end;
  }
`;

/**
 * Native copy control — avoids BBB Button Tippy/hideLabel, which could trap
 * clicks over the whole session-details modal after copy on desktop.
 */
export const CopyButton = styled.button<{ $copied?: boolean }>`
  flex: 0 0 auto;
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ $copied }) => ($copied ? '#2ecc71' : colorPrimary)};
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  margin-inline-start: ${smPadding};

  i {
    font-size: 0.95rem;
    line-height: 1;
    pointer-events: none;
  }

  &:hover {
    filter: brightness(1.15);
  }

  &:focus-visible {
    outline: 2px solid ${colorPrimary};
    outline-offset: 2px;
  }
`;

export const Chevron = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid white;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
`;

export default {
  WelcomeMessage,
  Container,
  JoinTitle,
  LtrValue,
  LtrRow,
  CopyButton,
  Chevron,
};
