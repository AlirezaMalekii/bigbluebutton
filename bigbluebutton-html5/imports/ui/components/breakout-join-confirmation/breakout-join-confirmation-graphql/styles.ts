import styled from 'styled-components';

const SelectParent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 0.5rem;
`;

const Select = styled.select`
  background-color: rgba(5, 10, 18, 0.72);
  width: 100%;
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(32, 199, 187, 0.22);
  color: #eef4fb;
  font-size: 0.9rem;
`;

const JoinModalBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  text-align: center;
`;

const ConfirmationBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  line-height: 1.5;
`;

const RoomNameHighlight = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--skyroom-panel-accent, #20c7bb);
  background: rgba(32, 199, 187, 0.12);
  border: 1px solid rgba(32, 199, 187, 0.28);
`;

const JoinModalActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: 100%;
  margin-top: 0.15rem;
`;

const ActionButtonWrap = styled.div`
  width: 100%;

  & > span,
  & .buttonWrapper {
    width: 100%;
  }

  button {
    width: 100%;
    justify-content: center;
    min-height: 42px;
    border-radius: 12px;
  }
`;

export default {
  SelectParent,
  Select,
  ConfirmationBody,
  RoomNameHighlight,
  JoinModalBody,
  JoinModalActions,
  ActionButtonWrap,
};
