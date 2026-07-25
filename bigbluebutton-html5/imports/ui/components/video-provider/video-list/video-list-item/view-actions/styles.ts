import styled from 'styled-components';

const FullscreenWrapper = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  right: auto;
  z-index: 3;
  pointer-events: auto;

  [dir='rtl'] & {
    left: 2px;
    right: auto;
  }

  & button,
  & [class*='FullscreenButton'] {
    min-width: 24px;
    min-height: 24px;
  }
`;

export default {
  FullscreenWrapper,
};
