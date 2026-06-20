import styled from 'styled-components';
import {
  overlayIndex,
  overlayOpacity,
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
  background-color: rgba(0, 0, 0, ${overlayOpacity});
  backdrop-filter: blur(4px);
`;

// ─── Main card ──────────────────────────────────────────────────────────────

const PollingContainer = styled.aside<{ autoWidth: boolean }>`
  pointer-events: auto;
  position: fixed;
  z-index: ${pollIndex};
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: min(34rem, 92vw);
  max-height: min(90vh, 48rem);
  overflow-y: auto;

  background: var(--skyroom-surface-2, #1a2436);
  border: 1px solid var(--skyroom-panel-border-token, rgba(20, 169, 158, 0.14));
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.40));

  padding: var(--space-6, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);

  color: var(--skyroom-text-primary, #e6edf7);
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--skyroom-accent, #20c7bb);
  }

  @media ${hasPhoneDimentions} {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transform: none;
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    padding: var(--space-5, 20px) var(--space-4, 16px)
      calc(var(--space-5, 20px) + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  ${({ autoWidth }) => autoWidth && 'width: auto;'}
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
  min-height: 44px;
  border-radius: var(--radius-md, 12px) !important;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--skyroom-accent-soft, rgba(32, 199, 187, 0.12)) !important;
  color: var(--skyroom-accent, #20c7bb) !important;
  border: 1px solid var(--skyroom-accent-border, rgba(32, 199, 187, 0.36)) !important;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;

  &:hover,
  &:focus-visible {
    background: var(--skyroom-accent-hover-bg, rgba(32, 199, 187, 0.18)) !important;
    border-color: var(--skyroom-accent, #20c7bb) !important;
    color: ${colorWhite} !important;
  }

  &:active {
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
  color: var(--skyroom-text-muted, rgba(230, 237, 247, 0.45));
  padding-top: var(--space-2, 8px);
  border-top: 1px solid var(--skyroom-panel-border-token, rgba(20, 169, 158, 0.14));
  text-align: center;
  line-height: 1.5;
`;

// ─── Multiple-response (checkbox) rows ────────────────────────────────────────

const MultipleResponseAnswersTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  width: 100%;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: background 0.12s ease;
  text-align: start;

  &:hover {
    background: var(--skyroom-accent-soft, rgba(32, 199, 187, 0.10));
  }
`;

const PollingCheckbox = styled.div`
  flex-shrink: 0;
`;

const MultipleResponseAnswersTableAnswerText = styled.div`
  text-align: start;
  color: var(--skyroom-text-primary, #e6edf7);
  font-size: 0.9375rem;
  line-height: 1.5;
  flex: 1;
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
};
