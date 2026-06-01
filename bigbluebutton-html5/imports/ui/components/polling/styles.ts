import styled from 'styled-components';
import {
  mdPaddingY,
  smPaddingY,
  jumboPaddingY,
  smPaddingX,
  borderRadius,
  pollWidth,
  pollSmMargin,
  overlayIndex,
  overlayOpacity,
  pollIndex,
  lgPaddingY,
  pollColAmount,
  borderSize,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  fontSizeSmall,
  fontSizeBase,
  fontSizeLarge,
} from '/imports/ui/stylesheets/styled-components/typography';
import {
  colorText,
  colorBlueLight,
  colorGrayLighter,
  colorGrayDark,
  colorWhite,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';
import { hasPhoneDimentions } from '/imports/ui/stylesheets/styled-components/breakpoints';
import Button from '/imports/ui/components/common/button/component';

const PollingTitle = styled.h1`
  white-space: nowrap;
  padding-bottom: ${mdPaddingY};
  padding-top: ${mdPaddingY};
  font-size: ${fontSizeSmall};
  margin: 0;
  padding: 0;
  font-weight: 600;
`;

const PollButtonWrapper = styled.div`
  text-align: center;
  padding: ${smPaddingY};
  width: 100%;
`;

// @ts-ignore Until everything in Typescript
const PollingButton = styled(Button)`
  width: 100%;
  max-width: 9em;

  @media ${hasPhoneDimentions} {
    max-width: none;
  }
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Hidden = styled.div`
  display: none;
`;

const TypedResponseWrapper = styled.div`
  margin: ${jumboPaddingY} 0.5rem 0.5rem 0.5rem;
  display: flex;
  flex-flow: column;
`;

const TypedResponseInput = styled.input`
  &:focus {
    outline: none;
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight},
      inset 0 0 0 1px ${colorPrimary};
  }

  color: ${colorText};
  -webkit-appearance: none;
  padding: calc(${smPaddingY} * 2.5) calc(${smPaddingX} * 1.25);
  border-radius: ${borderRadius};
  font-size: ${fontSizeBase};
  border: 1px solid ${colorGrayLighter};
  box-shadow: 0 0 0 1px ${colorGrayLighter};
  margin-bottom: 1rem;
`;

// @ts-ignore Until everything in Typescript
const SubmitVoteButton = styled(Button)`
  font-size: ${fontSizeBase};
`;

const PollingSecret = styled.div`
  font-size: ${fontSizeSmall};
  max-width: ${pollWidth};
`;

const MultipleResponseAnswersTable = styled.table`
  margin-left: auto;
  margin-right: auto;
`;

const PollingCheckbox = styled.div`
  display: inline-block;
  margin-right: ${pollSmMargin};
`;

const CheckboxContainer = styled.tr`
  margin-bottom: ${pollSmMargin};
`;

const MultipleResponseAnswersTableAnswerText = styled.td`
  text-align: left;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${overlayIndex};
  pointer-events: auto;
  background-color: rgba(0, 0, 0, ${overlayOpacity});
  backdrop-filter: blur(2px);
`;

const QHeader = styled.span`
  text-align: left;
  position: relative;
  left: ${smPaddingY};
`;

const QTitle = styled.h1`
  font-size: ${fontSizeSmall};
  margin: 0;
  padding: 0;
  font-weight: 600;
`;

const QText = styled.div`
  color: ${colorText};
  word-break: break-word;
  white-space: pre-wrap;
  font-size: ${fontSizeLarge};
  max-width: ${pollWidth};
  padding-right: ${smPaddingX};
`;

const PollingContainer = styled.aside<{ autoWidth: boolean }>`
  pointer-events: auto;
  min-width: min(${pollWidth}, 90vw);
  width: min(32rem, 90vw);
  position: fixed;
  z-index: ${pollIndex};
  border: 1px solid ${colorGrayLighter};
  border-radius: ${borderRadius};
  box-shadow: ${colorGrayDark} 0 0 ${lgPaddingY};
  align-items: center;
  text-align: center;
  font-weight: 600;
  padding: ${mdPaddingY} ${smPaddingX};
  background-color: ${colorWhite};
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-height: min(90vh, 46rem);
  overflow-y: auto;

  &:focus {
    border: 1px solid ${colorPrimary};
  }

  @media ${hasPhoneDimentions} {
    width: min(30rem, 94vw);
    max-height: 94vh;
  }

  ${({ autoWidth }) => autoWidth
    && `
    width: auto;
  `}
`;

const PollingAnswers = styled.div<{ removeColumns: boolean; stacked: boolean }>`
  display: grid;
  grid-template-columns: repeat(${pollColAmount}, 1fr);

  @media ${hasPhoneDimentions} {
    grid-template-columns: repeat(1, 1fr);

    & div button {
      grid-column: 1;
    }
  }

  z-index: 1;

  ${({ removeColumns }) => removeColumns
    && `
    grid-template-columns: auto;
  `}

  ${({ stacked }) => stacked
    && `
    grid-template-columns: repeat(1, 1fr);

    & div button {
      max-width: none !important;
    }
  `}
`;

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
