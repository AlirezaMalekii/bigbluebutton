import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import {
  colorBlack,
} from '/imports/ui/stylesheets/styled-components/palette';

const DownloadButton = styled(Button)`
  &,
  &:active,
  &:hover,
  &:focus {
    border: none !important;
    box-shadow: none !important;

    i {
      border: none !important;
    }
  }

  padding: 0 !important;
  min-height: 0 !important;

  &:hover {
    border: 0;
  }

  i {
    font-size: 1rem;
  }

  ${({ $skyroom }) => $skyroom && `
    & > span:last-child,
    & [class*="ButtonLabel"] {
      color: #fff !important;
      font-size: 0.75rem !important;
      font-weight: 600 !important;
      white-space: nowrap;
    }

    & > span:first-child i,
    & i {
      color: #fff !important;
    }
  `}
`;

const ButtonWrapper = styled.div`
  position: absolute;
  right: auto;
  left: 8px;
  cursor: pointer;
  border: 0;
  z-index: 999;
  margin: 0;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 10px;
  overflow: visible;

  [dir="rtl"] & {
    right: 8px;
    left: auto;
  }

  [class*="presentationZoomControls"] & {
    position: relative !important;
  }

  ${({ theme }) => theme === 'dark' && `
    padding: 4px 10px 4px 8px;
    background: rgba(10, 18, 32, 0.88) !important;
    border: 1px solid rgba(32, 199, 187, 0.45) !important;
    box-shadow:
      0 4px 14px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset !important;
    backdrop-filter: blur(8px);

    & > button,
    & > button:hover,
    & > button:focus {
      background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72)) !important;
      border-radius: 8px !important;
      padding: 6px 10px !important;
      gap: 6px;
    }

    & > button i {
      color: #fff !important;
    }
  `}

  ${({ theme }) => theme === 'light' && `
    background-color: rgba(255, 255, 255, 0.92) !important;
    border: 1px solid rgba(0, 0, 0, 0.12) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    padding: 4px 8px;

    & > button i {
      color: ${colorBlack} !important;
    }
  `}
`;

export default {
  DownloadButton,
  ButtonWrapper,
};
