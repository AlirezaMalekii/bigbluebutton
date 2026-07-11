import styled, { css, keyframes } from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import { colorPrimary } from '/imports/ui/stylesheets/styled-components/palette';
import {
  mdPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import { lineHeightComputed } from '/imports/ui/stylesheets/styled-components/typography';

const AudioChoiceIntro = styled.p`
  margin: 0 0 0.875rem;
  padding: 0;
  text-align: center;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--skyroom-text-muted, #8b95a5);
  max-width: 20rem;
`;

const AudioOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
  max-width: 22rem;
`;

const AudioChoiceCard = styled.button`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  margin: 0;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(20, 169, 158, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  text-align: inherit;
  font: inherit;
  color: inherit;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.12s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    border-color: rgba(20, 169, 158, 0.34);
    background: rgba(20, 169, 158, 0.08);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
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
`;

const AudioChoiceText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
  text-align: start;
`;

const AudioChoiceTitle = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--skyroom-text-primary, #eef4fb);

  @media ${smallOnly} {
    font-size: 0.875rem;
  }
`;

const AudioChoiceHint = styled.span`
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--skyroom-text-muted, #8b95a5);

  @media ${smallOnly} {
    font-size: 0.6875rem;
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
  align-items: center;
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
