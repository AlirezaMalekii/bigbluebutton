import styled from 'styled-components';

interface ChatMessageProps {
  systemMsg?: boolean;
}

export const ChatMessage = styled.div<ChatMessageProps>`
  flex: 1;
  display: flex;
  flex-flow: row;
  flex-direction: column;
  unicode-bidi: plaintext;
  text-align: start;
  color: var(--skyroom-bubble-text, #dfe9f5);
  font-size: 13px;
  line-height: 1.4;
  font-weight: 400;
  word-break: break-word;

  & img {
    max-width: 100%;
    max-height: 100%;
  }

  & p {
    margin: 0;
    white-space: pre-wrap;
    color: inherit;
  }

  & pre:has(code), p code:not(pre > code) {
    background-color: rgba(7, 14, 24, 0.68);
    border: solid 1px rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 2px;
    margin: 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  & p code:not(pre > code) {
    color: #89dfd8;
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
  ChatMessage,
};
