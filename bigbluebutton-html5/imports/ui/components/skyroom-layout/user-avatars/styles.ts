import styled, { css } from 'styled-components';

type AvatarRole = 'moderator' | 'viewer';

interface BadgeProps {
  $role: AvatarRole;
  $accent?: string;
}

const moderatorAccent = 'var(--skyroom-accent, #20c7bb)';
const moderatorAccentSoft = 'var(--skyroom-accent-soft, rgba(32, 199, 187, 0.12))';
const moderatorAccentBorder = 'var(--skyroom-accent-border, rgba(32, 199, 187, 0.36))';

const resolveAccent = (role: AvatarRole, accent?: string) => (
  role === 'moderator' ? moderatorAccent : (accent || 'rgba(148, 163, 184, 0.88)')
);

const resolveAccentSoft = (role: AvatarRole, accent?: string) => {
  if (role === 'moderator') return moderatorAccentSoft;
  if (accent) return `${accent}33`;
  return 'rgba(148, 163, 184, 0.14)';
};

const resolveAccentRing = (role: AvatarRole, accent?: string) => {
  if (role === 'moderator') return moderatorAccentBorder;
  if (accent) return `${accent}55`;
  return 'rgba(218, 230, 245, 0.18)';
};

const Badge = styled.span<BadgeProps>`
  --skyroom-user-avatar-accent: ${({ $role, $accent }) => resolveAccent($role, $accent)};
  --skyroom-user-avatar-accent-soft: ${({ $role, $accent }) => resolveAccentSoft($role, $accent)};
  --skyroom-user-avatar-ring: ${({ $role, $accent }) => resolveAccentRing($role, $accent)};

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-sizing: border-box;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 28% 22%, var(--skyroom-user-avatar-accent-soft), transparent 62%),
    linear-gradient(155deg, rgba(22, 32, 48, 0.96) 0%, rgba(10, 16, 26, 0.98) 100%);
  border: 1px solid var(--skyroom-user-avatar-ring);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 -1px 0 rgba(0, 0, 0, 0.22),
    0 1px 3px rgba(0, 0, 0, 0.28);

  &::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.04);
    pointer-events: none;
    z-index: 0;
  }

  ${({ $role }) => $role === 'moderator' && css`
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.09),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(32, 199, 187, 0.08),
      0 2px 8px rgba(13, 136, 126, 0.22);

    &::after {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      background: conic-gradient(
        from 210deg,
        rgba(32, 199, 187, 0.55),
        rgba(63, 194, 184, 0.18),
        rgba(32, 199, 187, 0.42),
        rgba(13, 136, 126, 0.55)
      );
      mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px));
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px));
      pointer-events: none;
      z-index: 0;
      opacity: 0.9;
    }
  `}

  ${({ $role }) => $role === 'viewer' && css`
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 115%, rgba(0, 0, 0, 0.28), transparent 58%);
      pointer-events: none;
      z-index: 0;
    }
  `}

  svg {
    position: relative;
    z-index: 1;
    display: block;
    width: 60%;
    height: 60%;
    flex-shrink: 0;
  }
`;

export default { Badge };
