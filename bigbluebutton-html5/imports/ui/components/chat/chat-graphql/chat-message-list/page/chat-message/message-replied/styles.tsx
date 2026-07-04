import styled from 'styled-components';
import {
  colorDangerDark,
  colorGrayLight,
  colorGrayLightest, colorOffWhite, colorPrimary, colorText, userListBg,
} from '/imports/ui/stylesheets/styled-components/palette';
import { smPadding } from '/imports/ui/stylesheets/styled-components/general';

const Container = styled.div`
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
  background-color: ${userListBg};
  box-shadow: inset 0 0 0 1px ${colorGrayLightest};
  padding: ${smPadding} 0.625rem;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  [dir='ltr'] & {
    border-right: 0.375rem solid ${colorPrimary};
  }

  [dir='rtl'] & {
    border-left: 0.375rem solid ${colorPrimary};
  }
`;

const Message = styled.div`
  line-height: 1.15;
  overflow: hidden;
  max-height: 2.4rem;
`;

const SenderName = styled.div`
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 1px;
  color: var(--skyroom-panel-accent, #20c7bb);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const DeleteMessage = styled.span`
  color: ${colorGrayLight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const HtmlContent = styled.div`
  color: ${colorText};
  font-size: 0.78rem;
  line-height: 1.2;
  max-height: 1.2rem;
  overflow: hidden;

  & img {
    max-width: 100%;
    max-height: 100%;
  }

  & p {
    margin: 0;
    white-space: pre-wrap;
  }

  & pre:has(code), p code:not(pre > code) {
    background-color: ${colorOffWhite};
    border: solid 1px ${colorGrayLightest};
    border-radius: 4px;
    padding: 2px;
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  & p code:not(pre > code) {
    color: ${colorDangerDark};
  }
  & h1 {
    font-size: 1.5em;
    margin: 0;
  }
  & h2 {
    font-size: 1.3em;
    margin: 0;
  }
  & h3 {
    font-size: 1.1em;
    margin: 0;
  }
  & h4 {
    margin: 0;
  }
  & h5 {
    margin: 0;
  }
  & h6 {
    margin: 0;
  }
`;

export default {
  Container,
  Message,
  DeleteMessage,
  HtmlContent,
  SenderName,
};
