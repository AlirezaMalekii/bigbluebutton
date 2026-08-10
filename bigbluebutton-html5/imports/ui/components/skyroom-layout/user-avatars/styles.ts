import styled from 'styled-components';

type AvatarRole = 'moderator' | 'viewer' | 'presenter' | 'guest';

interface BadgeProps {
  $role: AvatarRole;
}

const roleColor = (role: AvatarRole) => {
  switch (role) {
    case 'moderator':
      return 'var(--color-primary, var(--skyroom-accent, #20c7bb))';
    case 'presenter':
      return 'var(--skyroom-presenter-icon, #e8b84a)';
    case 'guest':
      return 'rgba(125, 211, 252, 0.92)';
    case 'viewer':
    default:
      return 'rgba(148, 163, 184, 0.95)';
  }
};

/** Flat filled person icon — no circle chrome around the glyph. */
const Badge = styled.span<BadgeProps>`
  --skyroom-user-avatar-accent: ${({ $role }) => roleColor($role)};

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--skyroom-user-avatar-accent);
  box-shadow: none;
  overflow: visible;

  svg {
    display: block;
    width: 92%;
    height: 92%;
    flex-shrink: 0;
  }
`;

export default { Badge };
