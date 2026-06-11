import styled, { keyframes } from 'styled-components';

const breathe = keyframes`
  0%, 100% { opacity: 0.88; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.04); }
`;

const pulseDot = keyframes`
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; filter: drop-shadow(0 0 3px rgba(32, 199, 187, 0.65)); }
`;

const alertPulse = keyframes`
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
`;

const Wrap = styled.span`
  --skyroom-conn-grad-from: #1ec4b8;
  --skyroom-conn-grad-to: #5ee8de;
  --skyroom-conn-muted: rgba(190, 204, 220, 0.42);
  --skyroom-conn-ink: rgba(210, 222, 238, 0.55);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--skyroom-conn-ink);

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .skyroom-conn-icon__plate {
    fill: rgba(255, 255, 255, 0.03);
    stroke: rgba(218, 230, 245, 0.08);
    stroke-width: 0.75;
  }

  .skyroom-conn-icon__arc[data-active="false"] {
    opacity: 0.38;
  }

  .skyroom-conn-icon__arc[data-active="true"] {
    opacity: 1;
    filter: drop-shadow(0 0 2px rgba(32, 199, 187, 0.35));
  }

  .skyroom-conn-icon__slash {
    stroke: rgba(240, 96, 96, 0.88);
  }

  &.skyroom-conn-icon--normal {
    --skyroom-conn-grad-from: #ffffff;
    --skyroom-conn-grad-to: #3fd9cf;
    color: var(--skyroom-conn-muted);
    animation: ${breathe} 2.8s ease-in-out infinite;

    .skyroom-conn-icon__plate {
      fill: rgba(32, 199, 187, 0.06);
      stroke: rgba(32, 199, 187, 0.18);
    }

    .skyroom-conn-icon__dot {
      animation: ${pulseDot} 2.2s ease-in-out infinite;
    }
  }

  &.skyroom-conn-icon--warning {
    --skyroom-conn-grad-from: #c98a12;
    --skyroom-conn-grad-to: #f5c842;

    .skyroom-conn-icon__plate {
      fill: rgba(245, 184, 66, 0.08);
      stroke: rgba(245, 184, 66, 0.22);
    }
  }

  &.skyroom-conn-icon--danger {
    --skyroom-conn-grad-from: #d4621a;
    --skyroom-conn-grad-to: #ff9a4d;

    .skyroom-conn-icon__plate {
      fill: rgba(255, 140, 66, 0.08);
      stroke: rgba(255, 140, 66, 0.24);
    }
  }

  &.skyroom-conn-icon--critical {
    --skyroom-conn-grad-from: #c62828;
    --skyroom-conn-grad-to: #ff6b66;
    animation: ${alertPulse} 1.1s ease-in-out infinite;

    .skyroom-conn-icon__plate {
      fill: rgba(240, 80, 80, 0.1);
      stroke: rgba(240, 80, 80, 0.28);
    }
  }

  &.skyroom-conn-icon--disconnected {
    --skyroom-conn-grad-from: #6b7689;
    --skyroom-conn-grad-to: #9aa8ba;
    color: rgba(154, 168, 186, 0.35);
    animation: none;

    .skyroom-conn-icon__plate {
      fill: rgba(255, 255, 255, 0.02);
      stroke: rgba(218, 230, 245, 0.06);
    }

    .skyroom-conn-icon__arc {
      opacity: 0.18;
    }
  }
`;

export default { Wrap };
