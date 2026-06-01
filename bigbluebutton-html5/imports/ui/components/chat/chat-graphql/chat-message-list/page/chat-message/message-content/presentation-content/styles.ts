import styled from 'styled-components';

const skyroomText = 'var(--skyroom-text-primary, #eef4fb)';
const skyroomAccent = 'var(--skyroom-brand-400, #14a99e)';

export const ChatDowloadContainer = styled.div.attrs({
  'data-skyroom': 'chat-presentation-download',
})`
  display: flex;
  flex-flow: column;
  gap: 10px;
  padding: 12px 14px;
  margin: 4px 8px 6px;
  word-break: break-word;
  color: ${skyroomText};
  background: rgba(32, 199, 187, 0.1);
  border: 1px solid rgba(32, 199, 187, 0.28);
  border-inline-start: 3px solid ${skyroomAccent};
  border-radius: var(--radius-md, 12px);
  box-sizing: border-box;

  & > span:first-of-type {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.45;
    color: ${skyroomText};
  }
`;

export const ChatLink = styled.a`
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff !important;
  text-decoration: none;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));
  border: 1px solid rgba(32, 199, 187, 0.45);
  border-radius: var(--radius-sm, 8px);
  box-shadow: 0 4px 12px rgba(13, 136, 126, 0.28);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus {
    color: #fff !important;
    text-decoration: none;
    box-shadow: 0 6px 16px rgba(13, 136, 126, 0.38);
    transform: translateY(-1px);
  }

  [dir="rtl"] & {
    align-self: flex-start;
  }
`;

export default {
  ChatDowloadContainer,
  ChatLink,
};
