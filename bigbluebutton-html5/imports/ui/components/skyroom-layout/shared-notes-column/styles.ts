import styled from 'styled-components';

const Column = styled.div`
  position: fixed;
  top: var(--skyroom-notes-top, 0);
  left: var(--skyroom-notes-left, auto);
  right: var(--skyroom-notes-right, auto);
  width: var(--skyroom-notes-width, var(--skyroom-column-width, 300px));
  height: var(--skyroom-notes-height, 0);
  min-width: var(--skyroom-notes-width, var(--skyroom-column-width, 300px));
  z-index: 5;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  pointer-events: auto;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(8, 18, 32, 0.96),
    rgba(5, 14, 26, 0.98)
  );
  background-color: #0d1828;
  color: #eef4fb;
  border: 1px solid rgba(32, 199, 187, 0.12);
  border-radius: 18px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.32),
    0 1px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
`;

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const LoadingWrap = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
`;

export default { Column, Body, LoadingWrap };
