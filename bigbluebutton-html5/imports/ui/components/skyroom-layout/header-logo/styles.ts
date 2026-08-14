import styled from 'styled-components';

const Group = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  margin-inline-end: 2px;
`;

const PlatformWrap = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

const PlatformLink = styled.a<{ $iconOnly?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  height: 42px;
  max-width: min(240px, 38vw);
  padding: 0;
  border: none;
  background: transparent;
  box-sizing: border-box;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.18s ease;

  ${({ $iconOnly }) => $iconOnly && `
    height: 36px;
    width: 36px;
    max-width: 36px;
    justify-content: center;
  `}

  &:hover {
    opacity: 0.9;
  }

  &:active {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--skyroom-accent, #20c7bb);
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

const platformLogoSizing = `
  display: block;
  flex: 0 0 auto;
  height: 42px;
  width: auto;
  max-width: min(220px, 42vw);
  object-fit: contain;
  object-position: left center;
  user-select: none;
  -webkit-user-drag: none;
`;

const PlatformLogoImage = styled.img<{ $iconOnly?: boolean }>`
  ${platformLogoSizing}
  ${({ $iconOnly }) => $iconOnly && `
    width: 36px;
    height: 36px;
    max-width: 36px;
    min-width: 36px;
    aspect-ratio: 1 / 1;
    object-fit: contain;
    object-position: center;
  `}
`;

const PlatformLogoObject = styled.object`
  ${platformLogoSizing}
  pointer-events: none;
`;

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding-inline-start: 6px;
  border-inline-start: 1px solid rgba(218, 230, 245, 0.12);
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

const FooterSlot = styled.div.attrs({
  'data-test': 'skyroomFooterLogoSlot',
})`
  position: fixed;
  left: 16px;
  bottom: calc((var(--skyroom-footer-h, 56px) - 28px) / 2);
  top: auto;
  transform: none;
  z-index: 22;
  display: inline-flex;
  align-items: center;
  pointer-events: auto;

  &[data-mobile-footer='true'] {
    left: 12px;
    bottom: auto;
    z-index: 3;
  }

  &[data-mobile-footer='true'][data-in-actions-bar='true'] {
    position: absolute !important;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 25;
    pointer-events: auto;
  }

  &[data-mobile-footer='true']:not([data-in-actions-bar='true']) {
    position: fixed;
    top: calc(var(--skyroom-actionbar-top, 92vh) + (var(--skyroom-footer-h, 56px) - 36px) / 2);
    z-index: 22;
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
  Group,
  PlatformWrap,
  PlatformLink,
  PlatformLogoImage,
  PlatformLogoObject,
  Wrap,
  Plate,
  Link,
  LogoImage,
  FooterSlot,
};
