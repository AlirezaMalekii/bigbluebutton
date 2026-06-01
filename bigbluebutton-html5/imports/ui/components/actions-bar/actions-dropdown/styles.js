import styled from 'styled-components';
import { smallOnly } from '/imports/ui/stylesheets/styled-components/breakpoints';
import Button from '/imports/ui/components/common/button/component';

const HideDropdownButton = styled(Button)`
  ${({ open }) => open && `
      @media ${smallOnly} {
        display:none;
      }
   `}
`;

const PollModalBody = styled.div`
  width: 100%;
  max-width: min(78rem, 96vw);
  min-width: 0;
  height: min(68vh, 46rem);
  max-height: calc(100vh - 11rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.35rem 0.5rem 0.5rem;
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
