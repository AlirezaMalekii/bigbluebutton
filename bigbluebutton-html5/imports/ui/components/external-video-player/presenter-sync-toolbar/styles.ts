import styled from 'styled-components';

export const Bar = styled.div`
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(8, 14, 24, 0.9);
  border: 1px solid rgba(34, 212, 199, 0.35);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  pointer-events: auto;

  @media (max-width: 768px) {
    left: 8px;
    right: 8px;
    bottom: 8px;
    gap: 8px;
    padding: 8px 10px;
  }
`;

export const PlayButton = styled.button`
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #fff;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  &:hover {
    filter: brightness(1.06);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

export const Time = styled.span`
  flex: 0 0 auto;
  min-width: 2.5rem;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: rgba(196, 228, 223, 0.92);
  text-align: center;

  @media (max-width: 768px) {
    min-width: 2.1rem;
    font-size: 0.7rem;
  }
`;

type ProgressTrackProps = { $disabled?: boolean };

export const ProgressTrack = styled.div<ProgressTrackProps>`
  position: relative;
  flex: 1 1 auto;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  overflow: hidden;
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }
`;

export const ProgressLoaded = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 255, 255, 0.14);
`;

export const ProgressPlayed = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #22d4c7, #0a7a72);
`;

export const ProgressThumb = styled.div`
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #f4fbfa;
  border: 2px solid #22d4c7;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  pointer-events: none;
`;

export const VolumeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  max-width: 140px;

  @media (max-width: 768px) {
    max-width: 96px;
  }
`;

export const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #dff8f4;
  background: rgba(255, 255, 255, 0.06);

  i {
    font-size: 0.95rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const VolumeSlider = styled.input`
  width: 72px;
  accent-color: #22d4c7;
  cursor: pointer;

  @media (max-width: 768px) {
    width: 52px;
  }
`;

export default {
  Bar,
  PlayButton,
  Time,
  ProgressTrack,
  ProgressLoaded,
  ProgressPlayed,
  ProgressThumb,
  VolumeGroup,
  IconButton,
  VolumeSlider,
};
