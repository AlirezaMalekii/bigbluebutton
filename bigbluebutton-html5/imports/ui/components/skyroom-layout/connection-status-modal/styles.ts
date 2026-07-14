import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.92); }
`;

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 16px;
  box-sizing: border-box;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-inline-end: 40px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle, rgba(218, 230, 245, 0.08));
`;

const TopBarIcon = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(32, 199, 187, 0.18), rgba(13, 136, 126, 0.08));
  border: 1px solid rgba(32, 199, 187, 0.28);
  color: var(--skyroom-brand-400, #14a99e);

  svg {
    width: 17px;
    height: 17px;
  }
`;

const TopBarText = styled.div`
  min-width: 0;
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--skyroom-text-primary, #eef4fb);
  line-height: 1.35;
`;

const ModalDescription = styled.p`
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--skyroom-text-secondary, #8d9aad);

  @media (min-width: 561px) {
    display: none;
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const Nav = styled.nav`
  flex-shrink: 0;
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 560px) {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--skyroom-text-secondary, #8d9aad);
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0.75;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--skyroom-text-primary, #eef4fb);
  }

  ${({ $active }) => $active && `
    background: linear-gradient(135deg, rgba(32, 199, 187, 0.16), rgba(13, 136, 126, 0.08));
    border-color: rgba(32, 199, 187, 0.32);
    color: #fff;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);

    svg {
      opacity: 1;
      color: var(--skyroom-brand-300, #3fd9cf);
    }
  `}

  @media (max-width: 560px) {
    width: auto;
    flex: 1 1 0;
    min-width: 0;
    justify-content: center;
    padding: 10px 8px;

    span {
      display: none;
    }
  }
`;

const Panel = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const PanelScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-inline-end: 2px;
  background: transparent;
  scrollbar-width: thin;
  scrollbar-color: rgba(32, 199, 187, 0.35) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(32, 199, 187, 0.35);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(32, 199, 187, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(218, 230, 245, 0.08);

  &[data-tone="excellent"] {
    border-color: rgba(46, 204, 113, 0.22);
    background: linear-gradient(135deg, rgba(46, 204, 113, 0.08), rgba(0, 0, 0, 0.18));
  }

  &[data-tone="good"] {
    border-color: rgba(32, 199, 187, 0.22);
    background: linear-gradient(135deg, rgba(32, 199, 187, 0.1), rgba(0, 0, 0, 0.18));
  }

  &[data-tone="fair"] {
    border-color: rgba(240, 180, 41, 0.28);
    background: linear-gradient(135deg, rgba(240, 180, 41, 0.1), rgba(0, 0, 0, 0.18));
  }

  &[data-tone="critical"] {
    border-color: rgba(231, 76, 60, 0.3);
    background: linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(0, 0, 0, 0.18));
  }
`;

const HeroRing = styled.div`
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08), transparent 60%);
  border: 2px solid rgba(32, 199, 187, 0.25);
  box-shadow: 0 0 0 4px rgba(32, 199, 187, 0.06);
`;

const HeroIconWrap = styled.div`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeroBody = styled.div`
  min-width: 0;
  flex: 1;
`;

const HeroEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--skyroom-text-secondary, #8d9aad);
`;

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 8px rgba(46, 204, 113, 0.65);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const HeroTitle = styled.div`
  font-size: 0.9875rem;
  font-weight: 700;
  color: var(--skyroom-text-primary, #eef4fb);
  line-height: 1.3;
  margin-bottom: 2px;
`;

const HeroSubtitle = styled.div`
  font-size: 0.75rem;
  color: var(--skyroom-text-secondary, #8d9aad);
`;

const HeroAction = styled.button`
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--skyroom-brand-300, #3fd9cf);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: #fff;
  }
`;

const SectionLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--skyroom-text-secondary, #7b8798);
  margin: 0 0 6px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(218, 230, 245, 0.07);
  transition: border-color 140ms ease, background 140ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(218, 230, 245, 0.12);
  }
`;

const MetricIcon = styled.div<{ $variant?: 'upload' | 'download' | 'neutral' }>`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ $variant }) => {
    if ($variant === 'upload') {
      return `
        background: rgba(52, 152, 219, 0.12);
        color: #5dade2;
        border: 1px solid rgba(52, 152, 219, 0.22);
      `;
    }
    if ($variant === 'download') {
      return `
        background: rgba(155, 89, 182, 0.12);
        color: #bb8fce;
        border: 1px solid rgba(155, 89, 182, 0.22);
      `;
    }
    return `
      background: rgba(32, 199, 187, 0.1);
      color: var(--skyroom-brand-300, #3fd9cf);
      border: 1px solid rgba(32, 199, 187, 0.2);
    `;
  }}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MetricContent = styled.div`
  min-width: 0;
  flex: 1;
`;

const MetricLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--skyroom-text-secondary, #8d9aad);
  line-height: 1.35;
  margin-bottom: 2px;
`;

const MetricValue = styled.div`
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--skyroom-text-primary, #eef4fb);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.2;
`;

const CopyButton = styled.button<{ $copied?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  margin-top: auto;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(32, 199, 187, 0.35);
  background: rgba(32, 199, 187, 0.1);
  color: var(--skyroom-brand-300, #3fd9cf);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    background: rgba(32, 199, 187, 0.2);
    border-color: rgba(32, 199, 187, 0.5);
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  ${({ $copied }) => $copied && `
    border-color: rgba(46, 204, 113, 0.45);
    background: rgba(46, 204, 113, 0.12);
    color: #2ecc71;
  `}
`;

const LogList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LogCard = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(218, 230, 245, 0.07);
  transition: background 120ms ease, border-color 120ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.055);
    border-color: rgba(218, 230, 245, 0.12);
  }
`;

const LogAvatar = styled.div`
  flex-shrink: 0;
`;

const LogMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LogNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const LogName = styled.span<{ $offline?: boolean }>`
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--skyroom-text-primary, #eef4fb);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${({ $offline }) => $offline && `
    color: var(--skyroom-text-secondary, #7b8798);
    font-style: italic;
    opacity: 0.85;
  `}
`;

const StatusBadge = styled.span<{ $level?: string }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  ${({ $level }) => {
    switch ($level) {
      case 'critical':
        return 'background: rgba(231, 76, 60, 0.15); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.3);';
      case 'danger':
        return 'background: rgba(230, 126, 34, 0.15); color: #e67e22; border: 1px solid rgba(230, 126, 34, 0.3);';
      case 'warning':
        return 'background: rgba(240, 180, 41, 0.15); color: #f0b429; border: 1px solid rgba(240, 180, 41, 0.3);';
      default:
        return 'background: rgba(46, 204, 113, 0.12); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.28);';
    }
  }}
`;

const BadgeIcon = styled.span`
  display: inline-flex;
  width: 14px;
  height: 14px;
`;

const LogWarning = styled.span`
  font-size: 0.6875rem;
  color: #f0b429;
  line-height: 1.35;
`;

const LogTime = styled.div`
  flex-shrink: 0;
  text-align: end;
`;

const LogTimeValue = styled.time`
  display: block;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--skyroom-text-secondary, #8d9aad);
  font-variant-numeric: tabular-nums;
`;

const LogTimeActive = styled(LogTimeValue)`
  color: var(--skyroom-brand-300, #3fd9cf);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-7, 32px) var(--space-4, 16px);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px dashed rgba(218, 230, 245, 0.12);
  min-height: 200px;
`;

const EmptyIcon = styled.div`
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-3, 12px);
  color: rgba(141, 154, 173, 0.45);

  svg {
    width: 100%;
    height: 100%;
  }
`;

const EmptyTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--skyroom-text-primary, #eef4fb);
  margin-bottom: 6px;
`;

const EmptySubtitle = styled.div`
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--skyroom-text-secondary, #8d9aad);
  max-width: 280px;
`;

export default {
  Shell,
  TopBar,
  TopBarIcon,
  TopBarText,
  ModalTitle,
  ModalDescription,
  Body,
  Nav,
  NavButton,
  Panel,
  PanelScroll,
  Hero,
  HeroRing,
  HeroIconWrap,
  HeroBody,
  HeroEyebrow,
  LiveDot,
  HeroTitle,
  HeroSubtitle,
  HeroAction,
  SectionLabel,
  MetricGrid,
  MetricCard,
  MetricIcon,
  MetricContent,
  MetricLabel,
  MetricValue,
  CopyButton,
  LogList,
  LogCard,
  LogAvatar,
  LogMain,
  LogNameRow,
  LogName,
  StatusBadge,
  BadgeIcon,
  LogWarning,
  LogTime,
  LogTimeValue,
  LogTimeActive,
  EmptyState,
  EmptyIcon,
  EmptyTitle,
  EmptySubtitle,
};
