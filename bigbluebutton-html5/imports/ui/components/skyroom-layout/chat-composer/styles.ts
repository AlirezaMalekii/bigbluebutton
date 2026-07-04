import styled from 'styled-components';
import TextareaAutosize from 'react-autosize-textarea';
import Button from '/imports/ui/components/common/button/component';

/** Skyroom public chat — compact standard row: [ input + emoji ] [ send ] */
export const Form = styled.form`
  flex-shrink: 0;
  width: 100%;
  margin: 0;
  padding: 2px 10px 4px;
  border: none;
  border-top: 1px solid rgba(218, 230, 245, 0.08);
  background: transparent;
  position: relative;
  box-sizing: border-box;
`;

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 34px;
  padding: 2px 4px 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;

  &:hover {
    border-color: rgba(80, 220, 220, 0.25);
  }

  &:focus-within {
    border-color: rgba(80, 220, 220, 0.45);
    box-shadow: none;
    background: rgba(0, 0, 0, 0.3);
  }

  [dir='rtl'] & {
    padding: 2px 8px 2px 3px;
  }
`;

export const InputWrapper = styled.div`
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
`;

export const Textarea = styled(TextareaAutosize)`
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  color: var(--skyroom-panel-text, #eef4fb);
  font-size: 13px;
  line-height: 1.4;
  min-height: 32px;
  max-height: 72px;
  padding: 6px 0;
  margin: 0;
  resize: none;
  text-align: start;
  font-family: inherit;

  &::placeholder {
    color: rgba(198, 208, 220, 0.62);
    opacity: 1;
  }

  &:disabled,
  &[disabled] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:focus,
  &:focus-visible {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
`;

// @ts-ignore — Button is JS
export const EmojiButton = styled(Button)`
  flex: 0 0 auto;
  align-self: center;
  margin: 0;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0 !important;
  border: none !important;
  border-radius: 10px !important;
  background: transparent !important;
  box-shadow: none !important;
  line-height: 1 !important;
  transition: background-color 120ms ease, color 120ms ease;
  transform: none !important;

  & i,
  & [class^='icon-bbb-'] {
    color: var(--skyroom-panel-text-dim, #7b8798) !important;
    font-size: 0.95rem !important;
    margin: 0 !important;
    transform: none !important;
  }

  &:hover,
  &:focus-visible {
    background: rgba(80, 220, 220, 0.08) !important;
    border-color: transparent !important;
    box-shadow: none !important;
    filter: none !important;
    outline: none !important;
  }

  &:hover i,
  &:focus-visible i,
  &:hover [class^='icon-bbb-'],
  &:focus-visible [class^='icon-bbb-'] {
    color: var(--skyroom-panel-text-muted, #aab6c7) !important;
  }
`;

// @ts-ignore — Button is JS
export const SendButton = styled(Button)`
  flex: 0 0 auto;
  align-self: center;
  margin: 0;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0 !important;
  border: 1px solid rgba(80, 220, 220, 0.2) !important;
  border-radius: 10px !important;
  background: linear-gradient(
    180deg,
    rgba(80, 220, 220, 0.34),
    rgba(42, 182, 182, 0.24)
  ) !important;
  box-shadow: none !important;
  line-height: 1 !important;
  transition:
    all 0.18s ease !important;
  transform: none !important;

  & > i,
  & > [class^='icon-bbb-'] {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  & > span {
    display: none !important;
  }

  & i,
  & [class^='icon-bbb-'] {
    color: #fff !important;
    margin: 0 !important;
    font-size: 0.76rem !important;
    transform: none !important;
  }

  /* RTL: mirror the paper-plane icon so it points left (toward the start). */
  [dir='rtl'] & i,
  [dir='rtl'] & [class^='icon-bbb-'] {
    transform: scaleX(-1) !important;
  }

  &:hover,
  &:focus-visible {
    background: linear-gradient(180deg, rgba(96, 230, 230, 0.42), rgba(60, 198, 198, 0.28)) !important;
    border-color: rgba(80, 220, 220, 0.32) !important;
    box-shadow: none !important;
    filter: none !important;
    outline: none !important;
    transform: translateY(-1px);
  }

  &:active:not([aria-disabled='true']):not(:disabled) {
    background: linear-gradient(180deg, rgba(70, 204, 204, 0.3), rgba(45, 170, 170, 0.22)) !important;
    transform: translateY(0);
  }

  &[aria-disabled='true'],
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: var(--skyroom-panel-accent, #20c7bb) !important;
  }
`;

export const ErrorText = styled.div`
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.3;
  color: var(--skyroom-panel-text-dim, rgba(198, 208, 220, 0.62));
  text-align: start;
`;

export default {
  Form,
  Row,
  InputWrapper,
  Textarea,
  EmojiButton,
  SendButton,
  ErrorText,
};
