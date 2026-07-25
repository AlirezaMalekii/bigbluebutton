import styled, { css, keyframes } from 'styled-components';
import type { CSSProperties } from 'react';
import { colorWhite, colorPrimary } from '/imports/ui/stylesheets/styled-components/palette';

interface RTLProps {
  $isRTL?: boolean;
}

interface CompactProps {
  $compact?: boolean;
}

interface OverlayReactionBubbleProps {
  $left: number;
  $drift: number;
  $duration: number;
  $delay: number;
}

export const OverlayFrame = styled.div<RTLProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
  font-family: 'IRANYekan', 'Source Sans Pro', Tahoma, Arial, sans-serif;
`;

export const OverlayShell = styled.div<RTLProps & CompactProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #0b1220;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(148, 163, 184, 0.16);
  font-family: 'IRANYekan', 'Source Sans Pro', Tahoma, Arial, sans-serif;
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};

  ${({ $compact }) => $compact && css`
    border-radius: 14px;
  `}
`;

export const OverlaySelfWebcamFrame = styled.div`
  position: relative;
  flex-shrink: 0;
  width: 100%;
  height: 110px;
  margin: 0 0 6px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #0a1424;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
`;

export const OverlaySelfWebcamVideo = styled.video<{ $mirrored?: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #07101d;
  transform: ${({ $mirrored }) => ($mirrored ? 'scaleX(-1)' : 'none')};
`;

export const OverlaySelfWebcamLabel = styled.span`
  position: absolute;
  inset-inline-start: 8px;
  bottom: 7px;
  max-width: calc(100% - 16px);
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(8, 16, 28, 0.72);
  color: #e8f0fa;
  font-size: 0.64rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`;

export const OverlayHeader = styled.div<RTLProps & { $collapsed?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 7px 10px;
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
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1;
  order: 2;
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
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const HeaderTabs = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 2px;
  border-radius: 12px;
  background: rgba(8, 16, 28, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.14);
`;

export const HeaderTabButton = styled.button<{ $active?: boolean }>`
  appearance: none;
  border: none;
  cursor: pointer;
  min-width: 0;
  max-width: 118px;
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? '#27415f' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#c5d3e4')};
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: #ffffff;
    background: ${({ $active }) => ($active ? '#315277' : 'rgba(39, 65, 95, 0.45)')};
  }

  &:focus-visible {
    outline: 2px solid ${colorPrimary};
    outline-offset: 1px;
  }

  &[aria-selected='true'] {
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  }
`;

export const HeaderActions = styled.div<RTLProps>`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  order: 1;
`;

export const HeaderButton = styled.button<{ $active?: boolean; $disabledLook?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${({ $active }) => (
    $active ? 'rgba(77, 141, 207, 0.55)' : 'rgba(148, 163, 184, 0.18)'
  )};
  border-radius: 11px;
  background: ${({ $active }) => ($active ? '#27415f' : '#1b2a40')};
  color: #e5edf7;
  cursor: pointer;
  font-size: 1.05rem;
  line-height: 1;
  transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
  opacity: ${({ $disabledLook }) => ($disabledLook ? 0.45 : 1)};

  &:hover:not(:disabled) {
    background: #253852;
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid ${colorPrimary};
    outline-offset: 1px;
  }
`;

export const OverlayUsersPanelRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 4px 2px 6px;
  background: #0b1220;

  /* Match floating overlay chrome while reusing sidebar list rows. */
  [class*="VirtualizedList"],
  ul {
    background: transparent !important;
  }

  li {
    margin-inline: 0.25rem !important;
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
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: ${({ $compact }) => ($compact ? '8px' : '10px')};
  background: #0b1220;
`;

const reactionRise = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(-50%, 10px, 0) scale(0.9);
  }

  12% {
    opacity: 1;
  }

  78% {
    opacity: 0.96;
  }

  100% {
    opacity: 0;
    transform: translate3d(
      calc(-50% + var(--reaction-drift)),
      calc(-100vh + 24px),
      0
    ) scale(1.02);
  }
`;

export const OverlayReactionLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
`;

export const OverlayReactionBubble = styled.div.attrs<OverlayReactionBubbleProps>(({
  $left,
  $drift,
  $duration,
  $delay,
}) => ({
  style: {
    '--reaction-left': `${$left}%`,
    '--reaction-drift': `${$drift}px`,
    '--reaction-duration': `${$duration}ms`,
    '--reaction-delay': `${$delay}ms`,
  } as CSSProperties,
}))<OverlayReactionBubbleProps>`
  position: absolute;
  left: var(--reaction-left);
  bottom: 12px;
  will-change: transform, opacity;
  animation: ${reactionRise} var(--reaction-duration) cubic-bezier(0.19, 1, 0.22, 1)
    var(--reaction-delay) forwards;
`;

export const OverlayReactionCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 46px;
  padding: 6px 8px 7px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.32), transparent 60%),
    rgba(15, 23, 42, 0.72);
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
`;

export const OverlayReactionEmoji = styled.span`
  display: block;
  font-size: 1.45rem;
  line-height: 1;
  text-shadow: 0 5px 12px rgba(0, 0, 0, 0.22);
`;

export const OverlayReactionName = styled.span`
  display: block;
  max-width: 88px;
  overflow: hidden;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  unicode-bidi: plaintext;
  white-space: nowrap;
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
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #111c2e;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #dbe6f3;
  font-size: 0.78rem;
  line-height: 1.45;
  text-align: center;
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const ReopenBannerText = styled.span`
  display: block;
  max-width: 100%;
  word-break: normal;
  overflow-wrap: break-word;
`;

export const ReopenButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: center;
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  background: #27415f;
  color: ${colorWhite};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  max-width: 100%;
  white-space: normal;
  text-align: center;
  line-height: 1.35;

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
  gap: ${({ $compact }) => ($compact ? '5px' : '6px')};

  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
`;

export const OverlayMessageItem = styled.div<CompactProps>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: ${({ $compact }) => ($compact ? '7px 10px' : '8px 10px')};
  border-radius: 10px;
  background: #111c2e;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #e5edf7;
  min-height: ${({ $compact }) => ($compact ? '34px' : '38px')};

  a {
    color: ${colorPrimary};
    word-break: break-word;
  }

  ${({ $compact }) => $compact && css`
    font-size: 0.82rem;

    [data-test="overlayMessageContent"] {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}

  [data-test="overlayMessageContent"] {
    color: #e5edf7;
    font-size: ${({ $compact }) => ($compact ? '0.78rem' : '0.82rem')};
    line-height: 1.35;
    word-break: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const OverlayMessageMeta = styled.div`
  display: contents;
`;

export const OverlayMessageAuthor = styled.span`
  font-size: 0.78rem;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 105px;
`;

export const OverlayMessageTime = styled.span`
  font-size: 0.68rem;
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
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  padding-top: 9px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  direction: ${({ $isRTL }) => ($isRTL ? 'rtl' : 'ltr')};
`;

export const OverlayInput = styled.textarea`
  flex: 1;
  min-height: 38px;
  max-height: 74px;
  resize: none;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 13px;
  padding: 8px 11px;
  font-size: 0.82rem;
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
  min-height: 38px;
  padding: 0 13px;
  background: #27415f;
  color: ${colorWhite};
  font-size: 0.78rem;
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
