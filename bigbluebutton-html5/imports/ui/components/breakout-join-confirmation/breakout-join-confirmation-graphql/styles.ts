import styled from 'styled-components';
import { colorWhite, colorGrayLighter } from '/imports/ui/stylesheets/styled-components/palette';

const SelectParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Select = styled.select`
  background-color: ${colorWhite};
  width: 50%;
  margin: 1rem;
  border-color: ${colorGrayLighter};
`;

const ConfirmationBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  line-height: 1.5;
`;

const RoomNameHighlight = styled.strong`
  display: inline-block;
  padding: 0.45rem 1rem;
  border-radius: 10px;
  font-size: 1.05rem;
  color: var(--skyroom-panel-accent, #20c7bb);
  background: rgba(32, 199, 187, 0.12);
  border: 1px solid rgba(32, 199, 187, 0.25);
`;

export default {
  SelectParent,
  Select,
  ConfirmationBody,
  RoomNameHighlight,
};
