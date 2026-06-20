import styled from 'styled-components';

/** Popup anchored above the composer row (mirrors the emoji-picker wrapper). */
export const Panel = styled.div`
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 1000;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(80, 220, 220, 0.18);
  background:
    linear-gradient(165deg, rgba(22, 34, 54, 0.99) 0%, rgba(12, 18, 30, 1) 100%);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
`;

export const StickerCell = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: background-color 120ms ease, transform 120ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(80, 220, 220, 0.12);
    outline: none;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

/** Composer trigger — renders an emoji glyph (no BBB "sticker" icon exists). */
export const StickerButton = styled.button`
  flex: 0 0 auto;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  box-shadow: none;
  line-height: 1;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 120ms ease, opacity 120ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(80, 220, 220, 0.08);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export default {
  Panel,
  StickerCell,
  StickerButton,
};
