import styled from 'styled-components';
import { phoneLandscape, smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import { borderRadius, borderSize } from '/imports/ui/stylesheets/styled-components/general';
import {
  colorGrayLightest,
  colorSuccess,
  colorDanger,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  fontSizeBase,
  fontSizeSmall,
  fontSizeXS,
} from '/imports/ui/stylesheets/styled-components/typography';

interface TimerButtonProps {
  running: boolean;
  disabled: boolean;
  hide: boolean;
}

interface TimerPillProps {
  running: boolean;
}

const timerMarginSM = '.5rem';
const timerPaddingSM = '.25rem';

const TimerWrapper = styled.div`
  overflow: visible;
  margin-left: auto;
  margin-bottom: 0.15rem;
`;

const Timer = styled.div`
  margin-top: 0.25rem;
  display: flex;
  max-height: none;
`;

const disabledStyle = `
  cursor: default;
  opacity: 0.85;
`;

const hiddenStyle = `
  @media ${smallOnly} {
    visibility: hidden;
  }
`;

const TimerButton = styled.div<TimerButtonProps>`
  cursor: pointer;
  color: ${colorWhite};
  font-weight: 500;
  border-radius: 1rem;
  font-size: ${fontSizeBase};
  margin-left: ${borderRadius};
  margin-right: ${borderRadius};
  border: 1px solid ${({ running }) => (running ? 'rgba(29, 191, 115, 0.55)' : 'rgba(223, 68, 42, 0.5)')};
  background: ${({ running }) => (running
    ? 'linear-gradient(135deg, rgba(29, 191, 115, 0.88) 0%, rgba(6, 100, 247, 0.78) 100%)'
    : 'linear-gradient(135deg, rgba(223, 68, 42, 0.88) 0%, rgba(137, 48, 194, 0.72) 100%)')};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
  min-width: 13.2rem;
  min-height: 2.22rem;
  padding: 0.24rem 0.52rem;

  @media ${phoneLandscape} {
    min-height: 1.88rem;
    min-width: 10rem;
    padding: 0.12rem 0.35rem;
    border-radius: 0.7rem;
  }

  i {
    font-size: ${fontSizeSmall};
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);

    @media ${phoneLandscape} {
      height: ${timerMarginSM};
      width: ${timerMarginSM};
      font-size: ${fontSizeXS};
    }
  }

  ${({ disabled }) => disabled && disabledStyle};
  ${({ hide }) => hide && hiddenStyle};
`;

const time = `
  box-sizing: border-box;
  display: flex;
  align-self: center;
  padding: 0 ${timerPaddingSM} 0 0;
`;

const TimerContent = styled.div`
  ${time}
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.35rem;

  [dir="ltr"] & {
    span:first-child {
      padding: 0 ${timerPaddingSM};
    }
  }

  [dir="rtl"] & {
    span:last-child {
      padding: 0 ${timerPaddingSM};
    }
  }
`;

const TimerIcon = styled.span`
  ${time}
`;

const TimerTime = styled.span`
  ${time}
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  font-weight: 700;
  font-size: 0.88rem;
  line-height: 1.1;
  padding-inline-start: 0;
  padding-inline-end: 0.1rem;
`;

const TimerMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: 0.4rem;
`;

const TimerStatus = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
`;

const TimerPill = styled.span<TimerPillProps>`
  border-radius: 999px;
  border: ${borderSize} solid rgba(255, 255, 255, 0.45);
  background: ${({ running }) => (running ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.2)')};
  padding: 0.1rem 0.44rem;
  font-size: 0.69rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const SecondaryText = styled.span`
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.74rem;
  line-height: 1;
  white-space: nowrap;
`;

const Dot = styled.span<{ running: boolean }>`
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: ${({ running }) => (running ? colorSuccess : colorDanger)};
  border: 1px solid ${colorGrayLightest};
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
`;

const TimeWithStatus = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.08rem;
`;

const PrimaryLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
`;

const SecondaryLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
`;

export default {
  TimerWrapper,
  Timer,
  TimerButton,
  TimerContent,
  TimerIcon,
  TimerTime,
  TimerMeta,
  TimerStatus,
  TimerPill,
  SecondaryText,
  Dot,
  TimeWithStatus,
  PrimaryLine,
  SecondaryLine,
};
