import styled from 'styled-components';

const IconWrapper = styled.div`
  width: 1.375rem;
  height: 1.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .skyroom-conn-icon {
    width: 22px;
    height: 22px;
  }
`;

const ButtonWrapper = styled.div`
  ${({ isMobile }) => isMobile && `
    margin: 0 0 0 .2rem;
  `}
  margin: 0 .5rem;
`;

export default {
  IconWrapper,
  ButtonWrapper,
};
