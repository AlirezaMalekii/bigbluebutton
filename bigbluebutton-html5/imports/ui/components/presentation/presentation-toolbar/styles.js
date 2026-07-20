import styled from 'styled-components';
import QuickPollDropdownContainer from '/imports/ui/components/actions-bar/quick-poll-dropdown/container';
import {
  colorOffWhite,
  colorBlueLightest,
  colorPrimary,
  toolbarButtonColor,
  colorDanger,
  colorWhite,
  colorGrayDark,
  toolbarButtonColorDisabled,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  whiteboardToolbarMargin,
  whiteboardToolbarPaddingSm,
  whiteboardToolbarPadding,
  borderSize,
  smPaddingY,
  borderSizeLarge,
} from '/imports/ui/stylesheets/styled-components/general';
import Button from '/imports/ui/components/common/button/component';

const toolbarControlBg = 'rgba(15, 112, 215, 0.08)';
const toolbarControlHoverBg = 'rgba(15, 112, 215, 0.14)';
const toolbarControlActiveBg = 'rgba(15, 112, 215, 0.2)';
const toolbarControlFocusShadow = '0 0 0 2px rgba(15, 112, 215, 0.28)';

const toolbarIconButtonStyles = `
  border-radius: 0.5rem;
  transition: color 120ms ease, transform 120ms ease;

  & > span {
    background-color: ${toolbarControlBg};
    border-radius: 0.5rem;
    color: ${toolbarButtonColor};
    transition: background-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
  }

  &:hover:not([aria-disabled="true"]) > span,
  &:focus:not([aria-disabled="true"]) > span {
    background-color: ${toolbarControlHoverBg} !important;
    box-shadow: ${toolbarControlFocusShadow} !important;
    color: ${colorPrimary} !important;
  }

  &:active:not([aria-disabled="true"]) > span {
    background-color: ${toolbarControlActiveBg} !important;
    color: ${colorPrimary} !important;
    transform: translateY(1px);
  }

  &[aria-disabled="true"] > span {
    background-color: rgba(139, 154, 168, 0.08);
    color: ${toolbarButtonColorDisabled};
  }
`;

const PresentationToolbarWrapper = styled.div`
  position: absolute;
  align-self: center;
  z-index: 1;
  background-color: ${colorOffWhite};
  border-top: 1px solid ${colorBlueLightest};
  min-width: fit-content;
  width: 100%;
  bottom: 0px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 2px;

  select {
    &:-moz-focusring {
      outline: none;
    }
    border: 0;
    background-color: ${colorOffWhite};
    color: ${toolbarButtonColor};
    cursor: pointer;
    margin: 0 ${whiteboardToolbarMargin} 0 0;
    padding: ${whiteboardToolbarPadding};
    padding-left: ${whiteboardToolbarPaddingSm};

    [dir="rtl"] & {
      margin: 0 0 0 ${whiteboardToolbarMargin};
      padding: ${whiteboardToolbarPadding};
      padding-right: ${whiteboardToolbarPaddingSm};
    }

    & > option {
      color: ${toolbarButtonColor};
      background-color: ${colorOffWhite};
    }
  }

  i {
    color: ${toolbarButtonColor};
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const QuickPollButton = styled(QuickPollDropdownContainer)`
  position: relative;
  color: ${toolbarButtonColor};
  background-color: ${colorOffWhite};
  border-radius: 0;
  box-shadow: none !important;
  border: 0;

  &:focus {
    background-color: ${colorOffWhite};
  }
`;

const QuickPollButtonWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const PresentationSlideControls = styled.div`
  justify-content: center;
  padding-left: ${whiteboardToolbarPadding};
  padding-right: ${whiteboardToolbarPadding};
  display: flex;
  flex-direction: row;
  align-items: center;

  & > button {
    padding: ${whiteboardToolbarPadding};
  }
`;

const PrevSlideButton = styled(Button)`
  ${toolbarIconButtonStyles}

  i {
    font-size: 1rem;
    padding-left: 20%;

    [dir="rtl"] & {
      -webkit-transform: scale(-1, 1);
      -moz-transform: scale(-1, 1);
      -ms-transform: scale(-1, 1);
      -o-transform: scale(-1, 1);
      transform: scale(-1, 1);
    }
  }
`;

const NextSlideButton = styled(Button)`
  ${toolbarIconButtonStyles}

  i {
    font-size: 1rem;
    padding-left: 60%;
    
    [dir="rtl"] & {
      -webkit-transform: scale(-1, 1);
      -moz-transform: scale(-1, 1);
      -ms-transform: scale(-1, 1);
      -o-transform: scale(-1, 1);
      transform: scale(-1, 1);
    }
  }
`;

const SkipSlideSelect = styled.select`
  padding: 0 ${smPaddingY};
  margin: ${borderSize};
  margin-left: ${whiteboardToolbarMargin};

  [dir="rtl"] & {
    margin: ${borderSize};
    margin-right: ${whiteboardToolbarMargin};
  }

  &:-moz-focusring {
    outline: none;
  }

  &:focus,
  &:hover {
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
    background-color: ${toolbarControlHoverBg};
    color: ${colorPrimary};
    border-radius: 4px;
  }

  &:focus {
    outline-style: solid;
    box-shadow: ${toolbarControlFocusShadow} !important;
  }
`;

const PresentationZoomControls = styled.div`
  justify-content: flex-end;
  padding: 0 ${whiteboardToolbarPadding} 0 0;

  [dir="rtl"] & {
    padding: 0 0 0 ${whiteboardToolbarPadding};
  }

  display: flex;
  flex-direction: row;
  align-items: center;

  button {
    padding: ${whiteboardToolbarPadding};
  }

  i {
    font-size: 1.2rem;
  }
`;

const FitToWidthButton = styled(Button)`
  ${toolbarIconButtonStyles}

  border: none !important;

  & > i {
    font-size: 1.2rem;

    [dir="rtl"] & {
      -webkit-transform: scale(-1, 1);
      -moz-transform: scale(-1, 1);
      -ms-transform: scale(-1, 1);
      -o-transform: scale(-1, 1);
      transform: scale(-1, 1);
    }
  }

  margin-left: ${whiteboardToolbarMargin};
  margin-right: ${whiteboardToolbarMargin};

  position: relative;
  color: ${toolbarButtonColor};
  border-radius: 0;
  box-shadow: none !important;
  border: 0;

  /* Selected (fit-to-width on): teal glass — never stock light/white focus fill */
  ${({ $fitToWidth }) => $fitToWidth && `
    & > span {
      background-color: rgba(13, 136, 126, 0.32) !important;
      border: solid ${borderSizeLarge} #20c7bb !important;
      color: #e8fffc !important;
      box-shadow:
        0 0 0 2px rgba(32, 199, 187, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    }

    &:hover:not([aria-disabled="true"]) > span,
    &:focus:not([aria-disabled="true"]) > span,
    &:focus:hover:not([aria-disabled="true"]) > span,
    &:active:not([aria-disabled="true"]) > span,
    &:focus:active:not([aria-disabled="true"]) > span {
      background-color: rgba(13, 136, 126, 0.42) !important;
      border-color: #20c7bb !important;
      color: #ffffff !important;
      box-shadow:
        0 0 0 2px rgba(32, 199, 187, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
    }
  `}

  &:focus {
    background-color: transparent;
    border: 0;
  }
`;

/* Wraps WB access + multi-user count so the badge never opens a flex gap. */
const WBAccessCluster = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
`;

const MultiUserTool = styled.span`
  background-color: ${colorDanger};
  border-radius: 50%;
  width: 0.85rem;
  height: 0.85rem;
  position: absolute;
  top: -0.15rem;
  inset-inline-start: -0.2rem;
  z-index: 3;
  color: ${colorWhite};
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 1px 1px ${borderSizeLarge} ${colorGrayDark};
  font-size: 0.55rem;
  line-height: 1;
  user-select: none;
  cursor: pointer;
  pointer-events: auto;
`;

const MUTPlaceholder = styled.div`
  display: none;
`;

const WBAccessButton = styled(Button)`
  ${toolbarIconButtonStyles}

  border: none !important;

  i {
    font-size: 1.2rem;

    [dir="rtl"] & {
      -webkit-transform: scale(-1, 1);
      -moz-transform: scale(-1, 1);
      -ms-transform: scale(-1, 1);
      -o-transform: scale(-1, 1);
      transform: scale(-1, 1);
    }
  }

  position: relative;
  color: ${toolbarButtonColor};
  border-radius: 0;
  box-shadow: none !important;
  border: 0;

  &:focus {
    background-color: ${colorOffWhite};
    border: 0;
  }

  &:disabled {
    color: ${toolbarButtonColorDisabled};
  }
`;

const InfiniteWhiteboardButton = styled(Button)`
  ${toolbarIconButtonStyles}

  border: none !important;

  svg {
    [dir="rtl"] & {
      -webkit-transform: scale(-1, 1);
      -moz-transform: scale(-1, 1);
      -ms-transform: scale(-1, 1);
      -o-transform: scale(-1, 1);
      transform: scale(-1, 1);
    }
  }

  position: relative;
  color: ${toolbarButtonColor};
  border-radius: 0;
  box-shadow: none !important;
  border: 0;
  margin-left: 2px;
  margin-right: 2px;

  &:focus {
    background-color: ${colorOffWhite};
    border: 0;
  }
`;

export default {
  PresentationToolbarWrapper,
  QuickPollButton,
  QuickPollButtonWrapper,
  PresentationSlideControls,
  PrevSlideButton,
  NextSlideButton,
  SkipSlideSelect,
  PresentationZoomControls,
  FitToWidthButton,
  WBAccessCluster,
  MultiUserTool,
  WBAccessButton,
  MUTPlaceholder,
  InfiniteWhiteboardButton,
};
