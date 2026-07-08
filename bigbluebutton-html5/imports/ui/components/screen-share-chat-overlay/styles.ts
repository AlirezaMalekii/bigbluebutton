import styled, { css } from 'styled-components';
import { colorWhite, colorPrimary } from '/imports/ui/stylesheets/styled-components/palette';

interface RTLProps {
  $isRTL?: boolean;
}

interface CompactProps {
  $compact?: boolean;
}

export const OverlayShell = styled.div<RTLProps & CompactProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #0b1220;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(148, 163, 184, 0.16);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};

  ${({ $compact }) => $compact && css`
    border-radius: 14px;
  `}
`;

export const OverlayHeader = styled.div<RTLProps & { $collapsed?: boolean }>`
  display: flex;
  flex-direction: ${({ $isRTL }) => ($isRTL ? 'row-reverse' : 'row')};
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 54px;
  padding: 8px 12px;
  background: #111c2e;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  color: ${colorWhite};
  cursor: grab;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }

  ${({ $collapsed }) => $collapsed && css`
    border-radius: 14px;
    min-height: 44px;
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
  font-size: 0.92rem;
  font-weight: 700;
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
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 11px;
  background: #1b2a40;
  color: #e5edf7;
  cursor: pointer;
  font-size: 1.35rem;
  line-height: 1;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: #253852;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${colorPrimary};
    outline-offset: 1px;
  }
`;

export const OverlayBody = styled.div<CompactProps>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const OverlayChatPanel = styled.div<RTLProps & CompactProps>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: ${({ $compact }) => ($compact ? '10px' : '14px')};
  background: #0b1220;
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
  background: #111c2e;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #dbe6f3;
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
  background: #27415f;
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

export const OverlayMessageList = styled.div<CompactProps>`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ $compact }) => ($compact ? '0' : '0 2px 10px')};
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '8px' : '12px')};

  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
`;

export const OverlayMessageItem = styled.div<CompactProps>`
  padding: ${({ $compact }) => ($compact ? '10px 12px' : '14px 16px')};
  border-radius: 14px;
  background: #111c2e;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #e5edf7;

  a {
    color: ${colorPrimary};
    word-break: break-word;
  }

  ${({ $compact }) => $compact && css`
    font-size: 0.82rem;

    [data-test="overlayMessageContent"] {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}

  [data-test="overlayMessageContent"] {
    color: #e5edf7;
    font-size: ${({ $compact }) => ($compact ? '0.82rem' : '0.9rem')};
    line-height: 1.7;
    word-break: break-word;
  }
`;

export const OverlayMessageMeta = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
`;

export const OverlayMessageAuthor = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const OverlayMessageTime = styled.span`
  font-size: 0.7rem;
  color: #94a3b8;
  flex-shrink: 0;
`;

export const OverlayEmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
`;

interface RTLFormProps {
  $isRTL?: boolean;
}

export const OverlayForm = styled.form<RTLFormProps>`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const OverlayInput = styled.textarea`
  flex: 1;
  min-height: 42px;
  max-height: 88px;
  resize: none;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 13px;
  padding: 10px 12px;
  font-size: 0.88rem;
  line-height: 1.55;
  background: #111c2e;
  color: #f8fafc;

  &:focus {
    outline: none;
    border-color: rgba(77, 141, 207, 0.75);
  }

  &::placeholder {
    color: #94a3b8;
    opacity: 1;
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const OverlaySendButton = styled.button`
  border: none;
  border-radius: 13px;
  min-height: 42px;
  padding: 0 16px;
  background: #27415f;
  color: ${colorWhite};
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #315277;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const OverlayErrorText = styled.span`
  position: absolute;
  bottom: 100%;
  color: #fca5a5;
  font-size: 0.72rem;
`;
