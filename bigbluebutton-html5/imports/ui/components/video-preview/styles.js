import styled, { css, keyframes } from 'styled-components';
import {
  borderSize,
  borderSizeLarge,
  mdPaddingX,
  titlePositionLeft,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorText,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  fontSizeLarge,
  lineHeightComputed,
  headingsFontWeight,
} from '/imports/ui/stylesheets/styled-components/typography';
import { smallOnly, mediumOnly, landscape } from '/imports/ui/stylesheets/styled-components/breakpoints';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import ModalStyles from '/imports/ui/components/common/modal/simple/styles';
import Button from '/imports/ui/components/common/button/component';
import {
  Tab, Tabs, TabList,
} from 'react-tabs';

const Warning = styled.div`
  text-align: center;
  font-weight: ${headingsFontWeight};
  font-size: 5rem;
  white-space: normal;
`;

const Main = styled.h4`
  margin: ${lineHeightComputed};
  text-align: center;
  font-size: ${fontSizeLarge};
`;

const Text = styled.div`
  margin: ${lineHeightComputed};
  text-align: center;
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: flex-start;
  gap: 12px;
  margin: 0;

  @media ${smallOnly}, ${mediumOnly} {
    justify-content: flex-start;
    align-items: stretch;
    overflow: visible;
    margin: 0;
  }

  @media ${smallOnly} {
    gap: 4px;
  }
`;

const BgnCol = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: flex-start;
  margin: 0;

  @media ${smallOnly} {
    justify-content: flex-start;
    align-items: stretch;
    margin: 0;
  }
`;

const InternCol = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  margin: 0 0.5rem 0 0.5rem;

  @media ${smallOnly} {
    width: 100%;
    margin: 0;
  }
`;

const ContentCol = styled.div`
  width: min(100%, 340px);
  min-height: 25vh;
  flex-shrink: 0;

  @media ${smallOnly} {
    width: 100%;
    min-height: 0;
    flex: 1 1 auto;
  }
`;

const BackgroundCol = styled.div`
  display: flex;
  flex-direction: column;
`;

const VideoCol = styled(Col)`
  align-items: center;
  flex: 1 1 320px;
  max-width: 320px;

  @media ${landscape} {
    width: auto;
  }

  @media ${smallOnly} {
    flex: 0 0 auto;
    width: 100%;
    max-width: none;
    margin: 0;
    align-items: stretch;
  }
`;

const Label = styled.label`
  display: block;
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(170, 182, 199, 0.95);

  @media ${smallOnly} {
    font-size: 0.65rem;
    margin: 0 0 2px;
  }
`;

const Select = styled.select`
  background-color: rgba(10, 18, 32, 0.95);
  border: 1px solid rgba(20, 169, 158, 0.32);
  border-radius: 12px;
  color: #eef4fb;
  width: 100%;
  min-height: 2.5rem;
  padding: 8px 12px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(13, 136, 126, 0.22);
    border-color: rgba(20, 169, 158, 0.5);
  }

  @media ${smallOnly} {
    min-height: 32px;
    height: 32px;
    padding: 4px 8px;
    font-size: 0.8rem;
  }
`;

const Content = styled.div`
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 20px;
  color: ${colorText};
  font-weight: normal;
  padding: 4px 0 8px;

  @media ${smallOnly} {
    flex-direction: column;
    margin: 0;
    gap: 6px;
    padding: 0;
    flex: 1 1 auto;
    min-height: 0;
    /* Camera tab should fit without initial scroll; VBG tab scrolls its own grid. */
    overflow-y: hidden;
  }
`;

const BrowserWarning = styled.p`
  padding: 0.5rem;
  border-width: ${borderSizeLarge};
  border-style: solid;
  border-radius: 0.25rem;
  margin: ${lineHeightComputed};
  text-align: center;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;

  @media ${smallOnly} {
    flex-shrink: 0;
    padding-top: 4px;
  }
`;

const FooterContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${({ showStopAllButton }) => (showStopAllButton ? 'flex-start' : 'flex-end')};

  /* Phone: keep the actions on ONE row (stacking them made the modal scroll). */
  @media ${smallOnly} {
    flex-direction: row;
    gap: 8px;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;

  [dir="rtl"] & {
    margin-right: auto;
    margin-left: ${borderSizeLarge};
  }

  & > :first-child {
    margin-right: ${borderSizeLarge};
    margin-left: inherit;

    [dir="rtl"] & {
      margin-right: inherit;
      margin-left: ${borderSizeLarge};
    }
  }
`;

const ExtraActions = styled.div`
  margin-right: auto;
  margin-left: ${borderSizeLarge};

  [dir="rtl"] & {
    margin-left: auto;
    margin-right: ${borderSizeLarge};
  }

  & > :first-child {
    margin-left: ${borderSizeLarge};
    margin-right: inherit;

    [dir="rtl"] & {
      margin-left: inherit;
      margin-right: ${borderSizeLarge};
    }
  }
`;

const VideoPreviewModal = styled(ModalSimple)`
  padding: 1.25rem 1.5rem 1.5rem;
  min-height: 25rem;
  max-height: 100vh;
  width: min(720px, 94vw) !important;
  max-width: 720px !important;

  @media ${smallOnly} {
    height: auto;
    min-height: 0;
    max-height: min(92dvh, 640px);
    width: 100% !important;
    max-width: 100% !important;
    padding: 0.5rem 0.75rem 0.6rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  ${({ $cameraAsContent }) => $cameraAsContent && `
    @media ${smallOnly} {
      max-height: min(90dvh, 560px);
    }
  `}

  ${({ isPhone }) => isPhone && `
    min-height: 100%;
    min-width: 100%;
    border-radius: 0;
  `}

  ${ModalStyles.Content} {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  ${({ isBlurred }) => isBlurred && `
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backdropFilter: 'blur(10px)',
      zIndex: 998,
    }
  `}
`;

const ellipsis = keyframes`
  to {
    width: 1.5em;
  }
`;

const FetchingAnimation = styled.span`
  margin: auto;
  display: inline-block;
  width: 1.5em;

  &:after {
    overflow: hidden;
    display: inline-block;
    vertical-align: bottom;
    content: "\\2026"; /* ascii code for the ellipsis character */
    width: 0;
    margin-left: 0.25em;

    ${({ animations }) => animations && css`
      animation: ${ellipsis} steps(4, end) 900ms infinite;
    `}
  }
`;

const VideoPreview = styled.video`
  height: 100%;
  width: 100%;
  object-fit: cover;
  border-radius: 14px;

  @media ${smallOnly} {
    height: 100%;
    min-height: 0;
  }

  ${({ mirroredVideo }) => mirroredVideo && `
    transform: scale(-1, 1);
  `}
`;

const VideoPreviewFrame = styled.div`
  width: 100%;
  max-width: 320px;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(20, 169, 158, 0.28);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);

  @media ${smallOnly} {
    max-width: none;
    width: 100%;
    aspect-ratio: 16 / 10;
    max-height: min(22dvh, 160px);
    margin: 0;
    border-radius: 12px;
  }
`;

const Marker = styled.div`
  width: 2rem;
  text-align: center;
`;

const MarkerDynamic = styled(Marker)`
  position: absolute;
  top: 0;
`;

const MarkerWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  user-select: none;

  @media ${smallOnly} {
    font-size: 0.6rem;
  }
`;

const MarkerDynamicWrapper = styled.div`
  position: relative;
  height: 1rem;
  user-select: none;

  @media ${smallOnly} {
    height: 0.55rem;
  }
`;

const Container = styled.div`
  padding: 0 calc(${mdPaddingX} / 2 + ${borderSize});

  @media ${smallOnly} {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
`;

const Header = styled.div`
  margin: 0 0 1rem;
  padding: 0;
  border: none;
  line-height: ${titlePositionLeft};

  @media ${smallOnly} {
    margin: 0 0 0.35rem;
    flex-shrink: 0;
  }
`;

const CameraAsContentTitle = styled.h2`
  margin: 0;
  padding: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  color: #eef4fb;

  @media ${smallOnly} {
    font-size: 0.88rem;
  }
`;

const WebcamTabs = styled(Tabs)`
  display: flex;
  flex-flow: column;
`;

const WebcamTabList = styled(TabList)`
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin: 0;
  padding: 4px;
  list-style-type: none;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(218, 230, 245, 0.08);
  border-radius: 14px;
  box-sizing: border-box;

  @media ${smallOnly} {
    gap: 4px;
    padding: 3px;
    border-radius: 10px;
  }
`;

const WebcamTabSelector = styled(Tab)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1 1 0;
  min-height: 44px;
  padding: 8px 12px;
  margin: 0;
  border: none;
  border-radius: 10px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(170, 182, 199, 0.95);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

  &.is-selected {
    color: #ffffff;
    background: linear-gradient(135deg, #14a99e 0%, #0d887e 100%);
    box-shadow: 0 4px 12px rgba(13, 136, 126, 0.35);
  }

  &:focus-visible {
    outline: 2px solid rgba(20, 169, 158, 0.65);
    outline-offset: 2px;
  }

  span {
    line-height: 1.2;
  }

  @media ${smallOnly} {
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    padding: 5px 4px;
    font-size: 0.62rem;
    gap: 3px;
    border-radius: 8px;
    line-height: 1.15;

    span {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      max-width: 100%;
    }
  }
`;

const HeaderSeparator = styled.div`
  display: none;
`;

const BottomSeparator = styled.div`
  position: relative;
  width: 100%;
  height: 1px;
  background: rgba(218, 230, 245, 0.1);
  margin-top: 1rem;
  margin-bottom: 1rem;

  @media ${smallOnly} {
    display: none;
  }
`;

const IconSvg = styled.img`
  height: 1.1rem;
  width: 1.1rem;
  border-radius: 4px;
  margin: 0;
  flex-shrink: 0;
  opacity: 0.9;

  @media ${smallOnly} {
    height: 0.85rem;
    width: 0.85rem;
  }

  ${({ darkThemeState }) => darkThemeState && css`
    filter: brightness(0) invert(1);
  `}

  ${WebcamTabSelector}.is-selected & {
    filter: brightness(0) invert(1);
    opacity: 1;
  }
`;

const SharingButton = styled(Button)`
  margin: 0 0.5rem;
  height: 2.5rem;

  @media ${smallOnly} {
    flex: 1 1 0;
    margin: 0;
    height: 2.125rem;
    min-height: 36px;
    font-size: 0.82rem;
  }
`;

const CancelButton = styled(Button)`
  margin: 0 0.5rem;
  height: 2.5rem;

  @media ${smallOnly} {
    flex: 1 1 0;
    margin: 0;
    height: 2.125rem;
    min-height: 36px;
    font-size: 0.82rem;
  }
`;

const StopAllButton = styled(Button)`
  margin: 0 0.5rem;
  height: 2.5rem;
`;

export default {
  Warning,
  Main,
  Text,
  Col,
  BgnCol,
  ContentCol,
  InternCol,
  Container,
  Header,
  CameraAsContentTitle,
  WebcamTabs,
  WebcamTabList,
  WebcamTabSelector,
  HeaderSeparator,
  BottomSeparator,
  VideoCol,
  BackgroundCol,
  IconSvg,
  SharingButton,
  CancelButton,
  StopAllButton,
  Label,
  Select,
  Content,
  BrowserWarning,
  Footer,
  FooterContainer,
  Actions,
  ExtraActions,
  VideoPreviewModal,
  FetchingAnimation,
  VideoPreview,
  VideoPreviewFrame,
  Marker,
  MarkerDynamic,
  MarkerWrapper,
  MarkerDynamicWrapper,
};
