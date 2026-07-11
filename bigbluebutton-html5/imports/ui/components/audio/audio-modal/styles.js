import styled, { css, keyframes } from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { smallOnly, mediumUp } from '/imports/ui/stylesheets/styled-components/breakpoints';
import { colorPrimary } from '/imports/ui/stylesheets/styled-components/palette';
import {
  mdPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import { lineHeightComputed } from '/imports/ui/stylesheets/styled-components/typography';

const AudioChoiceIntro = styled.p`
  margin: 0 0 1rem;
  padding: 0;
  text-align: center;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--skyroom-text-muted, #8b95a5);
  max-width: 100%;

  @media ${mediumUp} {
    margin-bottom: 1.125rem;
    font-size: 0.875rem;
  }
`;

const AudioOptions = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.625rem;
  width: 100%;

  @media ${mediumUp} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem;
  }
`;

const AudioChoiceCard = styled.button`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  margin: 0;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(20, 169, 158, 0.16);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
  text-align: inherit;
  font: inherit;
  color: inherit;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.16s ease,
    box-shadow 0.18s ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    border-color: rgba(20, 169, 158, 0.42);
    background: rgba(20, 169, 158, 0.1);
    box-shadow:
      0 10px 28px rgba(0, 0, 0, 0.18),
      0 0 0 1px rgba(20, 169, 158, 0.12);
  }

  &:active:not(:disabled) {
    transform: scale(0.985);
  }

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }

  @media ${smallOnly} {
    padding: 0.8125rem 0.9375rem;
    gap: 0.75rem;
    border-radius: 13px;
  }

  @media ${mediumUp} {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 9.25rem;
    padding: 1.35rem 1rem 1.2rem;
    gap: 0.8rem;
    border-radius: 16px;

    &:hover:not(:disabled),
    &:focus-visible:not(:disabled) {
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.99);
    }
  }
`;

const AudioChoiceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  background: var(
    --skyroom-gradient-primary-soft,
    linear-gradient(135deg, rgba(13, 136, 126, 0.14) 0%, rgba(20, 169, 158, 0.22) 100%)
  );
  color: var(--skyroom-brand-400, #14a99e);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);

  i {
    font-size: 1.3rem;
    line-height: 1;
  }

  @media ${smallOnly} {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 11px;

    i {
      font-size: 1.15rem;
    }
  }

  @media ${mediumUp} {
    width: 3.35rem;
    height: 3.35rem;
    border-radius: 14px;

    i {
      font-size: 1.55rem;
    }
  }
`;

const AudioChoiceText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
  text-align: start;

  @media ${mediumUp} {
    flex: 0 1 auto;
    align-items: center;
    text-align: center;
    gap: 0.3rem;
    width: 100%;
  }
`;

const AudioChoiceTitle = styled.div`
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--skyroom-text-primary, #eef4fb);

  @media ${smallOnly} {
    font-size: 0.875rem;
  }

  @media ${mediumUp} {
    font-size: 1rem;
  }
`;

const AudioChoiceHint = styled.div`
  display: block;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--skyroom-text-muted, #8b95a5);

  @media ${smallOnly} {
    font-size: 0.6875rem;
  }

  @media ${mediumUp} {
    font-size: 0.8125rem;
    max-width: 11rem;
  }
`;

/* Legacy echo-test / help buttons */
const AudioModalButton = styled(Button)`
  i {
    color: #3c5764;
  }

  & span:first-child {
    display: inline-block;
    color: #1b3c4b;
    background-color: #f1f8ff;
    box-shadow: none;
    border: 5px solid #f1f8ff;
    font-size: 3.5rem;

    @media ${smallOnly} {
      font-size: 2.5rem;
    }
  }

  &:hover span:first-child,
  &:focus span:first-child {
    border: 5px solid ${colorPrimary};
    background-color: #f1f8ff;
  }

  & span:last-child {
    display: block;
    color: var(--skyroom-text-primary, #eef4fb);
    font-size: 0.95rem;
    font-weight: 600;
    margin-top: 1rem;
    line-height: 1.35;
  }
`;

const AudioDial = styled(Button)`
  margin: 0 auto;
  margin-top: ${mdPaddingY};
  display: block;
`;

const Connecting = styled.div`
  margin-top: auto;
  margin-bottom: auto;
  font-size: 1rem;
  text-align: center;
  color: var(--skyroom-text-primary, #eef4fb);

  @media ${smallOnly} {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.45;
    margin: 0.35rem 0;
  }
`;

const ConnectingSubtext = styled.p`
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-size: 0.875rem;
  text-align: center;
  color: var(--skyroom-text-muted, #8b95a5);

  @media ${smallOnly} {
    font-size: 0.75rem;
    margin-top: 0.3rem;
    line-height: 1.35;
  }
`;

const ellipsis = keyframes`
  to {
    width: 1.5em;
  }
`;

const ConnectingAnimation = styled.span`
  margin: auto;
  display: inline-block;
  width: 1.5em;

  &:after {
    overflow: hidden;
    display: inline-block;
    vertical-align: bottom;
    content: "\\2026";
    width: 0;
    margin-left: 0.25em;

    ${({ animations }) => animations && css`
      animation: ${ellipsis} steps(4, end) 900ms infinite;
    `}
  }
`;

const AudioModal = styled(ModalSimple)`
  padding: 1rem 1.125rem 1.25rem;
  min-height: 0;
  width: 100%;
  max-width: 22rem;
  box-sizing: border-box;

  @media ${mediumUp} {
    max-width: 28rem;
    padding: 1.375rem 1.5rem 1.5rem;
  }

  @media ${smallOnly} {
    padding: 0.875rem 1rem 1rem;
  }
`;

const BrowserWarning = styled.p`
  margin: ${lineHeightComputed};
  text-align: center;
  padding: 0.5rem;
  border-width: 3px;
  border-style: solid;
  border-radius: 0.25rem;
  color: var(--skyroom-text-primary, #eef4fb);
`;

const Content = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  margin-top: auto;
  margin-bottom: auto;
  padding: 0.25rem 0 0;
  width: 100%;
`;

const Background = styled.span`
  ${({ isBlurred }) => isBlurred
    && css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(10px);
    z-index: 998;
    `}
`;

export default {
  AudioChoiceIntro,
  AudioOptions,
  AudioChoiceCard,
  AudioChoiceIcon,
  AudioChoiceText,
  AudioChoiceTitle,
  AudioChoiceHint,
  AudioModalButton,
  AudioDial,
  Background,
  Connecting,
  ConnectingAnimation,
  ConnectingSubtext,
  AudioModal,
  BrowserWarning,
  Content,
};
