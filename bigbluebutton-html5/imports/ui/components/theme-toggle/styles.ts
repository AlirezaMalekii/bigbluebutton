import styled, { keyframes, css } from 'styled-components';

const rotateIn = keyframes`
  from { transform: rotate(-90deg) scale(0.7); opacity: 0; }
  to   { transform: rotate(0)      scale(1);   opacity: 1; }
`;

export const ToggleButton = styled.button<{ $isDark: boolean }>`
  /* layout */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0 0.25rem;
  padding: 0;
  border: 1px solid var(--skyroom-border, rgba(13, 136, 126, 0.16));
  border-radius: 999px;
  background-color: var(--skyroom-glass, rgba(255, 255, 255, 0.7));
  backdrop-filter: saturate(180%) blur(10px);
  -webkit-backdrop-filter: saturate(180%) blur(10px);
  cursor: pointer;
  color: var(--color-heading, #0B1220);
  box-shadow: var(--skyroom-shadow-sm, 0 2px 8px rgba(13, 136, 126, 0.06));

  transition:
    background-color 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    box-shadow 220ms ease,
    transform 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--skyroom-border-strong, rgba(13, 136, 126, 0.28));
    box-shadow: var(--skyroom-shadow, 0 8px 24px rgba(11, 18, 32, 0.08));
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--skyroom-brand-500, #0D887E);
    outline-offset: 2px;
  }

  /* gradient halo on hover */
  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    background: var(--skyroom-gradient-primary, linear-gradient(135deg, #0D887E 0%, #14A99E 100%));
    opacity: 0;
    z-index: -1;
    filter: blur(8px);
    transition: opacity 240ms ease;
    pointer-events: none;
  }

  &:hover::after {
    opacity: 0.35;
  }

  ${({ $isDark }) => $isDark && css`
    color: #E6EDF7;
  `}
`;

export const IconWrap = styled.span`
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  animation: ${rotateIn} 220ms ease both;

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

export default { ToggleButton, IconWrap };
