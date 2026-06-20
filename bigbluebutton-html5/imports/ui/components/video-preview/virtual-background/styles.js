import styled, { css } from 'styled-components';
import {
  borderSize,
  smPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  btnPrimaryBorder,
  btnDefaultColor,
} from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmallest } from '/imports/ui/stylesheets/styled-components/typography';
import { smallOnly, mediumOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import Button from '/imports/ui/components/common/button/component';

const skyroomThumbSelected = css`
  border-color: var(--skyroom-brand-400, #14a99e) !important;
  box-shadow:
    0 0 0 2px rgba(20, 169, 158, 0.35),
    0 6px 16px rgba(13, 136, 126, 0.28) !important;
`;

const skyroomScrollArea = css`
  scrollbar-width: thin;
  scrollbar-color: rgba(20, 169, 158, 0.45) transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #14a99e, #0d887e);
    border-radius: 8px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #0d887e, #0a6f67);
    background-clip: padding-box;
  }
`;

const VirtualBackgroundRowThumbnail = styled.div`
  width: 100%;
  margin: 0;
`;

const BgWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 100%;
  max-height: min(280px, 32vh);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  margin: 0;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(20, 169, 158, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  box-sizing: border-box;
  ${skyroomScrollArea}

  @media ${smallOnly}, ${mediumOnly} {
    max-height: min(240px, 28vh);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media ${smallOnly} {
    max-height: min(160px, 22vh);
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
    padding: 6px;
  }
`;

const tileBase = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  min-height: 68px;

  @media ${smallOnly} {
    min-height: 44px;
  }
  border-radius: 12px;
  border: 1px solid rgba(218, 230, 245, 0.14);
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    border-color: rgba(20, 169, 158, 0.45);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;
    ${skyroomThumbSelected}
  }

  &[aria-pressed="true"] {
    ${skyroomThumbSelected}
  }
`;

const BgNoneButton = styled(Button)`
  ${tileBase}
  color: rgba(238, 244, 251, 0.75);
  font-size: 1.25rem;
  margin: 0;
`;

const ThumbnailButton = styled(Button)`
  outline: none;
  cursor: pointer;
  z-index: 1;
  background-color: transparent;
  margin: 0;
  ${tileBase}

  &:focus {
    color: ${btnDefaultColor};
    background-color: transparent;
    background-clip: padding-box;
    box-shadow: 0 0 0 ${borderSize} ${btnPrimaryBorder};
  }

  ${({ disabled }) => disabled && `
    filter: grayscale(1);
    opacity: 0.55;
    cursor: not-allowed;

    & + img {
      filter: grayscale(1);
    }
  `}

  ${({ background }) => background && `
    background-image: url(${background});
    background-origin: padding-box;
    background-size: cover;
    background-position: center;
    border-color: rgba(218, 230, 245, 0.1);

    &:active {
      background-image: url(${background});
    }
  `}
`;

const Select = styled.select`
  background-color: rgba(10, 18, 32, 0.95);
  border: 1px solid rgba(20, 169, 158, 0.32);
  border-radius: 12px;
  color: #eef4fb;
  width: 100%;
  height: 2.5rem;
  padding: 8px 12px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(13, 136, 126, 0.22);
    border-color: rgba(20, 169, 158, 0.5);
  }
`;

const Label = styled.label`
  display: block;
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(170, 182, 199, 0.95);

  @media ${smallOnly} {
    margin: 0 0 4px;
    font-size: 0.65rem;
  }
`;

const ThumbnailButtonWrapper = styled.div`
  position: relative;
  margin: 0;
  min-width: 0;
`;

const ButtonWrapper = styled.div`
  position: absolute;
  z-index: 2;
  right: 4px;
  top: 4px;

  [dir="rtl"] & {
    right: auto;
    left: 4px;
  }
`;

const ButtonRemove = styled(Button)`
  span {
    font-size: ${fontSizeSmallest};
    padding: ${smPaddingY};
  }
`;

const BgCustomButton = styled(BgNoneButton)`
  font-size: 1.35rem;
  background: rgba(20, 169, 158, 0.08);
  border-style: dashed;
  border-color: rgba(20, 169, 158, 0.35);
  color: var(--skyroom-brand-400, #14a99e);

  &:hover:not(:disabled) {
    background: rgba(20, 169, 158, 0.14);
    border-color: rgba(20, 169, 158, 0.55);
  }
`;

const SkeletonWrapper = styled.div`
  aspect-ratio: 1;
  min-height: 68px;
  border-radius: 12px;
  overflow: hidden;

  & .react-loading-skeleton {
    height: 100%;
    width: 100%;
    border-radius: 12px;
  }
`;

export default {
  VirtualBackgroundRowThumbnail,
  BgWrapper,
  BgNoneButton,
  ThumbnailButton,
  Select,
  Label,
  ThumbnailButtonWrapper,
  ButtonWrapper,
  ButtonRemove,
  BgCustomButton,
  SkeletonWrapper,
};
