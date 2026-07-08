import styled, { css } from 'styled-components';
import {
  colorWhite,
  colorGrayDark,
  colorGrayLightest,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';

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
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.28);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};

  ${({ $compact }) => $compact && css`
    background: rgba(15, 23, 42, 0.16);
    border-radius: 12px;
  `}
`;

export const OverlayHeader = styled.div<RTLProps & { $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 0 10px;
  background: rgba(30, 58, 95, 0.72);
  color: ${colorWhite};
  cursor: grab;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &:active {
    cursor: grabbing;
  }

  ${({ $collapsed }) => $collapsed && css`
    border-radius: 12px;
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
  font-size: 0.8rem;
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
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: ${colorWhite};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.24);
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
  padding: ${({ $compact }) => ($compact ? '4px 6px 6px' : '0 8px 8px')};
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

export const OverlayMessageList = styled.div<CompactProps>`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ $compact }) => ($compact ? '4px 2px' : '8px 4px')};
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '6px' : '10px')};
`;

export const OverlayMessageItem = styled.div<CompactProps>`
  padding: ${({ $compact }) => ($compact ? '6px 8px' : '8px 10px')};
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  a {
    color: ${colorPrimary};
    word-break: break-word;
  }

  ${({ $compact }) => $compact && css`
    font-size: 0.78rem;

    [data-test="overlayMessageContent"] {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}
`;

export const OverlayMessageMeta = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
`;

export const OverlayMessageAuthor = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e3a5f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const OverlayMessageTime = styled.span`
  font-size: 0.68rem;
  color: ${colorGrayDark};
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
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
`;

interface RTLFormProps {
  $isRTL?: boolean;
}

export const OverlayForm = styled.form<RTLFormProps>`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const OverlayInput = styled.textarea`
  flex: 1;
  min-height: 36px;
  max-height: 88px;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.8rem;
  line-height: 1.35;
  background: rgba(255, 255, 255, 0.82);
  color: #1f2937;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.55);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const OverlaySendButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  background: rgba(30, 58, 95, 0.88);
  color: ${colorWhite};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(30, 58, 95, 0.98);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;
