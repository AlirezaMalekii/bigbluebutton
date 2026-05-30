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

const ResetZoomButton = styled(Button)`
  text-align: center;
  color: ${colorGrayDark};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0 !important;
  font-weight: 700;
  min-width: 3.25rem;
  margin-left: ${whiteboardToolbarMargin};
  margin-right: ${whiteboardToolbarMargin};
  position: relative;
  letter-spacing: -0.01em;
  background-color: ${zoomControlBg};
  border-radius: 0.5rem;
  box-shadow: none !important;
  border: 0;
  transition: background-color 120ms ease, box-shadow 120ms ease, color 120ms ease;

  &:focus,
  &:hover {
    outline: transparent;
    outline-style: dotted;
    outline-width: ${borderSize};
    background-color: ${zoomControlHoverBg} !important;
    color: ${colorPrimary} !important;
    border-radius: 0.5rem;
  }

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline-style: solid;
    box-shadow: ${zoomControlFocusShadow} !important;
  }

  &:active:not([aria-disabled="true"]) {
    background-color: ${zoomControlActiveBg} !important;
    color: ${colorPrimary} !important;
  }
`;

export default {
  DecreaseZoomButton,
  IncreaseZoomButton,
  ResetZoomButton,
};
