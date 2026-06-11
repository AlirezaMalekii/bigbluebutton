import styled from 'styled-components';

const Parent = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Modal = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 95vw;
`;

const Content = styled.div`
  text-align: center;
`;

const IconRing = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  margin: 0;
`;

const Text = styled.div`
  font-weight: normal;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
`;

const DashboardBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const MeetingEndedButton = styled.button`
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const TextArea = styled.textarea`
  resize: none;
  margin: 1rem auto;
  width: 100%;

  &::placeholder {
    text-align: center;
  }
`;

export default {
  Parent,
  Modal,
  Content,
  IconRing,
  Title,
  Text,
  MeetingEndedButton,
  TextArea,
  Wrapper,
  DashboardBlock,
};
