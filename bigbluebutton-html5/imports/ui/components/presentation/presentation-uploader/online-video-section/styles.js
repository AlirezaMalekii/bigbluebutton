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
  margin-bottom: 0;
  padding: 10px 14px;
  flex-shrink: 0;

  &[data-collapsed="true"] {
    padding-bottom: 10px;
  }

  @media (max-width: 640px) {
    padding: 8px 10px;
    border-radius: 10px;

    &[data-collapsed="true"] {
      padding-bottom: 8px;
    }
  }
`;

const SectionTitle = styled.h4`
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: ${skyroomText};

  @media (max-width: 640px) {
    font-size: 0.75rem;
    margin-bottom: 6px;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 0;
  flex-wrap: wrap;

  &:has(+ *) {
    margin-bottom: 8px;
  }
`;

const ModeButton = styled.button`
  flex: 1 1 auto;
  min-width: 100px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? colorPrimary : skyroomBorder)};
  background: ${({ $active }) => ($active ? 'rgba(32, 199, 187, 0.18)' : 'transparent')};
  color: ${({ $active }) => ($active ? colorWhite : skyroomTextMuted)};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  @media (max-width: 640px) {
    min-width: 0;
    padding: 5px 8px;
    font-size: 0.7rem;
  }

  &:hover {
    border-color: ${colorPrimary};
    color: ${colorWhite};
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${skyroomText};
  }
`;

const inputStyles = `
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(218, 230, 245, 0.14);
  background: rgba(8, 14, 24, 0.55);
  color: ${skyroomText};
  font-size: 0.75rem;
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
  min-height: 56px;
  max-height: 96px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.68rem;
  line-height: 1.4;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.45;
  color: ${skyroomTextMuted};

  @media (max-width: 640px) {
    font-size: 0.64rem;
    line-height: 1.35;
  }
`;

const HelpList = styled.div`
  margin: 0;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(32, 199, 187, 0.08);
  border: 1px solid rgba(32, 199, 187, 0.16);
  font-size: 0.68rem;
  line-height: 1.45;
  color: ${skyroomTextMuted};
  white-space: pre-line;

  @media (max-width: 640px) {
    padding: 5px 7px;
    font-size: 0.64rem;
  }
`;

const Error = styled.p`
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: ${colorDanger};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;

  .buttonWrapper button {
    min-height: 32px !important;
    padding: 6px 12px !important;
    font-size: 0.75rem !important;
  }

  @media (max-width: 640px) {
    gap: 6px;
    margin-top: 6px;

    .buttonWrapper {
      flex: 1 1 auto;
    }

    .buttonWrapper button {
      width: 100%;
      min-height: 30px !important;
      font-size: 0.72rem !important;
    }
  }
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
