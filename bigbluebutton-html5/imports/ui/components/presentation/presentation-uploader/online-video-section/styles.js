import styled from 'styled-components';
import {
  colorDanger,
  colorPrimary,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';

const skyroomSurface = 'rgba(14, 22, 36, 0.72)';
const skyroomBorder = 'rgba(32, 199, 187, 0.22)';
const skyroomText = '#e8edf4';
const skyroomTextMuted = '#aab6c7';

const Section = styled.section`
  background: ${skyroomSurface};
  border: 1px solid ${skyroomBorder};
  border-radius: var(--radius-md, 12px);
  margin-bottom: var(--space-3, 12px);
  padding: var(--space-4, 16px) var(--space-5, 20px);
  flex-shrink: 0;
`;

const SectionTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 var(--space-3, 12px);
  color: ${skyroomText};
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-3, 12px);
  flex-wrap: wrap;
`;

const ModeButton = styled.button`
  flex: 1 1 auto;
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? colorPrimary : skyroomBorder)};
  background: ${({ $active }) => ($active ? 'rgba(32, 199, 187, 0.18)' : 'transparent')};
  color: ${({ $active }) => ($active ? colorWhite : skyroomTextMuted)};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: ${colorPrimary};
    color: ${colorWhite};
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: ${skyroomText};
  }
`;

const inputStyles = `
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(218, 230, 245, 0.14);
  background: rgba(8, 14, 24, 0.55);
  color: ${skyroomText};
  font-size: 0.8125rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colorPrimary};
    box-shadow: 0 0 0 2px rgba(32, 199, 187, 0.2);
  }

  &::placeholder {
    color: ${skyroomTextMuted};
    opacity: 0.85;
  }
`;

const TextInput = styled.input`
  ${inputStyles}
`;

const TextArea = styled.textarea`
  ${inputStyles}
  min-height: 96px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.45;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: ${skyroomTextMuted};
`;

const HelpList = styled.div`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(32, 199, 187, 0.08);
  border: 1px solid rgba(32, 199, 187, 0.16);
  font-size: 0.75rem;
  line-height: 1.55;
  color: ${skyroomTextMuted};
  white-space: pre-line;
`;

const Error = styled.p`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: ${colorDanger};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--space-3, 12px);
`;

export default {
  Section,
  SectionTitle,
  ModeToggle,
  ModeButton,
  InputGroup,
  TextInput,
  TextArea,
  Hint,
  HelpList,
  Error,
  Actions,
};
