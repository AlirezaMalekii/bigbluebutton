import styled, { css, keyframes } from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import {
  smPaddingX,
  smPaddingY,
  lgPaddingX,
  borderRadius,
  borderSize,
  pollSmMargin,
  pollMdMargin,
  mdPaddingX,
  pollStatsElementWidth,
  pollResultWidth,
  borderSizeLarge,
  borderRadiusRounded,
  mdPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorText,
  colorBlueLight,
  colorGray,
  colorGrayLight,
  colorGrayLighter,
  colorGrayLightest,
  colorDanger,
  colorWarning,
  colorHeading,
  colorPrimary,
  colorGrayDark,
  colorWhite,
  pollBlue,
  pollStatsBorderColor,
  SegmentedButtonRingOffsetShadow,
  SegmentedButtonRingShadow,
  SegmentedButtonBoxShadowSm,
  slate900,
  darkCyanLime,
  colorSelectedCorrectAnswerText,
  colorSelectedCorrectAnswerBg,
  colorSelectedCorrectAnswerTextActive,
  colorSelectedCorrectAnswerBgActive,
  colorGreen600,
  colorGreen100,
  colorBlueLighter,
  colorBlueLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  fontSizeBase,
  fontSizeSmall,
  fontSizeSmaller,
  lineHeightComputed,
} from '/imports/ui/stylesheets/styled-components/typography';

const ToggleLabel = styled.span`
  margin-right: ${smPaddingX};

  [dir="rtl"] & {
    margin: 0 0 0 ${smPaddingX};
  }
`;

type PollOptionInputProps = {
  isCorrect?: boolean;
};

const PollOptionInput = styled.input<PollOptionInputProps>`
  margin: 0;

  &:focus {
    outline: none;
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight}, inset 0 0 0 1px ${colorPrimary};
  }

  width: 100%;
  color: ${colorText};
  -webkit-appearance: none;
  padding: calc(${smPaddingY} * 2) ${smPaddingX};
  border-radius: ${borderRadius};
  font-size: ${fontSizeBase};
  border: 1px solid ${colorGrayLighter};
  box-shadow: 0 0 0 1px ${colorGrayLighter};
  background: ${colorWhite};
  min-height: 2.75rem;

  ${({ isCorrect }) => isCorrect && ` 
    background-color: rgb(240, 253, 244);
    border-color: rgb(134 239 172 / 1);
  `}
`;
// @ts-ignore - Button is a JS Component
const DeletePollOptionButton = styled(Button)`
  font-size: ${fontSizeBase};
  flex: none;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border: 1px solid ${colorGrayLight};
  border-radius: 50%;
  background: ${colorWhite};
  color: ${colorPrimary};
  position: relative;
  & > i {
    font-size: 150%;
    color: ${colorPrimary};
  }
`;

const ErrorSpacer = styled.div`
  position: relative;
  height: 1.25rem;
`;

const InputError = styled(ErrorSpacer)`
  color: ${colorDanger};
  font-size: ${fontSizeSmall};
`;

const Instructions = styled.div`
  margin-bottom: ${lgPaddingX};
  color: ${colorText};
`;

type PollQuestionAreaProps = {
  hasError: boolean;
};

const PollQuestionArea = styled.textarea<PollQuestionAreaProps>`
  resize: none;

  &:focus {
    outline: none;
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight}, inset 0 0 0 1px ${colorPrimary};
  }

  width: 100%;
  color: ${colorText};
  -webkit-appearance: none;
  padding: calc(${smPaddingY} * 2) ${smPaddingX};
  border-radius: ${borderRadius};
  font-size: ${fontSizeBase};
  border: 1px solid ${colorGrayLighter};
  box-shadow: 0 0 0 1px ${colorGrayLighter};
  min-height: 7.5rem;
  line-height: 1.5;
  background: ${colorWhite};

  ${({ hasError }) => hasError && `
    border-color: ${colorDanger};
    box-shadow: 0 0 0 1px ${colorDanger};
  `}
`;

const PollQuestionAreaWrapper = styled.div`
  margin-bottom: ${mdPaddingX};
`;

const SectionHeading = styled.h4`
  margin-top: 0;
  font-weight: 600;
  color: ${colorHeading};
  margin-bottom: .5rem;
`;

const ResponseType = styled.div`
  display: flex;
  justify-content: space-between;
  flex-flow: wrap;
  gap: 0.65rem;
  overflow-wrap: break-word;
  position: relative;
  width: 100%;
  margin-bottom: ${mdPaddingX};

  & > button {
    position: relative;
    width: 100%;
  }
`;

// @ts-ignore - Button is a JS Component
const PollConfigButton = styled(Button)`
  border: solid ${colorGrayLight} 1px;
  min-height: 2.75rem;
  font-size: ${fontSizeBase};
  font-weight: 600;
  white-space: pre-wrap;
  width: 100%;
  margin-bottom: 0;
  border-radius: ${borderRadiusRounded};
  transition: box-shadow 0.15s ease, background-color 0.15s ease, transform 0.15s ease;

  & > span {
    &:hover {
      opacity: 1;
    }
  }

  ${({ selected }) => selected && `
    background-color: ${colorBlueLightest};
    color: ${colorPrimary};
    border-color: ${colorBlueLighter};
    font-size: ${fontSizeBase};

    &:hover,
    &:focus,
    &:active {
      background-color: ${colorGrayLightest} !important;
      box-shadow: none !important;
    }
  `}

  ${({ small }) => small && `
    width: 49% !important;
  `}

  ${({ full }) => full && `
    width: 100%;
  `}
`;

const PollParagraph = styled.div`
  color: ${colorText};
  margin-bottom: 0.85rem;
  line-height: 1.5;
`;

const PollCheckbox = styled.div`
  display: inline-block;
  margin-right: ${pollSmMargin};
  margin-bottom: ${pollMdMargin};
`;

// @ts-ignore - Button is a JS Component
const AddItemButton = styled(Button)`
  top: 1px;
  position: relative;
  display: block;
  width: 100%;
  text-align: center;
  color: ${colorPrimary};
  background: ${colorBlueLightest};
  border-radius: ${borderRadius};
  border: 1px solid ${colorBlueLighter};
  min-height: 2.5rem;
  padding-left: 0;
  padding-right: 0;
  font-size: ${fontSizeBase};
  white-space: pre-wrap;
  margin-top: .35rem;
  justify-content: center;

  &:hover {
    & > span {
      opacity: 1;
    }
  }
`;

const Row = styled.div`
  display: flex;
  flex-flow: wrap;
  flex-grow: 1;
  justify-content: space-between;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

const Warning = styled.div`
  color: ${colorWarning};
  font-size: ${fontSizeSmall};
`;

const CustomInputRow = styled.div`
  display: flex;
  flex-flow: row nowrap;
  flex-grow: 0;
  justify-content: flex-start;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 0.85rem;
  overflow: visible;

  label {
    margin-left: 0;
  }
`;

const Col = styled.div`
  display: flex;
  position: relative;
  flex-flow: column;
  flex-grow: 1;
  
  &:last-child {
    padding-right: 0;
    padding-left: 1rem;

    [dir="rtl"] & {
      padding-right: 0.1rem;
      padding-left: 0;
    }
  }
`;

const Toggle = styled.label`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

// @ts-ignore - Button is a JS Component
const StartPollBtn = styled(Button)`
  position: relative;
  width: 100%;
  min-height: 2.9rem;
  margin-top: 1.15rem;
  font-size: ${fontSizeBase};
  font-weight: 600;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  border-radius: ${borderRadiusRounded};

  &:hover {
    & > span {
      opacity: 1;
    }
  }
`;

const NoSlidePanelContainer = styled.div`
  color: ${colorGrayDark};
  text-align: center;
`;

// @ts-ignore - Button is a JS Component
const PollButton = styled(Button)`
  margin-top: ${smPaddingY};
  margin-bottom: ${smPaddingY};
  // background-color: ${colorWhite};
  box-shadow: 0 0 0 1px ${colorPrimary};
  color: ${colorWhite};
  background-color: ${colorPrimary}

  & > span {
    color: ${colorGray};
  }

  & > span:hover {
    color: ${colorWhite};
    opacity: 1;
  }

  &:active {
    background-color: ${colorWhite};
    box-shadow: 0 0 0 1px ${pollBlue};

    & > span {
      color: ${pollBlue};
    }
  }

  &:focus {
    background-color: ${colorWhite};
    box-shadow: 0 0 0 1px ${pollBlue};

    & > span {
      color: ${pollBlue};
    }
  }

  &:nth-child(even) {
    margin-right: inherit;
    margin-left: ${smPaddingY};

    [dir="rtl"] & {
      margin-right: ${smPaddingY};
      margin-left: inherit;
    }
  }

  &:nth-child(odd) {
    margin-right: 1rem;
    margin-left: inherit;

    [dir="rtl"] & {
      margin-right: inherit;
      margin-left: ${smPaddingY};
    }
  }

  &:hover {
    box-shadow: 0 0 0 1px ${colorWhite};
    background-color: ${colorWhite};
    color: ${pollBlue};

    & > span {
      color: ${pollBlue};
      opacity: 1;
    }
  }
`;

const DragAndDropPollContainer = styled.div`
  width: 200px !important;
  height: 200px !important;
`;

const Question = styled.div`
  margin-bottom: ${lgPaddingX};
`;

const OptionWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
`;

const ResponseArea = styled.div`
  display: flex;
  flex-flow: column wrap;
`;

const CustomInputHeading = styled(SectionHeading)`
  overflow: visible;
  white-space: normal;
  margin: 0;
  padding: 0;
  line-height: 1.35;
`;

const CustomInputHeadingCol = styled(Col)`
  overflow: visible;
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 0;
`;

const CustomInputToggleCol = styled(Col)`
  flex-shrink: 0;
  flex-grow: 0;
  overflow: visible;

  &:last-child {
    padding-right: 0;
    padding-left: 0;

    [dir="rtl"] & {
      padding-right: 0;
      padding-left: 0;
    }
  }
`;

const AnonymousHeading = styled(CustomInputHeading)``;

const AnonymousHeadingCol = styled(CustomInputHeadingCol)``;

const AnonymousToggleCol = styled(CustomInputToggleCol)``;

const AnonymousRow = styled(Row)`
  flex-flow: nowrap;
  width: 100%;
`;

const ResultLeft = styled.td`
  padding: 0 .5rem 0 0;
  border-bottom: 1px solid ${colorGrayLightest};

  [dir="rtl"] & {
    padding: 0 0 0 .5rem;
  }
  padding-bottom: .25rem;
  word-break: break-all;
`;

const ResultRight = styled.td`
  padding-bottom: .25rem;
  padding-right: 0.5rem;
  word-break: break-all;
`;

const Main = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Left = styled.div`
  font-weight: bold;
  max-width: ${pollResultWidth};
  min-width: ${pollStatsElementWidth};
  word-wrap: break-word;
  flex: 6;

  padding: ${smPaddingY};
  margin-top: ${pollSmMargin};
  margin-bottom: ${pollSmMargin};
  color: ${colorText};

  position: relative;
`;

const Center = styled.div`
  position: relative;
  flex: 3;
  border-left: 1px solid ${colorGrayLighter};
  border-right : none;
  width: 100%;
  height: 100%;

  [dir="rtl"] & {
    border-left: none;
    border-right: 1px solid ${colorGrayLighter};
  }

  padding: ${smPaddingY};
  margin-top: ${pollSmMargin};
  margin-bottom: ${pollSmMargin};
  color: ${colorText};
`;

const Right = styled.div`
  text-align: right;
  max-width: ${pollStatsElementWidth};
  min-width: ${pollStatsElementWidth};
  flex: 1;

  [dir="rtl"] & {
    text-align: left;
  }

  padding: ${smPaddingY};
  margin-top: ${pollSmMargin};
  margin-bottom: ${pollSmMargin};
  color: ${colorText};

  position: relative;
`;

const BarShade = styled.div`
  background-color: ${colorGrayLighter};
  height: 100%;
  min-height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
`;

const BarVal = styled.div`
  position: inherit;
`;

const Stats = styled.div`
  margin-bottom: ${smPaddingX};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid ${pollStatsBorderColor};
  border-radius: ${borderSizeLarge};
  padding: ${mdPaddingX};
`;

const ChartSection = styled.div`
  width: 100%;
  min-height: 8rem;
  flex-shrink: 0;
`;

const PollResultsChartRoot = styled.div`
  width: 100%;
`;

const PollResultsChartArea = styled.div`
  width: 100%;
  min-height: 5rem;
`;

const PollResultsLegend = styled.ul`
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &[data-variant="chat"] {
    gap: 0.35rem;
    margin-top: 0.5rem;
  }
`;

const PollResultsLegendItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`;

type PollResultsLegendSwatchProps = {
  color: string;
};

const PollResultsLegendSwatch = styled.span<PollResultsLegendSwatchProps>`
  flex-shrink: 0;
  width: 0.75rem;
  height: 0.75rem;
  margin-top: 0.2rem;
  border-radius: 2px;
  background-color: ${({ color }) => color};
`;

const PollResultsLegendContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
`;

const PollResultsLegendLabel = styled.span`
  flex: 1;
  min-width: 0;
  word-break: break-word;
  line-height: 1.4;
  color: var(--skyroom-modal-text, ${colorText});
  font-size: ${fontSizeSmall};
  font-weight: 500;

  &[data-variant="chat"] {
    font-size: 0.85rem;
  }
`;

const PollResultsLegendCount = styled.span`
  flex-shrink: 0;
  color: var(--skyroom-modal-text-muted, ${colorGrayDark});
  font-size: ${fontSizeSmall};
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &[data-variant="chat"] {
    font-size: 0.8rem;
  }
`;

const Title = styled.span`
  font-weight: bold;
  word-break: break-all;
  white-space: pre-wrap;
`;

const Status = styled.div`
  margin-bottom: .5rem;
`;

const ellipsis = keyframes`
  to {
    width: 1.25em;
    margin-right: 0;
    margin-left: 0;
  }
`;

interface ConnectingAnimationProps {
  animations: boolean;
}

const ConnectingAnimation = styled.span<ConnectingAnimationProps>`
  &:after {
    overflow: hidden;
    display: inline-block;
    vertical-align: bottom;
    content: "\\2026"; /* ascii code for the ellipsis character */
    width: 0;
    margin: 0 1.25em 0 0;

    [dir="rtl"] & {
      margin: 0 0 0 1.25em;
    }

    ${({ animations }) => animations && css`
      animation: ${ellipsis} steps(4, end) 900ms infinite;
    `}
  }
`;

const ButtonsActions = styled.div`
  display: flex;
  width: 100%;
  gap: 0.75rem;
  justify-content: stretch;
  align-items: center;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

// @ts-ignore - Button is a JS Component
const PublishButton = styled(Button)`
  flex: 1 1 0;
  min-height: 2.5rem;
  max-height: 2.75rem;
  overflow-wrap: break-word;
  white-space: normal;
`;

const CancelButton = styled(PublishButton)``;

// @ts-ignore - Button is a JS Component
const LiveResultButton = styled(Button)`
  width: 100%;
  margin-top: ${smPaddingY};
  margin-bottom: ${smPaddingY};
  font-size: ${fontSizeBase};
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;

const Separator = styled.div`
  display: flex;
  flex: 1 1 100%;
  height: 1px;
  min-height: 1px;
  background-color: ${colorGrayLightest};
  padding: 0;
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const THeading = styled.th`
  text-align: left;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const DndTextArea = styled.textarea<{ active: boolean }>`
  ${({ active }) => active && `
    background: ${colorGrayLighter};
  `}

  ${({ active }) => !active && `
    background: ${colorWhite};
  `}
`;

const CorrectAnswerCheckbox = styled.input`
  width: 1.5rem;
  height: 1.5rem;
`;

const SegmentedButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-bottom: ${mdPaddingX};
`;

const SegmentedButtonContainer = styled.div`
  display: flex;
  width: fit-content;
  max-width: 100%;
  padding: 0.15rem;
  background-color: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: ${borderRadiusRounded};
`;

interface TabSelectorButtonProps {
  active?: boolean;
}

const SegmentedButton = styled.button<TabSelectorButtonProps>`
  border: 0;
  background-color: transparent;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  font-size: ${fontSizeBase};
  line-height: ${lineHeightComputed};
  padding: ${mdPaddingY} ${mdPaddingX};
  min-height: 2.35rem;
  min-width: 6rem;
  border-radius: .5rem;
  cursor: pointer;

  &:hover {
    color: rgba(255, 255, 255, 0.92);
  }

  ${({ active }) => active && `
    box-shadow: var(${SegmentedButtonRingOffsetShadow}, 0 0 #0000),
                var(${SegmentedButtonRingShadow}, 0 0 #0000),
                var(${SegmentedButtonBoxShadowSm});
    color: ${slate900};
    background-color: ${colorWhite};
  `}


`;

const ShowCorrectAnswerLabel = styled.label`
  font-size: ${fontSizeSmall};
  font-weight: bolder;
  display: flex;
  align-items: center;
  font-size: ${fontSizeSmall};
  margin-bottom: 1rem;

  & > * {
    margin: 0 .5rem 0 0;

    [dir="rtl"] & {
      margin: 0 0 0 .5rem;
    }
  }
`;

const LiveResultTable = styled.table`
  width: 100%;
`;

const QuizCorrectAnswerControl = styled.div`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
`;

const QuizCorrectAnswerCheckbox = styled.input`  
  --accent: ${darkCyanLime};
  --inputMask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="3" stroke="%23000" fill="none" stroke-linecap="round" stroke-linejoin="round"> <path d="M5 12l5 5l10 -10"/></svg>');
  
  appearance: none;
  aspect-ratio: 1;
  background: var(--backgroundColor, Field);
  border: 1px solid var(--borderColor, ${colorGrayLight});
  border-radius: 50%;
  box-sizing: border-box;
  font-size: 1em;
  height: ${lgPaddingX};
  flex-shrink: 0;
  margin: 0;
  position: relative;
  width: ${lgPaddingX};

  &::after {
    background: var(--backgroundColorAfter, transparent);
    content: "";
    inset: 0;
    position: absolute;
    mask: var(--inputMask) no-repeat center / contain;
    -webkit-mask: var(--inputMask) no-repeat center / contain;
  }

  &:checked {
    --backgroundColor: var(--accent);
    --backgroundColorAfter: Field;
  }

  @media (hover: hover) {
    &:checked:hover {
      --backgroundColor: color-mix(in srgb, var(--accent) 60%, CanvasText 40%);
    }
    &:not(:checked):hover {
      --borderColor: color-mix(in srgb, GrayText 60%, CanvasText 40%);
    }
  }
`;

type InfoBoxContainerProps = {
  isQuiz: boolean;
};

const InfoBoxContainer = styled.div<InfoBoxContainerProps>`
  padding: .5rem ${mdPaddingX};
  border-radius: .5rem;
  margin-bottom: 1rem;

  color: var(--skyroom-modal-text, ${colorText});
  background-color: rgba(32, 199, 187, 0.1);
  border: 1px solid rgba(32, 199, 187, 0.22);

  ${({ isQuiz }) => isQuiz && `
    background-color: rgba(6, 100, 247, 0.12);
    border: 1px solid rgba(6, 100, 247, 0.28);
    color: var(--skyroom-modal-text, ${colorText});
  `}

  & > p {
    margin: 0;
    line-height: 1.45;
    font-size: ${fontSizeSmall};
    color: var(--skyroom-modal-text, ${colorText});
    font-weight: 500;
  }
`;

const ResponseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

type SelectedCorrectAnswerIndicatorProps = {
  hasCorrectAnswer: boolean;
};

const SelectedCorrectAnswerIndicator = styled.span<SelectedCorrectAnswerIndicatorProps>`
  color: ${colorSelectedCorrectAnswerText} !important;
  line-height: 1.25rem;
  padding: 0.25rem 0.50rem;
  background-color: ${colorSelectedCorrectAnswerBg};
  border-radius: 9999px;
  font-size: ${fontSizeSmaller};
  white-space: nowrap;
  font-weight: 700;

  ${({ hasCorrectAnswer }) => hasCorrectAnswer && `
    color: ${colorSelectedCorrectAnswerTextActive} !important;
    background-color: ${colorSelectedCorrectAnswerBgActive} !important;
  `}
`;

const CorrectLabel = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 9999px;
  color: ${colorGreen600};
  background-color: ${colorGreen100};
  padding: 0.2rem 0.5rem;
  font-size: ${fontSizeSmaller};
  line-height: 1.2;
  font-weight: 700;
  white-space: nowrap;
`;

const PollInputContainer = styled.div`
  display: flex;
  flex: 1 1 0%;
  position: relative;
  min-width: 0;
`;

const EmbeddedPollContent = styled.div`
  padding: 0.35rem 0.25rem 0.25rem;
`;

export default {
  ToggleLabel,
  PollOptionInput,
  DeletePollOptionButton,
  ErrorSpacer,
  InputError,
  Instructions,
  PollQuestionArea,
  SectionHeading,
  ResponseType,
  PollConfigButton,
  PollParagraph,
  PollCheckbox,
  AddItemButton,
  Row,
  Col,
  Toggle,
  StartPollBtn,
  NoSlidePanelContainer,
  PollButton,
  DragAndDropPollContainer,
  Warning,
  CustomInputRow,
  Question,
  OptionWrapper,
  ResponseArea,
  CustomInputHeading,
  CustomInputHeadingCol,
  CustomInputToggleCol,
  AnonymousHeading,
  AnonymousHeadingCol,
  AnonymousToggleCol,
  AnonymousRow,
  ResultLeft,
  ResultRight,
  Main,
  Left,
  Center,
  Right,
  BarShade,
  BarVal,
  Stats,
  ChartSection,
  PollResultsChartRoot,
  PollResultsChartArea,
  PollResultsLegend,
  PollResultsLegendItem,
  PollResultsLegendSwatch,
  PollResultsLegendContent,
  PollResultsLegendLabel,
  PollResultsLegendCount,
  Title,
  Status,
  ConnectingAnimation,
  ButtonsActions,
  PublishButton,
  CancelButton,
  LiveResultButton,
  Separator,
  THeading,
  DndTextArea,
  CorrectAnswerCheckbox,
  SegmentedButtonContainer,
  ShowCorrectAnswerLabel,
  LiveResultTable,
  SegmentedButtonWrapper,
  SegmentedButton,
  QuizCorrectAnswerCheckbox,
  QuizCorrectAnswerControl,
  InfoBoxContainer,
  ResponseHeader,
  SelectedCorrectAnswerIndicator,
  CorrectLabel,
  PollInputContainer,
  PollQuestionAreaWrapper,
  EmbeddedPollContent,
};
