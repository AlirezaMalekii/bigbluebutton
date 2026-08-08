import styled, { css } from 'styled-components';

type AvatarRole = 'moderator' | 'viewer';

interface BadgeProps {
  $role: AvatarRole;
  $accent?: string;
}

const moderatorAccent = 'var(--color-primary, var(--skyroom-accent, #20c7bb))';
const viewerAccent = 'rgba(148, 163, 184, 0.92)';

const Badge = styled.span<BadgeProps>`
  --skyroom-user-avatar-accent: ${({ $role }) => (
    $role === 'moderator' ? moderatorAccent : viewerAccent
  )};

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
  background: ${({ $role }) => (
    $role === 'moderator'
      ? 'rgba(13, 136, 126, 0.12)'
      : 'rgba(148, 163, 184, 0.12)'
  )};
  border: 1px solid ${({ $role }) => (
    $role === 'moderator'
      ? 'rgba(32, 199, 187, 0.28)'
      : 'rgba(148, 163, 184, 0.22)'
  )};

  ${({ $role }) => $role === 'moderator' && css`
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  `}

  svg {
    position: relative;
    z-index: 1;
    display: block;
    width: 76%;
    height: 76%;
    flex-shrink: 0;
  }
`;

export default { Badge };
