import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';

const panelBg = 'var(--skyroom-panel-solid, #0d1828)';
const panelBorder = 'var(--skyroom-panel-border, rgba(32, 199, 187, 0.18))';
const text = 'var(--skyroom-modal-text, #eef4fb)';
const textMuted = 'var(--skyroom-modal-text-muted, #aab6c7)';
const accent = 'var(--skyroom-panel-accent, #20c7bb)';
const accentSoft = 'rgba(32, 199, 187, 0.14)';

const SelectUserScreen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-height: 100dvh;
  background: ${panelBg};
  color: ${text};
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0);
`;

const Header = styled.header`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 0.9rem 0.75rem;
  padding-top: calc(0.85rem + env(safe-area-inset-top, 0px));
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.07) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h2`
  margin: 0;
  padding: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  color: ${text};
  text-align: start;
`;

const SubTitle = styled.p`
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  color: ${textMuted};
  text-align: start;
`;

const HeaderActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

// @ts-ignore - button is a JS component
const ButtonBack = styled(Button)`
  flex: 1 1 0 !important;
  min-width: 0 !important;
  min-height: 2.5rem !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  color: ${text} !important;
  border: 1px solid rgba(32, 199, 187, 0.28) !important;
  background: rgba(255, 255, 255, 0.04) !important;
`;

// @ts-ignore - button is a JS component
const ButtonConfirm = styled(Button)`
  flex: 1 1 0 !important;
  min-width: 0 !important;
  min-height: 2.5rem !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
`;

const UserList = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 0.65rem 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const UserRow = styled.button<{ $selected: boolean }>`
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  width: 100%;
  margin: 0;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? 'rgba(32, 199, 187, 0.45)' : panelBorder)};
  background: ${({ $selected }) => ($selected ? accentSoft : 'rgba(255, 255, 255, 0.04)')};
  color: ${text};
  cursor: pointer;
  text-align: start;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:active {
    background: rgba(32, 199, 187, 0.22);
    border-color: rgba(32, 199, 187, 0.55);
  }
`;

const CheckMark = styled.span<{ $selected: boolean }>`
  flex: 0 0 auto;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  box-sizing: border-box;
  border: 2px solid ${({ $selected }) => ($selected ? accent : 'rgba(210, 224, 238, 0.35)')};
  background: ${({ $selected }) => ($selected ? accent : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::after {
    content: '';
    display: ${({ $selected }) => ($selected ? 'block' : 'none')};
    width: 0.35rem;
    height: 0.65rem;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translateY(-1px);
  }
`;

const UserMeta = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-align: start;
`;

const TextName = styled.span`
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.3;
  color: ${text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RoomHint = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.25;
  color: ${textMuted};
`;

const EmptyState = styled.p`
  margin: 1.5rem 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: ${textMuted};
`;

export default {
  SelectUserScreen,
  Header,
  Title,
  SubTitle,
  HeaderActions,
  ButtonBack,
  ButtonConfirm,
  UserList,
  UserRow,
  CheckMark,
  UserMeta,
  TextName,
  RoomHint,
  EmptyState,
};
