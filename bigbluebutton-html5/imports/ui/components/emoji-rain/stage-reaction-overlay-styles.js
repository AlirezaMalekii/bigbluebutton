import styled, { keyframes } from 'styled-components';

const rise = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(-50%, 12px, 0) scale(0.88);
    filter: blur(1px);
  }

  12% {
    opacity: 1;
    filter: blur(0);
  }

  78% {
    opacity: 0.96;
  }

  100% {
    opacity: 0;
    transform: translate3d(
      calc(-50% + var(--reaction-drift)),
      calc(-1 * var(--reaction-travel)),
      0
    ) scale(1.02);
    filter: blur(1.5px);
  }
`;

const Stage = styled.div`
  position: absolute;
  overflow: hidden;
  pointer-events: none;
  z-index: ${({ $zIndex }) => $zIndex};
  contain: layout paint style;
  border-radius: clamp(0.75rem, 1.2vw, 1.35rem);
`;

const Bubble = styled.div.attrs(({
  $left,
  $drift,
  $duration,
  $delay,
  $travel,
}) => ({
  style: {
    '--reaction-left': `${$left}%`,
    '--reaction-drift': `${$drift}px`,
    '--reaction-duration': `${$duration}ms`,
    '--reaction-delay': `${$delay}ms`,
    '--reaction-travel': `${$travel}px`,
  },
}))`
  position: absolute;
  left: var(--reaction-left);
  bottom: clamp(0.75rem, 6%, 2rem);
  will-change: transform, opacity, filter;
  animation: ${rise} var(--reaction-duration) cubic-bezier(0.19, 1, 0.22, 1)
    var(--reaction-delay) forwards;
`;

const BubbleCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  min-width: 3.5rem;
  padding: 0.42rem 0.58rem 0.48rem;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.35), transparent 62%),
    rgba(16, 24, 40, 0.36);
  box-shadow:
    0 0.75rem 2rem rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px) saturate(1.28);
  -webkit-backdrop-filter: blur(10px) saturate(1.28);

  @media (max-width: 640px) {
    gap: 0.2rem;
    min-width: 2.85rem;
    padding: 0.34rem 0.46rem 0.38rem;
    box-shadow:
      0 0.5rem 1.25rem rgba(15, 23, 42, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.24);
  }
`;

const Emoji = styled.span`
  display: block;
  font-size: clamp(1.45rem, 3.1vw, 2.35rem);
  line-height: 1;
  text-shadow: 0 0.35rem 1rem rgba(15, 23, 42, 0.24);

  @media (max-width: 640px) {
    font-size: clamp(1.15rem, 6.5vw, 1.65rem);
  }
`;

const Name = styled.span`
  display: block;
  max-width: min(10rem, 26vw);
  overflow: hidden;
  color: #fff;
  font-size: clamp(0.62rem, 1.15vw, 0.78rem);
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0.45rem rgba(15, 23, 42, 0.55);
  unicode-bidi: plaintext;
  white-space: nowrap;

  @media (max-width: 640px) {
    max-width: 6.75rem;
    font-size: 0.58rem;
  }
`;

const Styled = {
  Stage,
  Bubble,
  BubbleCard,
  Emoji,
  Name,
};

export default Styled;
