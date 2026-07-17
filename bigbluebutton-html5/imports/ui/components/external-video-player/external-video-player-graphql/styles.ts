import styled from 'styled-components';
import ReactPlayer from 'react-player';
import React from 'react';
import Button from '/imports/ui/components/common/button/component';

type VideoPlayerWrapperProps = {
  fullscreen: boolean;
  ref : React.MutableRefObject<HTMLDivElement | null>;
};

type ContainerProps = {
  isResizing: boolean;
  isMinimized: boolean;
};

export const Container = styled.span<ContainerProps>`
  position: absolute;
  pointer-events: inherit;
  background: var(--color-black);
  overflow: hidden;

  ${({ isResizing }) => isResizing && `
    pointer-events: none;
  `}
  ${({ isMinimized }) => isMinimized && `
    display: none;
  `}
`;

export const VideoPlayerWrapper = styled.div<VideoPlayerWrapperProps>`
  position: relative;
  width: 100%;
  height: 100%;

  ${({ fullscreen }) => fullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99;
  `}
`;

export const AutoPlayWarning = styled.p`
  position: absolute;
  z-index: 100;
  font-size: x-large;
  color: white;
  width: 100%;
  background-color: rgba(6,23,42,0.5);
  bottom: 20%;
  vertical-align: middle;
  text-align: center;
  pointer-events: none;
`;

export const VideoPlayer = styled(ReactPlayer)`
  width: 100%;
  height: 100%;
  z-index: 0;
  & > iframe {
    display: flex;
    flex-flow: column;
    flex-grow: 1;
    flex-shrink: 1;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    border-style: none;
    border-bottom: none;
  }
`;

// @ts-ignore - as button comes from JS, we can't provide its props
export const ExternalVideoCloseButton = styled(Button)`
  z-index: 7;
  position: absolute;
  top: 0;
  right: 0;
  left: auto;
  cursor: pointer;
  [dir="rtl"] & {
    right: auto;
    left :0;
  }
`;

export const AparatViewerBlocker = styled.div`
  position: absolute;
  inset: 0;
  z-index: 4;
  cursor: default;
  background: transparent;
`;

export const AparatPresenterControls = styled.div`
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(8, 14, 24, 0.88);
  border: 1px solid rgba(34, 212, 199, 0.35);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
`;

export const AparatPlayPauseButton = styled.button`
  min-width: 120px;
  height: 40px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0 18px;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));

  &:hover {
    filter: brightness(1.06);
  }

  &:focus-visible {
    outline: 2px solid rgba(34, 212, 199, 0.85);
    outline-offset: 2px;
  }
`;

export default {
  VideoPlayerWrapper,
  AutoPlayWarning,
  VideoPlayer,
  Container,
  ExternalVideoCloseButton,
  AparatViewerBlocker,
  AparatPresenterControls,
  AparatPlayPauseButton,
};
