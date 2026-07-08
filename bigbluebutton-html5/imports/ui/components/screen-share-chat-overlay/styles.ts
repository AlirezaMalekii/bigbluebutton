import styled, { css } from 'styled-components';
import {
  colorWhite,
  colorGrayDark,
  colorGrayLightest,
  colorPrimary,
  userListBg,
} from '/imports/ui/stylesheets/styled-components/palette';

interface RTLProps {
  $isRTL?: boolean;
}

export const OverlayShell = styled.div<RTLProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: ${userListBg};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const OverlayHeader = styled.div<RTLProps & { $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 0 10px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: ${colorWhite};
  cursor: grab;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }

  ${({ $collapsed }) => $collapsed && css`
    border-radius: 12px;
  `}
`;

export const DragHandle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
`;

export const DragGrip = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0.55;
  flex-shrink: 0;

  &::before,
  &::after {
    content: '';
    display: block;
    width: 14px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
  }
`;

export const HeaderTitle = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const HeaderActions = styled.div<RTLProps>`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

export const HeaderButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: ${colorWhite};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  &:focus-visible {
    outline: 2px solid ${colorPrimary};
    outline-offset: 1px;
  }
`;

export const OverlayBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const OverlayChatPanel = styled.div<RTLProps>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 8px 8px;

  .public-chat-panel,
  [data-test="publicChatPanel"] {
    height: 100%;
    min-height: 0;
    padding: 0;
  }
`;

export const CollapsedHint = styled.span`
  font-size: 0.72rem;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ReopenBanner = styled.div<RTLProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${colorGrayLightest};
  border: 1px solid rgba(45, 90, 135, 0.15);
  color: ${colorGrayDark};
  font-size: 0.78rem;
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const ReopenButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: ${colorWhite};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    filter: brightness(1.05);
  }
`;
