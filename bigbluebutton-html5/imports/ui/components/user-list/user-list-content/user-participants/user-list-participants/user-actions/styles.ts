import styled from 'styled-components';

import { PanelOptionsButton } from '/imports/ui/components/skyroom-layout/panel-chrome/styles';
import {
  smPaddingY,
  borderSize,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  listItemBgHover,
  itemFocusBorder,
} from '/imports/ui/stylesheets/styled-components/palette';

interface UserActionsTriggerProps {
  selected: boolean;
  isActionsOpen: boolean;
}

const UserActionsTrigger = styled.div<UserActionsTriggerProps>`
    & > div {
        border: none;
        padding: 0.6rem;

        ${({ selected }) => selected && `
        background-color: ${listItemBgHover};
        border-top-left-radius: ${smPaddingY};
        border-bottom-left-radius: ${smPaddingY};
    
        &:focus {
          box-shadow: inset 0 0 0 ${borderSize} ${itemFocusBorder}, inset 1px 0 0 1px ${itemFocusBorder};
        }
      `}
      
      ${({ isActionsOpen }) => isActionsOpen && `
      outline: transparent;
      outline-width: ${borderSize};
      outline-style: solid;
      background-color: ${listItemBgHover};
      box-shadow: inset 0 0 0 ${borderSize} ${itemFocusBorder}, inset 1px 0 0 1px ${itemFocusBorder};
      border-top-left-radius: ${smPaddingY};
      border-bottom-left-radius: ${smPaddingY};
  
      &:focus {
        outline-style: solid;
        outline-color: transparent !important;
      }
    `}
    }
`;

const NoPointerEvents = styled.div`
  pointer-events: none;
`;

const UserRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  min-width: 0;
`;

const UserRowMain = styled.div<{ $clickable?: boolean }>`
  flex: 1 1 auto;
  min-width: 0;
  overflow: visible;

  ${({ $clickable }) => $clickable && `
    cursor: pointer;
  `}
`;

const ActionMenuWrap = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-inline-start: 0;
`;

const LeftActionsCluster = styled.div`
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  margin-inline-start: 4px;
`;

const StatusIconBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 1px;
`;

const StatusIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--skyroom-panel-text-muted, #9aa8bc);
  background: transparent;
  border-radius: 4px;

  i,
  [class^="icon-bbb-"] {
    font-size: 0.7rem;
    line-height: 1;
  }
`;

const StatusReaction = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  font-size: 0.78rem;
  line-height: 1;
`;

const SkyroomActionsTrigger = styled(PanelOptionsButton)`
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  border-radius: 8px !important;
  flex-shrink: 0;
`;

const ActionIconBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  padding: 2px 4px;
  margin-inline-start: 4px;
`;

const ActionIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--skyroom-panel-text-muted, #aab6c7);
  background: rgba(255, 255, 255, 0.06);
  transition: background 140ms ease, color 140ms ease;

  &:hover,
  &:focus-visible {
    color: var(--skyroom-panel-accent, #20c7bb);
    background: rgba(20, 169, 158, 0.18);
    outline: none;
  }

  i,
  [class^="icon-bbb-"] {
    font-size: 0.75rem;
    line-height: 1;
  }
`;

export default {
  UserActionsTrigger,
  NoPointerEvents,
  UserRow,
  UserRowMain,
  ActionMenuWrap,
  LeftActionsCluster,
  StatusIconBar,
  StatusIcon,
  StatusReaction,
  SkyroomActionsTrigger,
  ActionIconBar,
  ActionIconButton,
};
