import styled from 'styled-components';
import {
  borderSize,
  borderRadius,
  smPaddingY,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorText,
  colorGrayLighter,
  colorGray,
  colorBlueLight,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmall } from '/imports/ui/stylesheets/styled-components/typography';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import Button from '/imports/ui/components/common/button/component';

type urlProps = {
  animations: boolean;
}

const UrlError = styled.div<urlProps>`
  color: red;
  padding: 1em 0 2.5em 0;

  ${({ animations }) => animations && `
    transition: 1s;
  `}
`;

const ExternalVideoModal = styled(ModalSimple)`
  padding: 1rem;
  min-height: 23rem;

  @media ${smallOnly} {
    min-height: 0;
    height: auto;
    display: flex;
    flex-direction: column;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 12px;
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
`;

const VideoUrl = styled.div<urlProps>`
  margin: 0 ${borderSize} 0 ${borderSize};

  & > label {
    display: block;
  }

  & > label input {
    display: block;
    margin: 10px 0 10px 0;
    padding: 0.4em;
    color: ${colorText};
    line-height: 2rem;
    width: 100%;
    font-family: inherit;
    font-weight: inherit;
    border: 1px solid ${colorGrayLighter};
    border-radius: ${borderRadius};

    ${({ animations }) => animations && `
      transition: box-shadow .2s;
    `}

    &:focus {
      outline: none;
      border-radius: ${borderSize};
      box-shadow: 0 0 0 ${borderSize} ${colorBlueLight}, inset 0 0 0 1px ${colorPrimary};
    }
  }

  & > span {
    font-weight: 600;
  }
`;

const ExternalVideoNote = styled.div`
  color: ${colorGray};
  font-size: ${fontSizeSmall};
  font-style: italic;
  padding-top: ${smPaddingY};
  line-height: 1.45;
`;

// @ts-ignore - Button is JSX element
const StartButton = styled(Button)`
  display: flex;
  align-self: stretch;
  width: 100%;
  margin: 4px 0 0;

  &:focus {
    outline: none !important;
  }

  & > i {
    color: #3c5764;
  }

  @media ${smallOnly} {
    min-height: 44px;
    margin-top: 8px;
  }
`;

export default {
  UrlError,
  ExternalVideoModal,
  Content,
  VideoUrl,
  ExternalVideoNote,
  StartButton,
};
