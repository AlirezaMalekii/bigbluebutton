import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import { fontSizeBase } from '/imports/ui/stylesheets/styled-components/typography';
import { colorWhite } from '/imports/ui/stylesheets/styled-components/palette';

/** Shared header row for Users + Public chat panels */
export const PanelHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  min-height: var(--skyroom-header-height, 56px);
  margin: 0;
  padding: 0 var(--space-3, 12px);
  gap: var(--space-3, 12px);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );

  &::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }
`;

export const PanelTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: -0.2px;
  padding: 0;
  color: var(--skyroom-panel-text, #eef4fb);
  flex: 0 0 auto;
  margin: 0;
  min-width: 0;
  order: 0;
  line-height: 1.2;
  font-family: inherit;

  & > span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
    white-space: nowrap;
  }
`;

export const PanelTitleText = styled.span`
  flex-shrink: 0;
  display: inline-block;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const PanelTitleButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  text-align: inherit;
  font: inherit;
  border-radius: 6px;

  &:focus-visible {
    outline: 1px solid rgba(32, 199, 187, 0.45);
    outline-offset: 2px;
  }
`;

export const PanelOptionsGroup = styled.div`
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  justify-content: flex-end;
  min-width: 0;
  margin-inline-start: auto;
  order: 1;
`;

// @ts-ignore — Button is JS
export const PanelOptionsButton = styled(Button)`
  align-items: center !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018)) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 10px !important;
  box-shadow: none !important;
  color: var(--skyroom-panel-text-muted, #aab6c7) !important;
  display: inline-flex !important;
  flex: 0 0 auto;
  height: 32px !important;
  justify-content: center !important;
  line-height: 1 !important;
  margin: 0;
  min-height: 32px !important;
  min-width: 32px !important;
  padding: 0 !important;
  width: 32px !important;
  transition:
    background-color 130ms ease,
    border-color 130ms ease,
    color 130ms ease,
    box-shadow 130ms ease,
    transform 120ms ease;

  span {
    padding: 0;
  }

  i {
    align-items: center;
    display: inline-flex !important;
    font-size: calc(${fontSizeBase} * 0.88) !important;
    height: 1em;
    justify-content: center;
    line-height: 1 !important;
    margin: 0 !important;
    width: 1em;

    &::before {
      line-height: 1;
    }
  }

  &:hover:not([aria-disabled='true']),
  &:focus:not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(80, 220, 220, 0.18), rgba(80, 220, 220, 0.08)) !important;
    border-color: rgba(80, 220, 220, 0.26) !important;
    box-shadow: 0 0 0 2px rgba(80, 220, 220, 0.08) !important;
    color: ${colorWhite} !important;
    transform: translateY(-0.5px);
  }

  &:hover:not([aria-disabled='true']) i,
  &:focus:not([aria-disabled='true']) i {
    color: ${colorWhite} !important;
  }

  &:active:not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(80, 220, 220, 0.16), rgba(80, 220, 220, 0.07)) !important;
    box-shadow: none !important;
    transform: translateY(0);
  }
`;

/** Shared search field — Users + Chat panels */
export const PanelSearchWrap = styled.div`
  flex-shrink: 0;
  padding: var(--space-2, 8px) var(--space-3, 12px);
`;

export const PanelSearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;

  &:hover {
    border-color: rgba(80, 220, 220, 0.22);
  }

  &:focus-within {
    border-color: rgba(80, 220, 220, 0.32);
    background: rgba(0, 0, 0, 0.26);
    box-shadow: 0 0 0 2px rgba(80, 220, 220, 0.06);
    outline: none;
  }
`;

export const PanelSearchIcon = styled.span`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--skyroom-panel-text-dim, #7b8798);
  opacity: 0.95;
  transition: color 140ms ease;

  ${PanelSearchField}:focus-within & {
    color: var(--skyroom-panel-accent, #20c7bb);
  }

  &::before {
    content: '';
    position: absolute;
    width: 9px;
    height: 9px;
    top: 1px;
    left: 1px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    box-sizing: border-box;
  }

  &::after {
    content: '';
    position: absolute;
    width: 5px;
    height: 1.5px;
    bottom: 2px;
    right: 1px;
    background: currentColor;
    border-radius: 1px;
    transform: rotate(45deg);
    transform-origin: right bottom;
  }
`;

export const PanelSearchInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--skyroom-panel-text, #eef4fb);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  padding: 9px 0;

  &::placeholder {
    color: rgba(198, 208, 220, 0.62);
    opacity: 1;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }
`;

export const PanelSearchClear = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--skyroom-panel-text-muted, #aab6c7);
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;

  &:hover {
    color: var(--skyroom-panel-accent, #20c7bb);
  }
`;

export default {
  PanelHeaderContainer,
  PanelTitle,
  PanelTitleText,
  PanelTitleButton,
  PanelOptionsGroup,
  PanelOptionsButton,
  PanelSearchWrap,
  PanelSearchField,
  PanelSearchIcon,
  PanelSearchInput,
  PanelSearchClear,
};
