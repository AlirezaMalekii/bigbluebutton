import styled from 'styled-components';

const Overlay = styled.div<{ $active: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 25;
  pointer-events: none;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 120ms ease;
`;

const Zone = styled.div<{ $active: boolean }>`
  box-sizing: border-box;
  border: 2px dashed rgba(20, 169, 158, ${({ $active }) => ($active ? 0.9 : 0)});
  border-radius: var(--skyroom-panel-radius, 12px);
  background: rgba(20, 169, 158, ${({ $active }) => ($active ? 0.16 : 0)});
  pointer-events: ${({ $active }) => ($active ? 'auto' : 'none')};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ZoneLabel = styled.span<{ $active: boolean }>`
  color: #eef4fb;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  padding: 0 8px;
  background: rgba(7, 11, 20, 0.72);
  border-radius: 999px;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
`;

export default {
  Overlay,
  Zone,
  ZoneLabel,
};
