import styled from 'styled-components';
import {
  overlayIndex,
  pollIndex,
  borderSize,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  fontSizeSmall,
  fontSizeLarge,
} from '/imports/ui/stylesheets/styled-components/typography';
import {
  colorBlueLight,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';
import { hasPhoneDimentions } from '/imports/ui/stylesheets/styled-components/breakpoints';
import Button from '/imports/ui/components/common/button/component';

// ─── Overlay ────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${overlayIndex};
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) 16px
    max(16px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background-color: rgba(7, 11, 20, 0.62);
`;

// ─── Main card ──────────────────────────────────────────────────────────────

const PollingContainer = styled.aside<{ autoWidth: boolean }>`
  pointer-events: auto;
  position: relative;
  z-index: ${pollIndex};
  flex-shrink: 0;
  width: min(22rem, 100%);
  max-height: min(85vh, 34rem);
  overflow-y: auto;
  overflow-x: hidden;

  background:
    radial-gradient(420px 220px at 12% -20%, rgba(20, 169, 158, 0.12), transparent 62%),
    linear-gradient(165deg, #1a2234 0%, #121a28 55%, #0e1522 100%);
  border: 1px solid rgba(32, 199, 187, 0.22);
  border-radius: var(--radius-lg, 16px);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;

  padding: calc(var(--space-6, 24px) + 4px) var(--space-5, 20px) var(--space-5, 20px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);

  color: var(--skyroom-text-primary, #e6edf7);
  text-align: center;
  -webkit-overflow-scrolling: touch;

  &:focus {
    outline: none;
    border-color: var(--skyroom-accent, #20c7bb);
  }

  @media ${hasPhoneDimentions} {
    width: min(21rem, 100%);
    max-height: min(82vh, 32rem);
    padding: calc(var(--space-5, 20px) + 4px) var(--space-4, 16px) var(--space-4, 16px);
    border-radius: 14px;
  }

  ${({ autoWidth }) => autoWidth && 'width: auto; max-width: min(28rem, 100%);'}
`;

// ─── Dismiss (close) button — poll/quiz answer modal ─────────────────────────

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--skyroom-accent-soft, rgba(32, 199, 187, 0.12));
  color: var(--skyroom-text-primary, #e6edf7);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover,
  &:focus-visible {
    outline: none;
    background: var(--skyroom-accent-hover-bg, rgba(32, 199, 187, 0.2));
  }
`;

// ─── Floating "reopen poll" pill (shown after the sheet is dismissed) ─────────

const ReopenPill = styled.button`
  position: fixed;
  z-index: ${pollIndex};
  inset-inline-end: 16px;
  bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--skyroom-accent-border, rgba(32, 199, 187, 0.36));
  border-radius: 999px;
  background: var(--skyroom-accent, #20c7bb);
  color: #06231f;
  font-size: 0.8125rem;
  font-weight: 700;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  pointer-events: auto;

  &:hover,
  &:focus-visible {
    outline: none;
    filter: brightness(1.06);
  }
`;

// ─── Question header ─────────────────────────────────────────────────────────

const QHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  text-align: start;
  padding-bottom: var(--space-2, 8px);
  border-bottom: 1px solid var(--skyroom-panel-border-token, rgba(20, 169, 158, 0.14));
`;

const QTitle = styled.p`
  margin: 0;
  padding: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--skyroom-accent, #20c7bb);
  line-height: 1;
`;

const QText = styled.div`
  margin: 0;
  color: var(--skyroom-text-primary, #e6edf7);
  word-break: break-word;
  white-space: pre-wrap;
  font-size: ${fontSizeLarge};
  font-weight: 500;
  line-height: 1.55;
`;

// ─── Default title (when no custom question text) ────────────────────────────

const PollingTitle = styled.p`
  margin: 0;
  padding: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--skyroom-accent, #20c7bb);
  line-height: 1;
  text-align: center;
`;

// ─── Button-answer grid ───────────────────────────────────────────────────────

const PollingAnswers = styled.div<{ removeColumns: boolean; stacked: boolean }>`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3, 12px);

  @media ${hasPhoneDimentions} {
    grid-template-columns: 1fr;
  }

  ${({ removeColumns }) => removeColumns && 'grid-template-columns: 1fr;'}

  ${({ stacked }) => stacked && `
    grid-template-columns: 1fr;
  `}
`;

const PollButtonWrapper = styled.div`
  width: 100%;
`;

// @ts-ignore Until everything in Typescript
const PollingButton = styled(Button)`
  width: 100%;
  min-height: 48px;
  border-radius: var(--radius-md, 12px) !important;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(255, 255, 255, 0.04) !important;
  color: var(--skyroom-text-primary, #e6edf7) !important;
  border: 1px solid rgba(32, 199, 187, 0.24) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease,
    transform 0.1s ease, box-shadow 0.15s ease !important;

  &:hover,
  &:focus-visible {
    background: rgba(32, 199, 187, 0.16) !important;
    border-color: rgba(32, 199, 187, 0.45) !important;
    color: ${colorWhite} !important;
    box-shadow: 0 4px 14px rgba(13, 136, 126, 0.22) !important;
  }

  &:active {
    transform: scale(0.98);
    background: rgba(13, 136, 126, 0.55) !important;
    border-color: var(--skyroom-brand-500, #0d887e) !important;
  }
`;

// ─── Typed response ───────────────────────────────────────────────────────────

const TypedResponseWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
`;

const TypedResponseInput = styled.input`
  color: var(--skyroom-text-primary, #e6edf7);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  font-size: 0.9375rem;
  line-height: 1.5;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: var(--skyroom-text-muted, rgba(230, 237, 247, 0.4));
  }

  &:focus {
    outline: none;
    border-color: var(--skyroom-accent, #20c7bb);
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight},
      0 0 0 1px var(--skyroom-accent, #20c7bb);
    background: rgba(255, 255, 255, 0.09);
  }
`;

// @ts-ignore Until everything in Typescript
const SubmitVoteButton = styled(Button)`
  width: 100%;
  min-height: 44px;
  border-radius: var(--radius-md, 12px) !important;
  font-size: 0.9375rem;
  font-weight: 600;
`;

// ─── Privacy/secret note ──────────────────────────────────────────────────────

const PollingSecret = styled.div`
  font-size: ${fontSizeSmall};
  color: var(--skyroom-text-secondary, rgba(230, 237, 247, 0.78));
  padding-top: var(--space-2, 8px);
  border-top: 1px solid var(--skyroom-panel-border-token, rgba(20, 169, 158, 0.14));
  text-align: center;
  line-height: 1.5;
`;

// ─── Multiple-response (checkbox) rows ────────────────────────────────────────

const MultipleResponseAnswersTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  width: 100%;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  min-height: 48px;
  padding: var(--space-3, 12px) var(--space-3, 12px);
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  text-align: start;
  border: 1px solid rgba(32, 199, 187, 0.16);
  background: rgba(255, 255, 255, 0.03);

  &[data-selected="true"] {
    background: rgba(32, 199, 187, 0.14);
    border-color: rgba(32, 199, 187, 0.38);
    box-shadow: 0 0 0 1px rgba(32, 199, 187, 0.12) inset;
  }

  &:hover {
    background: rgba(32, 199, 187, 0.1);
    border-color: rgba(32, 199, 187, 0.28);
  }
`;

const PollingCheckbox = styled.div`
  flex-shrink: 0;
`;

const MultipleResponseAnswersTableAnswerText = styled.div`
  text-align: start;
  color: var(--skyroom-text-primary, #e6edf7);
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.5;
  flex: 1;

  label {
    cursor: pointer;
    display: block;
    width: 100%;
  }
`;

// ─── Hidden a11y helpers (unchanged) ────────────────────────────────────────

const Hidden = styled.div`
  display: none;
`;

// ─── Legacy export (keep all names intact for component.tsx) ────────────────

export default {
  PollingTitle,
  PollButtonWrapper,
  PollingButton,
  Hidden,
  TypedResponseWrapper,
  TypedResponseInput,
  SubmitVoteButton,
  PollingSecret,
  MultipleResponseAnswersTable,
  PollingCheckbox,
  CheckboxContainer,
  MultipleResponseAnswersTableAnswerText,
  Overlay,
  QHeader,
  QTitle,
  QText,
  PollingContainer,
  PollingAnswers,
  CloseButton,
  ReopenPill,
};
