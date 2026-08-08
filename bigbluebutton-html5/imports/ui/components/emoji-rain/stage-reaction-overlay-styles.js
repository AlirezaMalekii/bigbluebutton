import styled, { keyframes } from 'styled-components';

const rise = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(-50%, 10px, 0) scale(0.9);
  }

  12% {
    opacity: 1;
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
  }
`;

const Stage = styled.div`
  /* Fixed + DOM-measured box tracks chat column geometry (incl. RTL). */
  position: fixed;
  overflow: hidden;
  pointer-events: none;
  z-index: ${({ $zIndex }) => $zIndex} !important;
  contain: layout paint style;
  border-radius: clamp(0.55rem, 1vw, 1rem);
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
  bottom: clamp(0.45rem, 5%, 1.25rem);
  will-change: transform, opacity;
  animation: ${rise} var(--reaction-duration) cubic-bezier(0.19, 1, 0.22, 1)
    var(--reaction-delay) forwards;
`;

const BubbleCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.16rem;
  min-width: 2.35rem;
  padding: 0.26rem 0.38rem 0.3rem;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.35), transparent 62%),
    rgba(16, 24, 40, 0.42);
  box-shadow:
    0 0.4rem 1rem rgba(15, 23, 42, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);

  @media (max-width: 640px) {
    gap: 0.12rem;
    min-width: 2.1rem;
    padding: 0.22rem 0.32rem 0.26rem;
  }
`;

const Emoji = styled.span`
  display: block;
  font-size: clamp(0.95rem, 2.2vw, 1.25rem);
  line-height: 1;
  text-shadow: 0 0.2rem 0.55rem rgba(15, 23, 42, 0.24);

  @media (max-width: 640px) {
    font-size: clamp(0.88rem, 4.2vw, 1.12rem);
  }
`;

const Name = styled.span`
  display: block;
  max-width: min(6.5rem, 42vw);
  overflow: hidden;
  color: #fff;
  font-size: clamp(0.55rem, 1.05vw, 0.65rem);
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 1px 0.35rem rgba(15, 23, 42, 0.55);
  unicode-bidi: plaintext;
  white-space: nowrap;

  @media (max-width: 640px) {
    max-width: 5.5rem;
    font-size: 0.55rem;
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
