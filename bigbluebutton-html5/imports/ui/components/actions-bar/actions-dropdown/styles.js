import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';

const HideDropdownButton = styled(Button)``;

const PollModalBody = styled.div`
  width: 100%;
  max-width: min(78rem, 96vw);
  min-width: 0;
  height: min(68vh, 46rem);
  max-height: calc(100vh - 11rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.35rem 0.5rem 0.5rem;

  @media ${smallOnly} {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
    max-height: none;
    padding: 0.35rem 0.5rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }
`;

const TimerModalBody = styled.div`
  width: 100%;
  max-width: min(56rem, 96vw);
  min-width: 0;
  max-height: calc(100vh - 12rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
`;

export default {
  HideDropdownButton,
  PollModalBody,
  TimerModalBody,
};
