import styled, { css, keyframes } from 'styled-components';
import {
  borderSize,
  borderSizeSmall,
  borderRadius,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorPrimary,
  colorGray,
  colorDanger,
  userListBg,
  colorGrayLighter,
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
  flex: 0 0 auto;
  color: ${colorPrimary};
  margin: 0;
  font-weight: inherit;
  padding: 0 0.45rem !important;
  min-height: 28px !important;
  font-size: 0.72rem !important;
`;
// @ts-ignore - as button comes from JS
const AudioButton = styled(Button)`
  flex: 0 0 auto;
  color: ${colorPrimary};
  margin: 0;
  font-weight: inherit;
  padding: 0 0.45rem !important;
  min-height: 28px !important;
  font-size: 0.72rem !important;
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
  gap: 0.35rem;
  padding: 0.45rem 0.55rem;
  margin-bottom: 0;
  border-radius: 10px;
  background: ${skyroomAccentSoft};
  border: 1px solid ${skyroomBorder};
`;

const ModeratorToolbarTitle = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${skyroomTextMuted};
`;

const ModeratorToolbarActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

// @ts-ignore - Button comes from JS
const ToolbarButton = styled(Button)`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.68rem !important;
  padding: 0.28rem 0.4rem !important;
  border-radius: 8px !important;
  white-space: nowrap;
`;

const SummaryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  margin-bottom: 0;
  border-radius: 8px;
  background: ${skyroomSurface};
  border: 1px solid ${skyroomBorder};
  font-size: 0.7rem;
  color: ${skyroomTextMuted};
`;

const UserGuideBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.4rem 0.55rem;
  margin-bottom: 0;
  border-radius: 8px;
  background: ${skyroomAccentSoft};
  border: 1px solid ${skyroomBorder};
  font-size: 0.72rem;
  line-height: 1.35;
  color: ${skyroomText};
`;

type RoomCardProps = {
  $highlighted?: boolean;
};

const RoomCard = styled.div<RoomCardProps>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  padding: 0.4rem 0.55rem;
  margin-bottom: 0;
  border-radius: 10px;
  background: ${skyroomSurface};
  border: 1px solid ${({ $highlighted }) => ($highlighted ? skyroomAccent : skyroomBorder)};
  box-shadow: ${({ $highlighted }) => ($highlighted ? `0 0 0 1px ${skyroomAccentSoft}` : 'none')};
  transition: border-color 0.15s ease;
`;

const RoomCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  flex: 1 1 auto;
  min-width: 0;
`;

const RoomCardTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${skyroomText};
  min-width: 0;
`;

const YourRoomBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 600;
  background: ${skyroomAccentSoft};
  color: ${skyroomAccent};
  border: 1px solid ${skyroomBorder};
`;

const ParticipantCount = styled.span`
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 500;
  color: ${skyroomTextDim};
  white-space: nowrap;
`;

const ParticipantList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  flex: 1 1 100%;
  order: 3;
`;

const ParticipantChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.35rem;
  border-radius: 5px;
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.05);
  color: ${skyroomTextMuted};
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const NoParticipants = styled.span`
  font-size: 0.65rem;
  font-style: italic;
  color: ${skyroomTextDim};
  flex: 1 1 100%;
  order: 3;
`;

const RoomCardActions = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0;
  flex: 0 0 auto;
  order: 2;
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
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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
  $presentation?: 'sidebar' | 'mobile';
};

const DurationContainer = styled.div<DurationContainerProps>`
  display: flex;
  flex-direction: row;
  flex-wrap: ${({ centeredText }) => (centeredText ? 'nowrap' : 'wrap')};
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem 0.75rem;
  border-radius: 10px;
  margin: 0;
  padding: 0.35rem 0.6rem;
  box-shadow: none;
  background: ${skyroomSurface};
  border: 1px solid ${skyroomBorder};
  color: ${skyroomTextMuted};
  text-align: start;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
`;

const SetTimeContainer = styled.div`
  margin: 0;
  width: 100%;
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
  padding: .35rem .5rem;
  font-weight: ${headingsFontWeight} !important;
  border-radius: .2rem;
  font-size: ${fontSizeSmall};
`;

const Duration = styled.span`
  display: inline-block;
  align-self: center;
`;

type PanelPresentationProps = {
  $presentation?: 'sidebar' | 'mobile';
};

const Panel = styled.div<PanelPresentationProps>`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background-color: var(--skyroom-panel-solid, #151c28);
  padding: 0;
  color: ${skyroomText};
`;

const PanelHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const MobilePanelTitle = styled.h2`
  margin: 0;
  padding: 0.55rem 0.75rem;
  min-height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
  color: ${skyroomText};
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ScrollableBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`;

const Separator = styled.div`
  position: relative;
  width: 100%;
  height: ${borderSizeSmall};
  background-color: ${colorGrayLighter};
  margin: 0.15rem 0;
`;

const FlexRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
`;

const Form = styled.form`
  flex-grow: 0;
  flex-shrink: 0;
  align-self: stretch;
  width: 100%;
  position: relative;
  margin: 0;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.25rem 0.3rem 0.25rem 0.45rem;
  border-radius: 12px;
  background: var(--skyroom-panel-input, rgba(5, 10, 18, 0.72));
  border: 1px solid var(--skyroom-panel-border, rgba(32, 199, 187, 0.22));

  [dir="rtl"] & {
    padding: 0.25rem 0.45rem 0.25rem 0.3rem;
  }
`;

const Input = styled(TextareaAutosize)`
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  background-clip: padding-box;
  margin: 0;
  color: var(--skyroom-panel-text, ${colorText});
  -webkit-appearance: none;
  padding: 0.4rem 0.25rem;
  resize: none;
  transition: none;
  border-radius: 0;
  font-size: 0.8rem;
  line-height: 1.35;
  min-height: 2rem;
  max-height: 6rem;
  border: none;
  box-shadow: none;

  &::placeholder {
    color: var(--skyroom-panel-text-muted, rgba(210, 224, 238, 0.55));
  }

  &:disabled,
  &[disabled] {
    cursor: not-allowed;
    opacity: .75;
  }

  &:focus,
  &:hover,
  &:active {
    outline: none;
    border: none;
    box-shadow: none;
  }
`;
// @ts-ignore - as button comes from JS, we can't provide its props
const SendButton = styled(Button)`
  flex: 0 0 auto;
  align-self: center;
  margin: 0 !important;
  width: 34px !important;
  min-width: 34px !important;
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 !important;
  border-radius: 10px !important;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transform: none !important;

  & > span,
  & i,
  & [class^="icon-bbb-"] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    line-height: 1;
    transform: none !important;
  }

  [dir="rtl"] & i,
  [dir="rtl"] & [class^="icon-bbb-"] {
    /* Point paper-plane toward send direction in RTL */
    transform: scaleX(-1) !important;
  }
`;

const ErrorMessage = styled.div`
  color: ${colorDanger};
  font-size: calc(${fontSizeBase} * .75);
  text-align: start;
  padding: 0.25rem 0.1rem 0;
  position: relative;
  min-height: 0;
  height: auto;
  max-height: none;
  line-height: 1.35;
  width: 100%;
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
  PanelHeader,
  MobilePanelTitle,
  ScrollableBody,
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
