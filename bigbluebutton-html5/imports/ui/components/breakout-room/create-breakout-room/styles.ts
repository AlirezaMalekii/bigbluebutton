import styled from 'styled-components';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import HoldButton from '/imports/ui/components/presentation/presentation-toolbar/zoom-tool/holdButton/component';
import Button from '/imports/ui/components/common/button/component';
import { FlexRow, FlexColumn } from '/imports/ui/stylesheets/styled-components/placeholders';
import {
  colorDanger,
  colorGray,
  colorGrayLight,
  colorWhite,
  colorPrimary,
  colorBlueLight,
  colorGrayLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmall, fontSizeBase, fontSizeSmaller } from '/imports/ui/stylesheets/styled-components/typography';
import {
  borderSize,
  lgPaddingX,
} from '/imports/ui/stylesheets/styled-components/general';

type withValidProp = {
  valid: boolean;
};

type BreakoutBoxProps = {
  hundred: boolean;
};

type RoomNameProps = {
  value: string;
  duplicated: boolean;
  maxLength: number;
};

type LabelTextProps = {
  bold: boolean;
};

const breakoutSurface = 'rgba(6, 14, 28, 0.72)';
const breakoutBorder = 'rgba(20, 169, 158, 0.24)';
const breakoutText = 'var(--skyroom-modal-text, #eef4fb)';
const breakoutTextMuted = 'var(--skyroom-modal-text-muted, #aab6c7)';

const BoxContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr));
  grid-gap: 1rem;
  box-sizing: border-box;
  padding-bottom: 0.5rem;
  width: 100%;
`;

const ContentContainer = styled.div`
  display: grid;
  grid-template-columns: minmax(11.5rem, 14rem) minmax(0, 1fr);
  grid-template-areas: "sidebar content";
  grid-gap: 1.25rem;
  align-items: start;
  margin-top: 0.75rem;

  @media ${smallOnly} {
    grid-template-columns: 1fr;
    grid-template-areas:
      "sidebar"
      "content";
  }
`;

const Alert = styled.div<withValidProp>`
  grid-area: sidebar;
  margin-bottom: 0;
  ${({ valid }) => valid === false && `
    position: relative;

    & > * {
      border-color: ${colorDanger} !important;
      color: ${colorDanger};
    }
  `}
`;

const FreeJoinLabel = styled.label`
  font-size: ${fontSizeSmall};
  font-weight: 600;
  display: flex;
  align-items: center;
  margin-bottom: 0.45rem;
  color: ${breakoutTextMuted};

  & > * {
    margin: 0 .5rem 0 0;

    [dir="rtl"] & {
      margin: 0 0 0 .5rem;
    }
  }
`;

const BreakoutNameInput = styled.input`
  width: 100%;
  text-align: center;
  font-weight: 600;
  padding: 0.45rem 0.6rem;
  margin: 0 0 0.45rem;
  color: ${breakoutText};
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid ${breakoutBorder};
  border-radius: 10px;
  box-sizing: border-box;

  &::placeholder {
    color: ${breakoutTextMuted};
    opacity: 1;
  }

  ${({ readOnly }) => readOnly && `
    cursor: default;
    background: rgba(20, 169, 158, 0.1);
  `}
`;

const BreakoutBox = styled.div<BreakoutBoxProps>`
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  min-height: 9.5rem;
  height: 10rem;
  border: 1px solid ${breakoutBorder};
  border-radius: 12px;
  padding: 0.35rem 0.25rem;
  background: ${breakoutSurface};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(20, 169, 158, 0.45) rgba(255, 255, 255, 0.06);

  &::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(20, 169, 158, 0.45);
    border-radius: 50px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 50px;
  }

  ${({ hundred }) => hundred && `
    height: 100%;
    min-height: 11rem;
  `}
`;

const SpanWarn = styled.span<withValidProp>`
  ${({ valid }) => valid && `
    display: none;
  `}

  ${({ valid }) => !valid && `
    margin: .25rem;
    position: absolute;
    font-size: ${fontSizeSmall};
    color: ${colorDanger};
    font-weight: 200;
    white-space: nowrap;
  `}
`;

const RoomName = styled(BreakoutNameInput)<RoomNameProps>`
  ${({ value }) => value.length === 0 && `
    border-color: ${colorDanger} !important;
  `}

  ${({ duplicated }) => duplicated && `
    border-color: ${colorDanger} !important;
  `}
`;

const BreakoutSettings = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  grid-template-rows: 1fr;
  grid-gap: 2rem;

  @media ${smallOnly} {
    grid-template-columns: 1fr ;
    grid-template-rows: 1fr 1fr 1fr; 
    flex-direction: column;
  }
`;

const FormLabel = styled.p<withValidProp>`
  color: ${breakoutTextMuted};
  white-space: nowrap;
  margin-bottom: .5rem;

  ${({ valid }) => !valid && `
    color: ${colorDanger};
  `}
`;

const InputRooms = styled.select<withValidProp>`
  background-color: rgba(255, 255, 255, 0.06);
  color: ${breakoutText};
  border: 1px solid ${breakoutBorder};
  border-radius: 10px;
  width: 100%;
  padding: 0.45rem 0.5rem;
  box-sizing: border-box;

  ${({ valid }) => !valid && `
      border-color: ${colorDanger} !important;
  `}
`;

const DurationLabel = styled.label<withValidProp>`
  ${({ valid }) => !valid && `
    & > * {
      border-color: ${colorDanger} !important;
      color: ${colorDanger};
    }
  `}
`;

const LabelText = styled.p<LabelTextProps>`
  color: ${breakoutText};
  white-space: nowrap;
  margin-bottom: .5rem;

  ${({ bold }) => bold && `
  font-weight: 700;
  font-size: 1.05rem;
  `}
`;

const DurationArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DurationInput = styled.input`
  background-color: rgba(255, 255, 255, 0.06);
  color: ${breakoutText};
  border: 1px solid ${breakoutBorder};
  border-radius: 10px;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.5rem;
  box-sizing: border-box;

  &::placeholder {
    color: ${breakoutTextMuted};
  }
`;

const HoldButtonWrapper = styled(HoldButton)`
  & > button > span {
    padding-bottom: ${borderSize};
  }

  & > button > span > i {
    color: ${colorGray};
    width: ${lgPaddingX};
    height: ${lgPaddingX};
    font-size: 170% !important;
  }
`;

const AssignBtnsContainer = styled.div`
  justify-content: space-between;
  align-items: center;
  display: flex;
  flex-flow: row wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(218, 230, 245, 0.1);
`;
// @ts-ignore - Button is a JS component
const AssignBtns = styled(Button)`
  color: ${colorDanger};
  font-size: ${fontSizeSmall};
  white-space: nowrap;
  margin-bottom: 0;

  ${({ $random }) => $random && `
  color: var(--skyroom-brand-400, ${colorPrimary});
  `}
`;

const CheckBoxesContainer = styled(FlexRow)`
  display: flex;
  flex-flow: column;
  justify-content: flex-end; 
`;

const Separator = styled.div`
  width: 100%;
  height: 1px;
  margin: 1rem 0;
  border: 1px solid ${colorGrayLightest};
`;

const FreeJoinCheckbox = styled.input`
  width: 1rem;
  height: 1rem;
`;

const RoomUserItem = styled.p`
  margin: 0.2rem 0.35rem;
  padding: 0.4rem 0.55rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: grab;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.35rem;
  color: ${breakoutText};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(218, 230, 245, 0.08);
  border-radius: 8px;
  font-size: ${fontSizeSmall};
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  [dir="rtl"] & {
    padding: 0.4rem 0.55rem;
  }

  span.close {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    margin: 0;
    border-radius: 6px;
    font-size: ${fontSizeSmaller};
    color: ${breakoutTextMuted};
    background: rgba(255, 255, 255, 0.06);
  }

  &:hover {
    background: rgba(20, 169, 158, 0.14);
    border-color: rgba(20, 169, 158, 0.35);
  }

  &:focus {
    background: rgba(20, 169, 158, 0.22);
    border-color: rgba(20, 169, 158, 0.45);
    color: ${colorWhite};
    outline: none;
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.99);
  }
`;

const LockIcon = styled.span`
  float: right;
  margin-right: 1rem;

  @media ${smallOnly} {
    margin-left: .5rem;
    margin-right: auto;
    float: left;
  }

  &:after {
    font-family: 'bbb-icons' !important;
    content: '\\e926';
    color: ${colorGrayLight};
  }
`;

const ListContainer = styled(FlexColumn)`
  justify-content: flex-start;
  gap: 10px;
  max-height: 52vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-inline-end: 4px;

  & > span {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

const RoomItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--skyroom-panel-border-token, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--skyroom-surface-2, rgba(255, 255, 255, 0.03));
`;

const ItemTitle = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--skyroom-text-primary, ${colorBlueLight});
`;

// @ts-ignore - Button is a JS component
const ItemButton = styled(Button)`
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 16px !important;
  border-radius: 999px !important;
  white-space: nowrap;
  outline: none !important;

  & > span {
    color: var(--skyroom-accent, ${colorBlueLight});
  }
`;

const WithError = styled.span`
  color: ${colorDanger};
`;

const SubTitle = styled.p`
  font-size: ${fontSizeBase};
  text-align: justify;
  color: ${breakoutTextMuted};
  line-height: 1.55;
`;

const Content = styled(FlexColumn)``;

const BreakoutSlideLabel = styled.label`
  font-size: ${fontSizeSmall};
  font-weight: bolder;
  display: flex;
  align-items: center;
  font-size: ${fontSizeSmall};
  margin-bottom: 0.2rem;
`;

export default {
  BoxContainer,
  Alert,
  FreeJoinLabel,
  BreakoutNameInput,
  BreakoutBox,
  SpanWarn,
  RoomName,
  BreakoutSettings,
  FormLabel,
  InputRooms,
  DurationLabel,
  LabelText,
  DurationArea,
  DurationInput,
  HoldButtonWrapper,
  AssignBtnsContainer,
  AssignBtns,
  CheckBoxesContainer,
  Separator,
  FreeJoinCheckbox,
  RoomUserItem,
  LockIcon,
  ListContainer,
  RoomItem,
  ItemTitle,
  ItemButton,
  WithError,
  SubTitle,
  Content,
  ContentContainer,
  BreakoutSlideLabel,
};
