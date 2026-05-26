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
  margin: 0 0 1.25rem;
  padding: 0 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--skyroom-text-secondary, #aab6c7);
  max-width: 36rem;
`;

const AudioOptions = styled.div`
  margin-top: auto;
  margin-bottom: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 1.5rem 2.5rem;
  width: 100%;
`;

const AudioOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 11.5rem;
  text-align: center;
`;

const AudioOptionDesc = styled.p`
  margin: 0.65rem 0 0;
  padding: 0 0.25rem;
  font-size: 0.78rem;
  line-height: 1.45;
  font-weight: 400;
  color: var(--skyroom-text-secondary, #aab6c7);
`;

/* Classic BBB mic / listen-only layout — label color adapted for dark modal shell */
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
  font-size: 2rem;
  text-align: center;
  color: var(--skyroom-text-primary, #eef4fb);
`;

const ConnectingSubtext = styled.p`
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-size: 1.5rem;
  text-align: center;
  color: var(--skyroom-text-secondary, #aab6c7);
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
  padding: 1rem;
  min-height: 20rem;
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
  padding: 0.5rem 0;
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
  AudioOption,
  AudioOptionDesc,
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
