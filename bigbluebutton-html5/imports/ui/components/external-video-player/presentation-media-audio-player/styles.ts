import styled, { keyframes } from 'styled-components';

const equalizerPulse = keyframes`
  0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
`;

const discSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const Root = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vw, 32px);
  box-sizing: border-box;
  pointer-events: auto;
  background:
    radial-gradient(circle at 20% 20%, rgba(32, 199, 187, 0.16), transparent 42%),
    radial-gradient(circle at 80% 80%, rgba(10, 122, 114, 0.22), transparent 48%),
    linear-gradient(160deg, #071018 0%, #0c1524 45%, #0a111c 100%);
`;

export const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

export const GlowRing = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(420px, 70%);
  aspect-ratio: 1;
  transform: translate(-50%, -58%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 212, 199, 0.18) 0%, rgba(34, 212, 199, 0) 68%);
  filter: blur(8px);
`;

export const Visual = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -62%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
`;

type DiscProps = { $playing: boolean };

export const Disc = styled.div<DiscProps>`
  width: clamp(96px, 18vw, 140px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 40%),
    linear-gradient(145deg, rgba(34, 212, 199, 0.35), rgba(10, 122, 114, 0.85));
  border: 1px solid rgba(34, 212, 199, 0.45);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.45),
    inset 0 0 0 6px rgba(0, 0, 0, 0.25);
  animation: ${({ $playing }) => ($playing ? discSpin : 'none')} 8s linear infinite;
`;

export const DiscInner = styled.div`
  width: 42%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(6, 12, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);

  i {
    color: #22d4c7;
    font-size: 1.35rem;
  }
`;

type EqualizerProps = { $playing: boolean };

export const Equalizer = styled.div<EqualizerProps>`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  height: 34px;
  opacity: ${({ $playing }) => ($playing ? 1 : 0.45)};
`;

type EqualizerBarProps = { $index: number; $playing: boolean };

export const EqualizerBar = styled.span<EqualizerBarProps>`
  width: 5px;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #7cf3ea 0%, #22d4c7 55%, #0a7a72 100%);
  transform-origin: bottom;
  animation: ${equalizerPulse} 1s ease-in-out infinite;
  animation-delay: ${({ $index }) => `${$index * 0.12}s`};
  animation-play-state: ${({ $playing }) => ($playing ? 'running' : 'paused')};
  transform: ${({ $playing }) => ($playing ? 'scaleY(1)' : 'scaleY(0.35)')};
`;

export const Panel = styled.div`
  position: relative;
  z-index: 1;
  width: min(520px, 100%);
  margin-top: clamp(72px, 16vh, 120px);
  padding: 18px 20px 16px;
  border-radius: 18px;
  background: rgba(8, 14, 24, 0.82);
  border: 1px solid rgba(34, 212, 199, 0.28);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
`;

export const Title = styled.h2`
  margin: 0;
  font-size: clamp(0.95rem, 2.4vw, 1.15rem);
  font-weight: 700;
  color: #f4fbfa;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Subtitle = styled.p`
  margin: 4px 0 14px;
  font-size: 0.78rem;
  color: rgba(180, 220, 214, 0.82);
`;

export const ProgressRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

export const Time = styled.span`
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: rgba(196, 228, 223, 0.88);
  min-width: 2.5rem;
  text-align: center;
`;

export const ProgressTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  overflow: hidden;

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }
`;

export const ProgressLoaded = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(255, 255, 255, 0.12);
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

export const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
`;

export const PlayButton = styled.button`
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #fff;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));
  box-shadow: 0 10px 24px rgba(10, 122, 114, 0.45);

  svg {
    width: 1.35rem;
    height: 1.35rem;
  }

  &:hover {
    filter: brightness(1.06);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }
`;

export const VolumeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  justify-content: flex-end;
`;

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #dff8f4;
  background: rgba(255, 255, 255, 0.06);

  i {
    font-size: 1rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const VolumeSlider = styled.input`
  width: min(120px, 28vw);
  accent-color: #22d4c7;
  cursor: pointer;
`;

export default {
  Root,
  Backdrop,
  GlowRing,
  Visual,
  Disc,
  DiscInner,
  Equalizer,
  EqualizerBar,
  Panel,
  Title,
  Subtitle,
  ProgressRow,
  Time,
  ProgressTrack,
  ProgressLoaded,
  ProgressPlayed,
  ProgressThumb,
  Controls,
  PlayButton,
  VolumeGroup,
  IconButton,
  VolumeSlider,
};
