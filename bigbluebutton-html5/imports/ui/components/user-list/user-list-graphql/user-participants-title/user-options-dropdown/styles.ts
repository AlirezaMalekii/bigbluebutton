import styled from 'styled-components';

import Button from '/imports/ui/components/common/button/component';
import { fontSizeBase } from '/imports/ui/stylesheets/styled-components/typography';
import {
  colorPrimary,
  toolbarButtonColorDisabled,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';

const OptionsGroup = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  justify-content: flex-end;
  min-width: 0;
  order: 1;
  overflow: hidden;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 3px;
  min-width: 0;
`;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - as button comes from JS, we can't provide its props
const HeaderActionButton = styled(Button)`
  align-items: center !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035));
  border: 1px solid rgba(15, 112, 215, 0.12);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 1px 4px rgba(6, 23, 42, 0.08);
  display: inline-flex !important;
  flex: 0 0 auto;
  height: 26px !important;
  justify-content: center !important;
  line-height: 1 !important;
  min-height: 26px !important;
  min-width: 26px !important;
  padding: 0 !important;
  width: 26px !important;

  i {
    align-items: center;
    display: inline-flex !important;
    font-size: calc(${fontSizeBase} * 0.82) !important;
    height: 1em;
    justify-content: center;
    line-height: 1 !important;
    margin: 0 !important;
    width: 1em;

    &::before {
      line-height: 1;
    }
  }

  &:hover:not([aria-disabled="true"]),
  &:focus:not([aria-disabled="true"]) {
    background:
      linear-gradient(
        135deg,
        var(--skyroom-brand-500, ${colorPrimary}) 0%,
        var(--skyroom-brand-700, #075952) 100%
      ) !important;
    border-color: rgba(255, 255, 255, 0.44) !important;
    box-shadow:
      0 0 0 2px rgba(15, 112, 215, 0.18),
      0 4px 10px rgba(15, 112, 215, 0.2) !important;
    color: ${colorWhite} !important;
    transform: translateY(-1px);
  }

  &:hover:not([aria-disabled="true"]) i,
  &:focus:not([aria-disabled="true"]) i {
    color: ${colorWhite} !important;
  }

  &:active:not([aria-disabled="true"]) {
    background:
      linear-gradient(
        135deg,
        var(--skyroom-brand-700, #075952) 0%,
        var(--skyroom-brand-500, ${colorPrimary}) 100%
      ) !important;
    color: ${colorWhite} !important;
    transform: translateY(0);
  }

  &[aria-disabled="true"] {
    background-color: rgba(139, 154, 168, 0.08);
    color: ${toolbarButtonColorDisabled};
    opacity: 0.65;
  }
`;

export default {
  OptionsGroup,
  HeaderActions,
  HeaderActionButton,
};
