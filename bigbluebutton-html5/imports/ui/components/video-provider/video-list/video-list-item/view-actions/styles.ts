import styled from 'styled-components';

const FullscreenWrapper = styled.div`
  position: absolute;
  top: 4px;
  left: 4px;
  right: auto;
  z-index: 3;
  pointer-events: auto;

  [dir='rtl'] & {
    left: 4px;
    right: auto;
  }

  & button,
  & [class*='FullscreenButton'] {
    min-width: 36px;
    min-height: 36px;
  }
`;

export default {
  FullscreenWrapper,
};
