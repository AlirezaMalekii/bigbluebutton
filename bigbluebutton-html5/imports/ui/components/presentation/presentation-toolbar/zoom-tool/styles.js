import styled from 'styled-components';
import {
  colorGrayDark,
  colorPrimary,
  toolbarButtonColor,
  toolbarButtonColorDisabled,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  whiteboardToolbarMargin,
  borderSize,
  borderSizeLarge,
  smPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import Button from '/imports/ui/components/common/button/component';

const zoomControlBg = 'rgba(15, 112, 215, 0.08)';
const zoomControlHoverBg = 'rgba(15, 112, 215, 0.14)';
const zoomControlActiveBg = 'rgba(15, 112, 215, 0.2)';
const zoomControlFocusShadow = '0 0 0 2px rgba(15, 112, 215, 0.28)';

const zoomIconButtonStyles = `
  border-radius: 0.5rem;

  & > span {
    background-color: ${zoomControlBg};
    border-radius: 0.5rem;
    color: ${toolbarButtonColor};
    transition: background-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
  }

  &:hover:not([aria-disabled="true"]) > span,
  &:focus:not([aria-disabled="true"]) > span {
    background-color: ${zoomControlHoverBg} !important;
    box-shadow: ${zoomControlFocusShadow} !important;
    color: ${colorPrimary} !important;
  }

  &:active:not([aria-disabled="true"]) > span {
    background-color: ${zoomControlActiveBg} !important;
    color: ${colorPrimary} !important;
    transform: translateY(1px);
  }

  &[aria-disabled="true"] > span {
    background-color: rgba(139, 154, 168, 0.08);
    color: ${toolbarButtonColorDisabled};
  }
`;

const DecreaseZoomButton = styled(Button)`
  ${zoomIconButtonStyles}
`;

const IncreaseZoomButton = styled(Button)`
  ${zoomIconButtonStyles}
`;

const ZoomPercentSelect = styled.select`
  padding: 0 ${smPaddingY};
  margin: ${borderSize};
  margin-left: ${whiteboardToolbarMargin};
  margin-right: ${whiteboardToolbarMargin};
  min-width: 3.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-align: center;
  color: ${colorGrayDark};
  background-color: ${zoomControlBg};
  border: 0;
  border-radius: 0.5rem;
  box-shadow: none;
  cursor: pointer;
  appearance: auto;

  &:-moz-focusring {
    outline: none;
  }

  &:focus,
  &:hover {
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
    background-color: ${zoomControlHoverBg};
    color: ${colorPrimary};
  }

  &:focus {
    outline-style: solid;
    box-shadow: ${zoomControlFocusShadow} !important;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ResetZoomButton = styled(Button)`
  ${zoomIconButtonStyles}

  border: none !important;
  margin-left: ${whiteboardToolbarMargin};
  margin-right: ${whiteboardToolbarMargin};
  min-width: auto;

  & > span {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    padding-inline: 0.35rem;
    min-width: 1.75rem;
    border: solid ${borderSizeLarge} transparent;
  }
`;

export default {
  DecreaseZoomButton,
  IncreaseZoomButton,
  ZoomPercentSelect,
  ResetZoomButton,
};
