import styled, { css, keyframes } from 'styled-components';
import Icon from '/imports/ui/components/common/icon/component';
import {
  colorDanger,
  colorGray,
  colorSuccess,
  colorGrayLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  statusIconSize,
  borderSize,
  statusInfoHeight,
} from '/imports/ui/stylesheets/styled-components/general';
import ToastStyles from '/imports/ui/components/common/toast/styles';

const ToolbarDock = styled.div`
  cursor: default;
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 1001;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;

  [dir="rtl"] & {
    left: auto;
    right: 14px;
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 12px;
  cursor: pointer;
  color: #e8edf4;
  background: linear-gradient(165deg, rgba(28, 40, 62, 0.95) 0%, rgba(16, 24, 40, 0.92) 100%);
  border: 1px solid rgba(20, 169, 158, 0.32);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;

  &:hover {
    border-color: rgba(32, 199, 187, 0.55);
    background: linear-gradient(165deg, rgba(32, 199, 187, 0.22) 0%, rgba(16, 24, 40, 0.95) 100%);
    transform: translateY(-1px);
  }

  &.danger:hover {
    border-color: rgba(255, 106, 102, 0.55);
    background: linear-gradient(165deg, rgba(223, 39, 33, 0.28) 0%, rgba(16, 24, 40, 0.95) 100%);
  }

  i, [class^="icon-bbb-"] {
    font-size: 1.05rem;
    color: inherit;
  }
`;

const ToastText = styled(ToastStyles.ToastMessage)``;

const StatusIcon = styled.span`
  margin-left: auto;

  [dir="rtl"] & {
    margin-right: auto;
    margin-left: 0;
  }

  & > i {
    position: relative;
    top: 1px;
    height: ${statusIconSize};
    width: ${statusIconSize};
  }
`;

const rotate = keyframes`
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
`;

const ToastIcon = styled(Icon)`
  position: relative;
  width: ${statusIconSize};
  height: ${statusIconSize};
  font-size: 117%;
  bottom: ${borderSize};
  left: ${statusInfoHeight};

  [dir="rtl"] & {
    left: auto;
    right: ${statusInfoHeight};
  }

  ${({ done }) => done && `
    color: ${colorSuccess};
  `}

  ${({ error }) => error && `
    color: ${colorDanger};
  `}

  ${({ loading }) => loading && css`
    color: ${colorGrayLightest};
    border: 1px solid;
    border-radius: 50%;
    border-right-color: ${colorGray};
    animation: ${rotate} 1s linear infinite;
  `}
`;

const Line = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: nowrap;
  padding: 0;
`;

const ButtonIcon = styled(Icon)`
  width: 1em;
  text-align: center;
`;

export default {
  ToolbarDock,
  ActionButton,
  ToastText,
  StatusIcon,
  ToastIcon,
  Line,
  ButtonIcon,
};
