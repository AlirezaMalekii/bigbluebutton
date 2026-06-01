import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import {
  borderRadius,
  borderSize,
  mdPaddingX,
  smPaddingX,
} from '/imports/ui/stylesheets/styled-components/general';
import {
} from '/imports/ui/stylesheets/styled-components/palette';

const modalText = 'var(--skyroom-modal-text, #eef4fb)';
const modalTextMuted = 'var(--skyroom-modal-text-muted, #aab6c7)';
const modalAccent = 'var(--skyroom-brand-400, #20c7bb)';
const modalAccentStrong = 'var(--skyroom-brand-500, #14a99e)';
const panelBg = 'rgba(13, 22, 38, 0.78)';
const panelBgStrong = 'rgba(10, 18, 32, 0.9)';
const panelBorder = 'rgba(137, 155, 180, 0.22)';
const inputBg = 'rgba(8, 14, 24, 0.8)';
const inputBorder = 'rgba(137, 155, 180, 0.35)';

const TimerActivationWrapper = styled.div`
  width: 100%;
  max-width: 54rem;
  margin: 0 auto;
  padding: ${smPaddingX} ${smPaddingX} 0.25rem;
  border-radius: calc(${borderRadius} + 6px);
  background:
    radial-gradient(circle at 8% -12%, rgba(34, 212, 199, 0.22), transparent 42%),
    radial-gradient(circle at 95% 122%, rgba(79, 70, 229, 0.2), transparent 44%),
    linear-gradient(160deg, rgba(8, 15, 29, 0.9) 0%, rgba(7, 19, 38, 0.9) 100%);
`;

const Intro = styled.p`
  margin: 0 0 ${mdPaddingX};
  color: ${modalTextMuted};
  line-height: 1.5;
  font-size: 0.93rem;
`;

const Panel = styled.section`
  border: 1px solid ${panelBorder};
  border-radius: calc(${borderRadius} + 3px);
  padding: ${mdPaddingX};
  margin-bottom: ${smPaddingX};
  background: linear-gradient(160deg, ${panelBg} 0%, ${panelBgStrong} 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${smPaddingX};
  font-size: 0.91rem;
  letter-spacing: 0.01em;
  color: ${modalText};
`;

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${smPaddingX};
`;

const ModeButton = styled.button<{ selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(${borderRadius} + 2px);
  border: 1px solid ${({ selected }) => (selected ? modalAccent : panelBorder)};
  background: ${({ selected }) => (selected
    ? 'linear-gradient(135deg, rgba(32, 199, 187, 0.2) 0%, rgba(20, 169, 158, 0.1) 100%)'
    : 'rgba(6, 12, 22, 0.72)')};
  color: ${({ selected }) => (selected ? modalAccent : modalTextMuted)};
  min-height: 2.7rem;
  cursor: pointer;
  font-weight: 700;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.2s ease;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 ${borderSize} rgba(32, 199, 187, 0.22);
  }

  &:hover {
    border-color: ${({ selected }) => (selected ? modalAccent : 'rgba(198, 208, 220, 0.45)')};
    color: ${({ selected }) => (selected ? modalAccent : modalText)};
  }
`;

const TimeInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${smPaddingX};
`;

const TimeField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const TimeLabel = styled.label`
  color: ${modalTextMuted};
  font-size: 0.82rem;
`;

const TimeInput = styled.input`
  border: 1px solid ${inputBorder};
  border-radius: calc(${borderRadius} + 2px);
  min-height: 2.8rem;
  padding: 0 0.65rem;
  font-size: 1.04rem;
  font-weight: 700;
  color: ${modalText};
  text-align: center;
  background: ${inputBg};
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:focus-visible {
    outline: none;
    border-color: ${modalAccent};
    box-shadow: 0 0 0 ${borderSize} rgba(32, 199, 187, 0.2);
    background: rgba(9, 17, 31, 0.96);
  }

  &::placeholder {
    color: rgba(170, 182, 199, 0.75);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: ${smPaddingX};
`;

const SelectField = styled.select`
  width: 100%;
  border: 1px solid ${inputBorder};
  border-radius: calc(${borderRadius} + 2px);
  min-height: 2.8rem;
  padding: 0 0.65rem;
  background: ${inputBg};
  color: ${modalText};
  font-weight: 600;

  &:focus-visible {
    outline: none;
    border-color: ${modalAccent};
    box-shadow: 0 0 0 ${borderSize} rgba(32, 199, 187, 0.2);
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${modalText};
  font-size: 0.92rem;

  input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    accent-color: ${modalAccentStrong};
    cursor: pointer;
  }
`;

const Preview = styled.div`
  border-radius: calc(${borderRadius} + 2px);
  border: 1px solid rgba(32, 199, 187, 0.24);
  background: linear-gradient(135deg, rgba(11, 36, 64, 0.9) 0%, rgba(10, 64, 72, 0.62) 100%);
  padding: ${mdPaddingX};
  margin-bottom: ${mdPaddingX};
`;

const PreviewTitle = styled.span`
  display: block;
  color: ${modalTextMuted};
  font-size: 0.83rem;
  margin-bottom: 0.25rem;
`;

const PreviewValue = styled.strong`
  color: ${modalText};
  font-size: 1.8rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
`;

const ValidationText = styled.span`
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: ${modalTextMuted};
`;

const SuccessText = styled.span`
  color: ${modalAccent};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${smPaddingX};
  padding-bottom: 0.2rem;
`;

// @ts-ignore — Button is JS
const ActionButton = styled(Button)`
  min-width: 8.5rem;
  border-radius: 999px;

  ${({ color }) => color === 'secondary' && `
    & > span {
      border-color: rgba(198, 208, 220, 0.45) !important;
      color: ${modalText} !important;
      background: rgba(17, 27, 44, 0.58) !important;
    }
  `}

  ${({ color }) => color === 'primary' && `
    & > span {
      background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72)) !important;
      color: #eefeff !important;
      border-color: transparent !important;
      box-shadow: 0 8px 20px rgba(20, 169, 158, 0.28);
    }
  `}
`;

export default {
  TimerActivationWrapper,
  Intro,
  Panel,
  SectionTitle,
  ModeGrid,
  ModeButton,
  TimeInputs,
  TimeField,
  TimeLabel,
  TimeInput,
  SettingsGrid,
  SelectField,
  CheckboxRow,
  Preview,
  PreviewTitle,
  PreviewValue,
  ValidationText,
  SuccessText,
  Actions,
  ActionButton,
};
