import styled from 'styled-components';

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-inline-end: 2px;
`;

const Plate = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  max-width: 120px;
  padding: 4px 8px;
  border-radius: 9px;
  border: 1px solid rgba(218, 230, 245, 0.1);
  background: rgba(255, 255, 255, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
`;

const Link = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  max-width: 120px;
  padding: 4px 8px;
  border-radius: 9px;
  border: 1px solid rgba(218, 230, 245, 0.1);
  background: rgba(255, 255, 255, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    border-color: var(--skyroom-accent-border, rgba(32, 199, 187, 0.38));
    background: var(--skyroom-accent-soft, rgba(32, 199, 187, 0.1));
    box-shadow: 0 2px 10px var(--skyroom-accent-glow, rgba(32, 199, 187, 0.14));
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--skyroom-accent, #20c7bb);
    outline-offset: 2px;
  }
`;

const LogoImage = styled.img`
  display: block;
  max-height: 22px;
  max-width: 104px;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
`;

export default {
  Wrap,
  Plate,
  Link,
  LogoImage,
};
