import styled, { css, keyframes } from 'styled-components';
import {
  mdPaddingX,
  borderSize,
  borderSizeSmall,
  borderRadius,
  jumboPaddingY,
  smPaddingX,
  smPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorPrimary,
  colorGray,
  colorDanger,
  userListBg,
  colorWhite,
  colorGrayLighter,
  colorGrayLightest,
  colorBlueLight,
  listItemBgHover,
  colorText,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  headingsFontWeight,
  fontSizeSmall,
  fontSizeBase,
} from '/imports/ui/stylesheets/styled-components/typography';
import { ScrollboxVertical } from '/imports/ui/stylesheets/styled-components/scrollable';
import Button from '/imports/ui/components/common/button/component';
import TextareaAutosize from 'react-autosize-textarea';

const BreakoutActions = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-weight: ${headingsFontWeight};
  color: ${colorPrimary};

  & > button {
    padding: 0 0 0 .5rem;
  }
`;

const AlreadyConnected = styled.span`
  padding: 0 .5rem 0 0;
  display: inline-block;
  vertical-align: middle;
  white-space: nowrap;
`;
// @ts-ignore - as button comes from JS, we can't provide its props
const JoinButton = styled(Button)`
  flex: 0 1 48%;
  color: ${colorPrimary};
  margin: 0;
  font-weight: inherit;
  padding: 0 .5rem 0 .5rem !important;
`;
// @ts-ignore - as button comes from JS, we can't provide its props
const AudioButton = styled(Button)`
  flex: 0 1 48%;
  color: ${colorPrimary};
  margin: 0;
  font-weight: inherit;
`;

const skyroomText = 'var(--skyroom-panel-text, #eef4fb)';
const skyroomTextMuted = 'var(--skyroom-panel-text-muted, rgba(210, 224, 238, 0.82))';
const skyroomTextDim = 'var(--skyroom-panel-text-dim, rgba(198, 208, 220, 0.62))';
const skyroomAccent = 'var(--skyroom-panel-accent, #20c7bb)';
const skyroomAccentSoft = 'var(--skyroom-panel-accent-soft, rgba(32, 199, 187, 0.14))';
const skyroomBorder = 'var(--skyroom-panel-border, rgba(32, 199, 187, 0.12))';
const skyroomSurface = 'var(--skyroom-panel-solid, rgba(255, 255, 255, 0.03))';

const BreakoutItems = styled.div`
  margin-bottom: 1rem;
`;

const Content = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-size: ${fontSizeSmall};
  font-weight: bold;
  padding: ${borderSize} ${borderSize} ${borderSize} 0;

  [dir="rtl"] & {
    padding: ${borderSize} 0 ${borderSize} ${borderSize};
  }
`;

const BreakoutRoomListNameLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UsersAssignedNumberLabel = styled.span`
  margin: 0 0 0 .25rem;

  [dir="rtl"] & {
    margin: 0 .25em 0 0;
  }
`;

const ModeratorToolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: ${skyroomAccentSoft};
  border: 1px solid ${skyroomBorder};
`;

const ModeratorToolbarTitle = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${skyroomTextMuted};
`;

const ModeratorToolbarActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

// @ts-ignore - Button comes from JS
const ToolbarButton = styled(Button)`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.72rem !important;
  padding: 0.35rem 0.5rem !important;
  border-radius: 8px !important;
  white-space: nowrap;
`;

const SummaryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  margin-bottom: 0.65rem;
  border-radius: 10px;
  background: ${skyroomSurface};
  border: 1px solid ${skyroomBorder};
  font-size: 0.78rem;
  color: ${skyroomTextMuted};
`;

const UserGuideBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  background: ${skyroomAccentSoft};
  border: 1px solid ${skyroomBorder};
  font-size: 0.8rem;
  line-height: 1.45;
  color: ${skyroomText};
`;

type RoomCardProps = {
  $highlighted?: boolean;
};

const RoomCard = styled.div<RoomCardProps>`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.55rem;
  border-radius: 12px;
  background: ${skyroomSurface};
  border: 1px solid ${({ $highlighted }) => ($highlighted ? skyroomAccent : skyroomBorder)};
  box-shadow: ${({ $highlighted }) => ($highlighted ? `0 0 0 1px ${skyroomAccentSoft}` : 'none')};
  transition: border-color 0.15s ease;
`;

const RoomCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
`;

const RoomCardTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: ${skyroomText};
`;

const YourRoomBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${skyroomAccentSoft};
  color: ${skyroomAccent};
  border: 1px solid ${skyroomBorder};
`;

const ParticipantCount = styled.span`
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 500;
  color: ${skyroomTextDim};
  white-space: nowrap;
`;

const ParticipantList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

const ParticipantChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.05);
  color: ${skyroomTextMuted};
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const NoParticipants = styled.span`
  font-size: 0.72rem;
  font-style: italic;
  color: ${skyroomTextDim};
`;

const RoomCardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
`;

const GeneratingURL = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: ${skyroomTextMuted};
`;

type StatusBadgeProps = {
  $status: 'connected' | 'pending';
};

const StatusBadge = styled.span<StatusBadgeProps>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $status }) => ($status === 'connected' ? '#34d399' : skyroomTextMuted)};
  background: ${({ $status }) => ($status === 'connected' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255,255,255,0.05)')};
  border: 1px solid ${({ $status }) => ($status === 'connected' ? 'rgba(52, 211, 153, 0.25)' : skyroomBorder)};
`;

const ellipsis = keyframes`
  to {
    width: 1.5em;
  }
`;

type ConnectingAnimationProps = {
  animations: boolean;

};
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

const BreakoutsList = styled.div`
  overflow: auto;
`;

const JoinedUserNames = styled.div`
  overflow-wrap: break-word;
  white-space: pre-line;
  margin-left: 1rem;
  font-size: ${fontSizeSmall};
`;

const BreakoutColumn = styled.div`
  display: flex;
  flex-flow: column;
  min-height: 0;
  flex-grow: 1;
`;

const BreakoutScrollableList = styled(ScrollboxVertical)`
  background: linear-gradient(${userListBg} 30%, rgba(255,255,255,0)),
    linear-gradient(rgba(255,255,255,0), ${userListBg} 70%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(0,0,0,.2), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,.2), rgba(0,0,0,0)) 0 100%;

  outline: transparent;
  outline-style: dotted;
  outline-width: ${borderSize};

  &:focus {
    outline: none;
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${listItemBgHover}, inset 0 0 0 1px ${colorPrimary};
  }

  &:focus-within,
  &:focus {
    outline-style: solid;
  }

  &:active {
    box-shadow: none;
    border-radius: none;
  }

  overflow-x: hidden;
  outline-width: 1px !important;
  outline-color: transparent !important;
  background: none;
`;

type DurationContainerProps = {
  centeredText: boolean;
};

const DurationContainer = styled.div<DurationContainerProps>`
  ${({ centeredText }) => centeredText && `
    text-align: center;
  `}

  border-radius: ${borderRadius};
  margin-bottom: ${jumboPaddingY};
  padding: 10px;
  box-shadow: 0 0 1px 1px ${colorGrayLightest};
`;

const SetTimeContainer = styled.div`
  margin: .5rem 0 0 0;
`;

const SetDurationInput = styled.input`
  flex: 1;
  border: 1px solid ${colorGrayLighter};
  width: 50%;
  text-align: center;
  padding: .25rem;
  border-radius: ${borderRadius};
  background-clip: padding-box;
  outline: none;

  &::placeholder {
    color: ${colorGray};
    opacity: 1;
  }

  &:focus {
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight}, inset 0 0 0 1px ${colorPrimary};
  }

  &:disabled,
  &[disabled] {
    cursor: not-allowed;
    opacity: .75;
    background-color: rgba(167,179,189,0.25);
  }
`;

const WithError = styled.span`
  color: ${colorDanger};
`;
// @ts-ignore - as button comes from JS, we can't provide its props
const EndButton = styled(Button)`
  padding: .5rem;
  font-weight: ${headingsFontWeight} !important;
  border-radius: .2rem;
  font-size: ${fontSizeSmall};
`;

const Duration = styled.span`
  display: inline-block;
  align-self: center;
`;

const Panel = styled(ScrollboxVertical)`
  background: linear-gradient(${colorWhite} 30%, rgba(255,255,255,0)),
    linear-gradient(rgba(255,255,255,0), ${colorWhite} 70%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(0,0,0,.2), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,.2), rgba(0,0,0,0)) 0 100%;

  background-color: #fff;
  padding: ${mdPaddingX};
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
`;

const Separator = styled.div`
  position: relative;
  width: 100%;
  height: 10px;
  height: ${borderSizeSmall};
  background-color: ${colorGrayLighter};
  margin: 30px 0px;
`;

const FlexRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
`;

const Form = styled.form`
  flex-grow: 0;
  flex-shrink: 0;
  align-self: flex-end;
  width: 100%;
  position: relative;
  margin-bottom: calc(-1 * ${smPaddingX});
  margin-top: .2rem;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const Input = styled(TextareaAutosize)`
  flex: 1;
  background: #fff;
  background-clip: padding-box;
  margin: 0;
  color: ${colorText};
  -webkit-appearance: none;
  padding: calc(${smPaddingY} * 2.5) calc(${smPaddingX} * 1.25);
  resize: none;
  transition: none;
  border-radius: ${borderRadius};
  font-size: ${fontSizeBase};
  line-height: 1;
  min-height: 2.5rem;
  max-height: 10rem;
  border: 1px solid ${colorGrayLighter};

  &:disabled,
  &[disabled] {
    cursor: not-allowed;
    opacity: .75;
    background-color: rgba(167,179,189,0.25);
  }

  &:focus {
    border-radius: ${borderSize};
    box-shadow: 0 0 0 ${borderSize} ${colorBlueLight}, inset 0 0 0 1px ${colorPrimary};
  }

  &:hover,
  &:active,
  &:focus {
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
  }
`;
// @ts-ignore - as button comes from JS, we can't provide its props
const SendButton = styled(Button)`
  margin:0 0 0 ${smPaddingX};
  align-self: center;
  font-size: 0.9rem;

  [dir="rtl"]  & {
    margin: 0 ${smPaddingX} 0 0;
    -webkit-transform: scale(-1, 1);
    -moz-transform: scale(-1, 1);
    -ms-transform: scale(-1, 1);
    -o-transform: scale(-1, 1);
    transform: scale(-1, 1);
  }
`;

const ErrorMessage = styled.div`
  color: ${colorDanger};
  font-size: calc(${fontSizeBase} * .75);
  text-align: left;
  padding: ${borderSize} 0;
  position: relative;
  height: .93rem;
  max-height: .93rem;
`;

export default {
  BreakoutActions,
  AlreadyConnected,
  JoinButton,
  AudioButton,
  BreakoutItems,
  Content,
  BreakoutRoomListNameLabel,
  UsersAssignedNumberLabel,
  ConnectingAnimation,
  JoinedUserNames,
  BreakoutColumn,
  BreakoutScrollableList,
  DurationContainer,
  SetTimeContainer,
  SetDurationInput,
  WithError,
  EndButton,
  Duration,
  Panel,
  Separator,
  FlexRow,
  Form,
  Wrapper,
  Input,
  SendButton,
  ErrorMessage,
  BreakoutsList,
  ModeratorToolbar,
  ModeratorToolbarTitle,
  ModeratorToolbarActions,
  ToolbarButton,
  SummaryBar,
  UserGuideBanner,
  RoomCard,
  RoomCardHeader,
  RoomCardTitle,
  YourRoomBadge,
  ParticipantCount,
  ParticipantList,
  ParticipantChip,
  NoParticipants,
  RoomCardActions,
  GeneratingURL,
  StatusBadge,
};
