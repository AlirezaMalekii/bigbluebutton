import styled, { css, keyframes } from 'styled-components';
import Icon from '/imports/ui/components/common/icon/component';
import Dropzone from 'react-dropzone';
import Button from '/imports/ui/components/common/button/component';
import {
  fileLineWidth,
  iconPaddingMd,
  borderSizeLarge,
  statusIconSize,
  toastMdMargin,
  uploadListHeight,
  smPaddingX,
  mdPaddingY,
  statusInfoHeight,
  uploadIconSize,
  iconLineHeight,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  fontSizeLarge,
} from '/imports/ui/stylesheets/styled-components/typography';
import {
  colorGray,
  colorPrimary,
  colorWhite,
  colorDanger,
  colorSuccess,
  colorGrayLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import { ScrollboxVertical } from '/imports/ui/stylesheets/styled-components/scrollable';
import ToastStyles from '/imports/ui/components/common/toast/styles';

const barStripes = keyframes`
  from { background-position: 1rem 0; }
  to { background-position: 0 0; }
`;
const rotate = keyframes`
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
`;

const UploadRow = styled.div`
  display: flex;
  flex-direction: column;
`;

const FileLine = styled.div`
  display: flex;
  flex-direction: row;
  align-items: baseline;
  padding-bottom: ${iconPaddingMd};
  width: ${fileLineWidth};
`;

const ToastFileName = styled(ToastStyles.ToastMessage)`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-left: ${mdPaddingY};
  height: 1rem;
  width: auto;
  text-align: left;

  [dir="rtl"] & {
    margin-right: ${mdPaddingY};
    margin-left: 0;
    text-align: right;
  }
`;

const StatusIcon = styled.span`
  & > i {
    height: ${statusIconSize};
    width: ${statusIconSize};
  }
`;

const StatusInfo = styled.div`
  padding: 0;
  bottom: ${toastMdMargin};
  position: relative;
  left: ${borderSizeLarge};
  
  [dir="rtl"] & {
    right: ${borderSizeLarge};
    left: 0;
  }
`;

const skyroomText = 'var(--skyroom-modal-text, #eef4fb)';
const skyroomTextMuted = 'var(--skyroom-modal-text-muted, #aab6c7)';
const skyroomBorder = 'rgba(20, 169, 158, 0.24)';
const skyroomSurface = 'rgba(0, 0, 0, 0.22)';

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  min-height: 0;
`;

const HintBanner = styled.div`
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-radius: var(--radius-md, 12px);
  background: rgba(32, 199, 187, 0.08);
  border: 1px solid rgba(32, 199, 187, 0.2);
`;

const DropzoneSection = styled.div`
  margin-top: var(--space-1, 4px);
`;

const ListCard = styled.div`
  border-radius: var(--radius-md, 12px);
  border: 1px solid ${skyroomBorder};
  background: ${skyroomSurface};
  overflow: hidden;
`;

const presentationListColumns = `
  grid-template-columns: 2.25rem minmax(0, 1fr) auto minmax(4.5rem, 6.5rem) auto;
  column-gap: 12px;
`;

const PresentationList = styled.div.attrs({
  'data-skyroom': 'presentation-list',
})`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: transparent;
  color: ${skyroomText};
`;

const ListHeader = styled.div`
  display: grid;
  ${presentationListColumns}
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid ${skyroomBorder};
  color: ${skyroomTextMuted};
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

const ListHeaderCell = styled.span`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:last-child {
    justify-self: end;
    text-align: end;

    [dir="rtl"] & {
      justify-self: start;
      text-align: start;
    }
  }
`;

/* Do not use ScrollboxVertical here — its white fade gradients break dark modal rows */
const FileList = styled.div`
  height: 100%;
  max-height: min(280px, 38vh);
  padding: 0;
  margin-bottom: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: transparent;
  scrollbar-width: thin;
  scrollbar-color: rgba(32, 199, 187, 0.35) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(32, 199, 187, 0.35);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const Table = styled.table`
  position: relative;
  width: 100%;
  border-spacing: 0;
  border-collapse: separate;
`;

const VisuallyHidden = styled.th`
  position: absolute;
  overflow: hidden;
  clip: rect(0 0 0 0);
  height: 1px; width: 1px;
  margin: -1px; padding: 0; border: 0;
`;

const ToastWrapper = styled.div`
  max-height: 50%;
  width: ${fileLineWidth};
`;

const UploadToastHeader = styled.div`
  position: relative;
  margin-bottom: ${toastMdMargin};
  padding-bottom: ${smPaddingX};
`;

const UploadIcon = styled(Icon)`
  background-color: ${colorPrimary};
  color: ${colorWhite};
  height: ${uploadIconSize};
  width: ${uploadIconSize};
  border-radius: 50%;
  font-size: 135%;
  line-height: ${iconLineHeight};
  margin-right: ${smPaddingX};

  [dir="rtl"] & {
    margin-left: ${smPaddingX};
    margin-right: 0;
  }
`;

const UploadToastTitle = styled.span`
  position: fixed;
  font-weight: 600;
  margin-top: ${toastMdMargin};
`;

const InnerToast = styled(ScrollboxVertical)`
  position: relative;
  width: 100%;
  height: 100%;
  max-height: ${uploadListHeight};
  overflow-y: auto;
  padding-right: 1.5rem;
  box-sizing: content-box;
  background: none;

  [dir="rtl"] & {
    padding-right: 0;
    padding-left: 1.5rem;
  }
`;

const TableItemIcon = styled.td`
  width: 1%;

  & > i {
  font-size: 1.35rem;
  }
`;

const ColBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
`;

const CurrentBadgeWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CurrentLabel = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  background: var(--skyroom-gradient-primary, linear-gradient(145deg, #22d4c7, #0a7a72));
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: var(--radius-pill, 999px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 8px rgba(32, 199, 187, 0.25);
`;

const ColName = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
`;

const FileNameCell = styled.div`
  min-width: 0;
  width: 100%;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  & > span {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.875rem;
    font-weight: 500;
    color: ${skyroomText} !important;
    line-height: 1.35;
  }
`;

const ColStatus = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 0.75rem;
  color: ${skyroomTextMuted};

  [dir="rtl"] & {
    justify-content: flex-start;
  }
`;

const FileStatusCell = styled.div`
  min-width: 0;
  width: 100%;
  text-align: end;
  font-size: 0.75rem;
  line-height: 1.35;
  color: ${skyroomTextMuted} !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  [dir="rtl"] & {
    text-align: start;
  }
`;

const ItemAction = styled.div`
  margin-left: ${smPaddingX};
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &, & i {
    margin-top: 0;
    display: inline-flex;
    align-items: center;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: 1.2rem;
    color: ${skyroomTextMuted};
    padding: 0;
    ${({ animations }) => animations && `
      transition: color 0.2s ease, background 0.2s ease;
    `}
    :hover, :focus {
      color: var(--skyroom-brand-400, #14a99e);
      padding: unset !important;
    }
  }
`;

const RemoveButton = styled(Button)`
  [dir="ltr"] & {
    margin-left: ${smPaddingX};
  }

  [dir="rtl"] & {
    margin-right: ${smPaddingX};
  }

  div > i {
    margin-top: .25rem;
  }

  &,
  & > i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    cursor: pointer;
    font-size: 1.1rem;
    color: ${skyroomTextMuted};
    padding: 0;

    ${({ animations }) => animations && `
      transition: color 0.2s ease, background 0.2s ease;
    `}

    :hover, :focus {
      color: #ff8a85 !important;
      background: rgba(255, 106, 102, 0.12) !important;
      padding: unset !important;
    }
  }

  background-color: transparent;
  border: 0 !important;

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: .5;
    box-shadow: none;
    pointer-events: none;
  }
`;

const UploaderDropzone = styled(Dropzone)`
  flex: auto;
  border: 2px dashed rgba(32, 199, 187, 0.35);
  color: ${skyroomTextMuted};
  border-radius: var(--radius-lg, 16px);
  padding: var(--space-6, 24px) var(--space-5, 20px);
  text-align: center;
  font-size: ${fontSizeLarge};
  cursor: pointer;
  background: rgba(32, 199, 187, 0.04);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &:hover,
  &:focus-within {
    border-color: rgba(32, 199, 187, 0.55);
    background: rgba(32, 199, 187, 0.1);
    box-shadow: 0 0 0 1px rgba(32, 199, 187, 0.12) inset;
  }

  & .dropzoneActive {
    border-color: var(--skyroom-brand-400, #14a99e);
    background: rgba(32, 199, 187, 0.16);
  }
`;

const DropzoneIcon = styled(Icon)`
  font-size: 2.75rem;
  color: var(--skyroom-brand-400, #14a99e);
  opacity: 0.9;
`;

const DropzoneMessage = styled.p`
  margin: var(--space-3, 12px) 0 0;
  color: ${skyroomText};
  font-size: 0.9375rem;
  line-height: 1.5;
`;

const DropzoneLink = styled.span`
  color: var(--skyroom-brand-400, #14a99e);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline;
  margin-inline-start: 0.25em;

  &:hover {
    text-decoration: underline;
  }
`;

const ToastItemIcon = styled(Icon)`
  position: relative;
  width: ${statusIconSize};
  height: ${statusIconSize};
  font-size: 117%;
  left: ${statusInfoHeight};

  [dir="rtl"] & {
    left: unset;
    right: ${statusInfoHeight};
  }

  ${({ done }) => done && `
    color: ${colorSuccess};
  `}

  ${({ error }) => error && `
    color: ${colorDanger};
  `}

  ${({ loading }) => loading && css`
    color: ${colorGrayLightest};
    border: 1px solid;
    border-radius: 50%;
    border-right-color: ${({ color }) => color || colorGray};
    animation: ${rotate} 1s linear infinite;
  `}
`;

const StatusInfoSpan = styled.span`
  font-size: 70%;

  ${({ styles }) => styles === 'error' && `
    display: inline-block;
    color: ${colorDanger};
  `}
`;

const ModalHint = styled.div`
  margin: 0;
  color: ${skyroomTextMuted};
  font-weight: normal;
  font-size: 0.875rem;
  line-height: 1.55;
`;

const PresentationItem = styled.div.attrs({
  'data-skyroom': 'presentation-row',
})`
  display: grid;
  ${presentationListColumns}
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(218, 230, 245, 0.06);
  min-height: 52px;
  box-sizing: border-box;
  transition: background 0.15s ease;
  color: ${skyroomText};
  background-color: transparent;
  background-image: none;
  border-radius: 0;
  box-shadow: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover,
  &:focus-within {
    background-color: rgba(255, 255, 255, 0.04);
  }

  ${({ isCurrent }) => isCurrent && `
    background-color: rgba(32, 199, 187, 0.1) !important;
    background-image: none !important;
    box-shadow: inset 3px 0 0 var(--skyroom-brand-400, #14a99e) !important;

    [dir="rtl"] & {
      box-shadow: inset -3px 0 0 var(--skyroom-brand-400, #14a99e) !important;
    }
  `}

  ${({ isNew, isCurrent }) => isNew && !isCurrent && `
    background-color: rgba(32, 199, 187, 0.04);
  `}

  ${({ uploading, uploadInProgress }) => (uploading || uploadInProgress) && `
    background-color: rgba(32, 199, 187, 0.05);
  `}

  ${({ error }) => error && `
    background-color: rgba(223, 39, 33, 0.12);
    box-shadow: inset 3px 0 0 rgba(255, 106, 102, 0.75);

    [dir="rtl"] & {
      box-shadow: inset -3px 0 0 rgba(255, 106, 102, 0.75);
    }
  `}

  ${({ animated, animations }) => animated && css`
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.06) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.06) 75%,
      transparent 75%,
      transparent
    );
    background-size: 1rem 1rem;

    ${animations && css`
      animation: ${barStripes} 1s linear infinite;
    `}
  `}
`;

const ColActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;

  [dir="rtl"] & {
    justify-content: flex-start;
  }
`;

const FileActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  [dir="rtl"] & {
    justify-content: flex-start;
  }

  ${({ notDownloadable }) => notDownloadable && `
    min-width: 40px;
  `}
`;

const ExtraHint = styled.div`
  margin-top: var(--space-2, 8px);
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${skyroomText};
`;

const ExternalUpload = styled.div`
  background: ${skyroomSurface};
  border: 1px solid ${skyroomBorder};
  border-radius: var(--radius-md, 12px);
  margin-top: var(--space-2, 8px);
  padding: var(--space-4, 16px) var(--space-5, 20px);
  color: ${skyroomTextMuted};
  font-weight: normal;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  gap: var(--space-4, 16px);

  & p {
    margin: var(--space-2, 8px) 0 0;
    font-size: 0.8125rem;
    line-height: 1.45;
  }
`;

const ExternalUploadTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0;
  color: ${skyroomText};
`;

const ExternalUploadButton = styled(Button)`
  height: 2rem;
  align-self: center;
  margin-left: 2rem;
`;

const ExportHint = styled(ModalHint)`
  margin: 0;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-radius: var(--radius-md, 12px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(218, 230, 245, 0.08);
`;

const ColRadio = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SetCurrentAction = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  &, & i {
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: 1.1rem;

    ${({ animations }) => animations && `
      transition: all .25s;
    `}
  }
`;

export default {
  ModalBody,
  HintBanner,
  DropzoneSection,
  ListCard,
  PresentationList,
  ListHeader,
  ListHeaderCell,
  ColRadio,
  ColName,
  ColBadge,
  ColStatus,
  ColActions,
  UploadRow,
  FileLine,
  ToastFileName,
  StatusIcon,
  StatusInfo,
  FileList,
  Table,
  VisuallyHidden,
  ToastWrapper,
  UploadToastHeader,
  UploadIcon,
  UploadToastTitle,
  InnerToast,
  TableItemIcon,
  CurrentBadgeWrap,
  CurrentLabel,
  FileNameCell,
  FileStatusCell,
  ItemAction,
  RemoveButton,
  UploaderDropzone,
  DropzoneIcon,
  DropzoneMessage,
  DropzoneLink,
  ModalHint,
  ToastItemIcon,
  StatusInfoSpan,
  PresentationItem,
  FileActionsCell,
  ExtraHint,
  ExternalUpload,
  ExternalUploadTitle,
  ExternalUploadButton,
  ExportHint,
  SetCurrentAction,
};
