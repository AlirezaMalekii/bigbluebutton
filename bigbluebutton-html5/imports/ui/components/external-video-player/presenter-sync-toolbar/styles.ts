import styled from 'styled-components';

export const TOOLBAR_HEIGHT_PX = 34;

export const Bar = styled.div`
  direction: ltr;
  position: relative;
  flex: 0 0 ${TOOLBAR_HEIGHT_PX}px;
  height: ${TOOLBAR_HEIGHT_PX}px;
  width: 100%;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  box-sizing: border-box;
  background: rgba(8, 14, 24, 0.96);
  border-top: 1px solid rgba(34, 212, 199, 0.28);
  pointer-events: auto;

  @media (max-width: 768px) {
    gap: 4px;
    padding: 0 6px;
  }
`;

export const LeftCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
`;

export const RightCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  margin-inline-start: auto;
`;

export const ProgressCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
`;

export const PlayButton = styled.button`
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #fff;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));
  padding: 0;

  svg {
    width: 0.85rem;
    height: 0.85rem;
  }

  &:hover {
    filter: brightness(1.06);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

export const SkipButton = styled.button`
  min-width: 28px;
  height: 24px;
  flex: 0 0 auto;
  border: none;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  color: #dff8f4;
  background: rgba(255, 255, 255, 0.06);
  padding: 0 4px;
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;

  svg {
    width: 0.7rem;
    height: 0.7rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const Time = styled.span`
  flex: 0 0 auto;
  min-width: 2rem;
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
  color: rgba(196, 228, 223, 0.92);
  text-align: center;

  @media (max-width: 768px) {
    min-width: 1.75rem;
    font-size: 0.6rem;
  }
`;

type ProgressTrackProps = { $disabled?: boolean };

export const ProgressTrack = styled.div<ProgressTrackProps>`
  position: relative;
  flex: 1 1 auto;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  overflow: visible;
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  min-width: 48px;

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }
`;

export const ProgressLoaded = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: none;
`;

export const ProgressPlayed = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #22d4c7, #0a7a72);
  pointer-events: none;
`;

export const ProgressThumb = styled.div`
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #f4fbfa;
  border: 1.5px solid #22d4c7;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  pointer-events: none;
`;

export const VolumeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  max-width: 110px;

  @media (max-width: 768px) {
    max-width: 78px;
  }
`;

export const IconButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #dff8f4;
  background: rgba(255, 255, 255, 0.06);
  padding: 0;

  i {
    font-size: 0.8rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const VolumeSlider = styled.input`
  width: 56px;
  height: 16px;
  accent-color: #22d4c7;
  cursor: pointer;

  @media (max-width: 768px) {
    width: 40px;
  }
`;

export const RateSelect = styled.select`
  height: 24px;
  min-width: 46px;
  border: none;
  border-radius: 6px;
  padding: 0 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #dff8f4;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  appearance: none;
  text-align: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  option {
    color: #0b1520;
    background: #fff;
  }
`;

export default {
  Bar,
  LeftCluster,
  RightCluster,
  ProgressCluster,
  PlayButton,
  SkipButton,
  Time,
  ProgressTrack,
  ProgressLoaded,
  ProgressPlayed,
  ProgressThumb,
  VolumeGroup,
  IconButton,
  VolumeSlider,
  RateSelect,
  TOOLBAR_HEIGHT_PX,
};
