import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import { TAB } from '/imports/utils/keyCodes';
import Button from '/imports/ui/components/common/button/component';
import update from 'immutability-helper';
import logger from '/imports/startup/client/logger';
import { toast } from 'react-toastify';
import { unique } from 'radash';
import { registerTitleView, unregisterTitleView } from '/imports/utils/dom-utils';
import ModalFullscreen from '/imports/ui/components/common/modal/fullscreen/component';
import Styled from './styles';
import PresentationDownloadDropdown from './presentation-download-dropdown/component';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import Radio from '/imports/ui/components/common/radio/component';
import Session from '/imports/ui/services/storage/in-memory';
import {
  buildAcceptList,
  isMediaExtension,
} from './fileTypes';
import {
  resolvePresentationId,
  isPresentationMedia,
  startPresentationMediaExternalVideo,
} from './presentationMediaSync';
import OnlineVideoSection from './online-video-section/component';
import Service from './service';
/* eslint-disable react/sort-comp */

const propTypes = {
  allowDownloadOriginal: PropTypes.bool.isRequired,
  allowDownloadConverted: PropTypes.bool.isRequired,
  allowDownloadWithAnnotations: PropTypes.bool.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  fileUploadConstraintsHint: PropTypes.bool.isRequired,
  fileSizeMax: PropTypes.number.isRequired,
  filePagesMax: PropTypes.number.isRequired,
  handleSave: PropTypes.func.isRequired,
  handleUploadPending: PropTypes.func.isRequired,
  dispatchChangePresentationDownloadable: PropTypes.func.isRequired,
  setPresentation: PropTypes.func.isRequired,
  removePresentation: PropTypes.func.isRequired,
  presentationEnabled: PropTypes.bool.isRequired,
  fileValidMimeTypes: PropTypes.arrayOf(PropTypes.shape).isRequired,
  presentations: PropTypes.arrayOf(PropTypes.shape({
    presentationId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    current: PropTypes.bool.isRequired,
  })).isRequired,
  currentPresentation: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  handleFiledrop: PropTypes.func.isRequired,
  selectedToBeNextCurrent: PropTypes.string,
  renderPresentationItemStatus: PropTypes.func.isRequired,
  isPresenter: PropTypes.bool.isRequired,
  exportPresentation: PropTypes.func.isRequired,
  startExternalVideo: PropTypes.func,
  stopExternalVideo: PropTypes.func,
  allowExternalVideo: PropTypes.bool,
  isSharingVideo: PropTypes.bool,
  externalUploadData: PropTypes.shape({
    presentationUploadExternalDescription: PropTypes.string,
    presentationUploadExternalUrl: PropTypes.string,
  }).isRequired,
};

const defaultProps = {
  selectedToBeNextCurrent: '',
  startExternalVideo: null,
  stopExternalVideo: null,
  allowExternalVideo: false,
  isSharingVideo: false,
};

const intlMessages = defineMessages({
  currentBadge: {
    id: 'app.presentationUploder.currentBadge',
  },
  title: {
    id: 'app.presentationUploder.title',
    description: 'title of the modal',
  },
  message: {
    id: 'app.presentationUploder.message',
    description: 'message warning the types of files accepted',
  },
  uploadLabel: {
    id: 'app.presentationUploder.uploadLabel',
    description: 'confirm label when presentations are to be uploaded',
  },
  confirmLabel: {
    id: 'app.presentationUploder.confirmLabel',
    description: 'confirm label when no presentations are to be uploaded',
  },
  confirmDesc: {
    id: 'app.presentationUploder.confirmDesc',
    description: 'description of the confirm',
  },
  dismissLabel: {
    id: 'app.presentationUploder.dismissLabel',
    description: 'used in the button that close modal',
  },
  dismissDesc: {
    id: 'app.presentationUploder.dismissDesc',
    description: 'description of the dismiss',
  },
  dropzoneLabel: {
    id: 'app.presentationUploder.dropzoneLabel',
    description: 'message warning where drop files for upload',
  },
  externalUploadTitle: {
    id: 'app.presentationUploder.externalUploadTitle',
    description: 'title for external upload area',
  },
  externalUploadLabel: {
    id: 'app.presentationUploder.externalUploadLabel',
    description: 'message of external upload button',
  },
  dropzoneImagesLabel: {
    id: 'app.presentationUploder.dropzoneImagesLabel',
    description: 'message warning where drop images for upload',
  },
  browseFilesLabel: {
    id: 'app.presentationUploder.browseFilesLabel',
    description: 'message use on the file browser',
  },
  browseImagesLabel: {
    id: 'app.presentationUploder.browseImagesLabel',
    description: 'message use on the image browser',
  },
  fileToUpload: {
    id: 'app.presentationUploder.fileToUpload',
    description: 'message used in the file selected for upload',
  },
  extraHint: {
    id: 'app.presentationUploder.extraHint',
    description: 'message used to indicate upload file max sizes',
  },
  rejectedError: {
    id: 'app.presentationUploder.rejectedError',
    description: 'some files rejected, please check the file mime types',
  },
  badConnectionError: {
    id: 'app.presentationUploder.connectionClosedError',
    description: 'message indicating that the connection was closed',
  },
  413: {
    id: 'app.presentationUploder.upload.413',
    description: 'error that file exceed the size limit',
  },
  408: {
    id: 'app.presentationUploder.upload.408',
    description: 'error for token request timeout',
  },
  404: {
    id: 'app.presentationUploder.upload.404',
    description: 'error not found',
  },
  401: {
    id: 'app.presentationUploder.upload.401',
    description: 'error for failed upload token request.',
  },
  FILE_VIRUS: {
    id: 'app.presentationUploder.upload.fileVirus',
    description: 'error that the file could not be uploaded due to security concerns',
  },
  SCAN_FAILED: {
    id: 'app.presentationUploder.upload.scanFailed',
    description: 'error that the file could not be uploaded because scanning failed',
  },
  conversionProcessingSlides: {
    id: 'app.presentationUploder.conversion.conversionProcessingSlides',
    description: 'indicates how many slides were converted',
  },
  genericError: {
    id: 'app.presentationUploder.genericError',
    description: 'generic error while uploading/converting',
  },
  genericConversionStatus: {
    id: 'app.presentationUploder.conversion.genericConversionStatus',
    description: 'indicates that file is being converted',
  },
  TIMEOUT: {
    id: 'app.presentationUploder.conversion.timeout',
  },
  CONVERSION_TIMEOUT: {
    id: 'app.presentationUploder.conversion.conversionTimeout',
    description: 'warns the user that the presentation timed out in the back-end in specific page of the document',
  },
  GENERATING_THUMBNAIL: {
    id: 'app.presentationUploder.conversion.generatingThumbnail',
    description: 'indicatess that it is generating thumbnails',
  },
  GENERATING_SVGIMAGES: {
    id: 'app.presentationUploder.conversion.generatingSvg',
    description: 'warns that it is generating svg images',
  },
  GENERATED_SLIDE: {
    id: 'app.presentationUploder.conversion.generatedSlides',
    description: 'warns that were slides generated',
  },
  PAGE_COUNT_EXCEEDED: {
    id: 'app.presentationUploder.conversion.pageCountExceeded',
    description: 'warns the user that the conversion failed because of the page count',
  },
  PDF_HAS_BIG_PAGE: {
    id: 'app.presentationUploder.conversion.pdfHasBigPage',
    description: 'warns the user that the conversion failed because of the pdf page siz that exceeds the allowed limit',
  },
  OFFICE_DOC_CONVERSION_INVALID: {
    id: 'app.presentationUploder.conversion.officeDocConversionInvalid',
    description: '',
  },
  OFFICE_DOC_CONVERSION_FAILED: {
    id: 'app.presentationUploder.conversion.officeDocConversionFailed',
    description: 'warns the user that the conversion failed because of wrong office file',
  },
  UNSUPPORTED_DOCUMENT: {
    id: 'app.presentationUploder.conversion.unsupportedDocument',
    description: 'warns the user that the file extension is not supported',
  },
  isDownloadable: {
    id: 'app.presentationUploder.isDownloadableLabel',
    description: 'presentation is available for downloading by all viewers',
  },
  isNotDownloadable: {
    id: 'app.presentationUploder.isNotDownloadableLabel',
    description: 'presentation is not available for downloading the viewers',
  },
  removePresentation: {
    id: 'app.presentationUploder.removePresentationLabel',
    description: 'select to delete this presentation',
  },
  setAsCurrentPresentation: {
    id: 'app.presentationUploder.setAsCurrentPresentation',
    description: 'set this presentation to be the current one',
  },
  status: {
    id: 'app.presentationUploder.tableHeading.status',
    description: 'aria label status table heading',
  },
  options: {
    id: 'app.presentationUploder.tableHeading.options',
    description: 'aria label for options table heading',
  },
  filename: {
    id: 'app.presentationUploder.tableHeading.filename',
    description: 'aria label for file name table heading',
  },
  uploadStatus: {
    id: 'app.presentationUploder.uploadStatus',
    description: 'upload status for toast notification',
  },
  completed: {
    id: 'app.presentationUploder.completed',
    description: 'uploads complete label for toast notification',
  },
  clearErrors: {
    id: 'app.presentationUploder.clearErrors',
    description: 'button label for clearing upload errors',
  },
  clearErrorsDesc: {
    id: 'app.presentationUploder.clearErrorsDesc',
    description: 'aria description for button clearing upload error',
  },
  uploadViewTitle: {
    id: 'app.presentationUploder.uploadViewTitle',
    description: 'view name apended to document title',
  },
  exportHint: {
    id: 'app.presentationUploader.exportHint',
    description: 'message to indicate the export presentation option',
  },
  exportToastHeader: {
    id: 'app.presentationUploader.exportToastHeader',
    description: 'exporting toast header',
  },
  exportToastHeaderPlural: {
    id: 'app.presentationUploader.exportToastHeaderPlural',
    description: 'exporting toast header in plural',
  },
  export: {
    id: 'app.presentationUploader.export',
    description: 'send presentation to chat',
  },
  exporting: {
    id: 'app.presentationUploader.exporting',
    description: 'presentation is being sent to chat',
  },
  currentLabel: {
    id: 'app.presentationUploader.currentPresentationLabel',
    description: 'current presentation label',
  },
  actionsLabel: {
    id: 'app.presentation.actionsLabel',
    description: 'actions label',
  },
});

const handleDismissToast = (id) => toast.dismiss(id);

const normalizePresentations = (list) => (
  Array.isArray(list) ? list.filter(Boolean) : []
);

const applySelectionToPresentations = (list, selectedId) => {
  const presentations = normalizePresentations(list);
  if (!selectedId || !presentations.length) {
    return presentations.map((p) => ({
      ...p,
      isMedia: p.isMedia ?? isMediaExtension(p.name),
    }));
  }
  return presentations.map((p) => ({
    ...p,
    current: p.presentationId === selectedId,
    isMedia: p.isMedia ?? isMediaExtension(p.name),
  }));
};

const mergeUploadState = (serverUpload = {}, localUpload = {}) => {
  const progress = Math.max(
    Number(serverUpload?.progress) || 0,
    Number(localUpload?.progress) || 0,
  );
  const done = !!(serverUpload?.done || localUpload?.done || progress >= 100);
  const error = !!(localUpload?.error || serverUpload?.error);

  return {
    ...(serverUpload || {}),
    ...(localUpload || {}),
    progress: done && !error ? Math.max(progress, 100) : progress,
    done,
    error,
    ...(error ? {
      status: localUpload?.status || serverUpload?.status,
    } : {}),
  };
};

const preserveLocalPresentationFields = (clonedPresentations, originalPresentations) => {
  const originalById = new Map();
  normalizePresentations(originalPresentations).forEach((presentation) => {
    if (presentation.presentationId) {
      originalById.set(presentation.presentationId, presentation);
    }
    if (presentation.uploadTemporaryId) {
      originalById.set(presentation.uploadTemporaryId, presentation);
    }
  });

  return normalizePresentations(clonedPresentations).map((presentation) => {
    const original = originalById.get(presentation.presentationId)
      || originalById.get(presentation.uploadTemporaryId);
    if (!original) return presentation;

    return {
      ...presentation,
      ...(original.file && !presentation.uploadCompleted ? { file: original.file } : {}),
      ...(original.uploadStarted ? { uploadStarted: original.uploadStarted } : {}),
      ...(original.upload || presentation.upload
        ? { upload: mergeUploadState(presentation.upload, original.upload) }
        : {}),
      ...(original.conversion ? {
        conversion: { ...presentation.conversion, ...original.conversion },
      } : {}),
      ...(typeof original.onProgress === 'function' ? { onProgress: original.onProgress } : {}),
      ...(typeof original.onConversion === 'function' ? { onConversion: original.onConversion } : {}),
      ...(typeof original.onUpload === 'function' ? { onUpload: original.onUpload } : {}),
      ...(typeof original.onServerPresentationId === 'function'
        ? { onServerPresentationId: original.onServerPresentationId }
        : {}),
      ...(typeof original.onDone === 'function' ? { onDone: original.onDone } : {}),
    };
  });
};

const mergeLocalUploadFields = (serverEntry, localPresentations) => {
  const localMatch = normalizePresentations(localPresentations).find(
    (presentation) => presentation.presentationId === serverEntry.uploadTemporaryId
      || presentation.uploadTemporaryId === serverEntry.uploadTemporaryId
      || presentation.presentationId === serverEntry.presentationId
      || (
        presentation.name === serverEntry.name
        && (presentation.file || presentation.uploadStarted)
      ),
  );

  if (!localMatch) return serverEntry;

  return {
    ...serverEntry,
    uploadTemporaryId: serverEntry.uploadTemporaryId
      || localMatch.uploadTemporaryId
      || localMatch.presentationId,
    ...(localMatch.file && !serverEntry.uploadCompleted ? { file: localMatch.file } : {}),
    ...(localMatch.uploadStarted ? { uploadStarted: localMatch.uploadStarted } : {}),
    ...(localMatch.isMedia != null ? { isMedia: localMatch.isMedia } : {}),
    upload: mergeUploadState(serverEntry.upload, localMatch.upload),
    ...(typeof localMatch.onProgress === 'function' ? { onProgress: localMatch.onProgress } : {}),
    ...(typeof localMatch.onConversion === 'function' ? { onConversion: localMatch.onConversion } : {}),
    ...(typeof localMatch.onUpload === 'function' ? { onUpload: localMatch.onUpload } : {}),
    ...(typeof localMatch.onServerPresentationId === 'function'
      ? { onServerPresentationId: localMatch.onServerPresentationId }
      : {}),
    ...(typeof localMatch.onDone === 'function' ? { onDone: localMatch.onDone } : {}),
  };
};

const isPresentationUploadPending = (presentation) => {
  if (!presentation) return false;
  if (presentation.uploadCompleted) return false;
  if (presentation.uploadErrorMsgKey || presentation.uploadErrorDetailsJson) return false;
  if (presentation.upload?.error) return false;
  if (presentation.upload?.done) {
    // Local HTTP upload finished; keep confirm disabled only while server is still converting.
    return !!presentation.uploadInProgress;
  }
  if (presentation.uploadInProgress) return true;
  if (presentation.uploadStarted) return true;
  if (presentation.file) return true;
  if (presentation.upload && !presentation.upload.done) return true;
  return false;
};

class PresentationUploader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      presentations: props.presentations || [],
      disableActions: false,
      presExporting: new Set(),
      shouldDisableExportButtonForAllDocuments: false,
    };

    this.hasError = null;
    this.exportToastId = 'exportPresentationToastId';
    this.focusTrapHandler = null;
    this.focusTrapModal = null;
    this.fileInputRef = React.createRef();

    const { handleFiledrop } = this.props;
    // handlers
    this.handleFiledrop = handleFiledrop;
    this.handleNativeFileInput = this.handleNativeFileInput.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.triggerAutoUpload = this.triggerAutoUpload.bind(this);
    this.handleDismiss = this.handleDismiss.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleCurrentChange = this.handleCurrentChange.bind(this);
    this.handleDownloadingOfPresentation = this.handleDownloadingOfPresentation.bind(this);
    // renders
    this.renderDropzone = this.renderDropzone.bind(this);
    this.renderExternalUpload = this.renderExternalUpload.bind(this);
    this.renderPresentationList = this.renderPresentationList.bind(this);
    this.renderPresentationItem = this.renderPresentationItem.bind(this);
    // utilities
    this.deepMergeUpdateFileKey = this.deepMergeUpdateFileKey.bind(this);
    this.updateFileKey = this.updateFileKey.bind(this);
    this.getPresentationsToShow = this.getPresentationsToShow.bind(this);
    this.handleDownloadableChange = this.handleDownloadableChange.bind(this);
    this.setupFocusTrap = this.setupFocusTrap.bind(this);
    this.teardownFocusTrap = this.teardownFocusTrap.bind(this);
    this.getPendingSelectionId = this.getPendingSelectionId.bind(this);
    this.handlePresentationRowClick = this.handlePresentationRowClick.bind(this);
    this.syncExternalVideoForSelection = this.syncExternalVideoForSelection.bind(this);
    this.assignServerPresentationId = this.assignServerPresentationId.bind(this);
  }

  getPendingSelectionId() {
    const { selectedToBeNextCurrent } = this.props;
    return Session.getItem('selectedToBeNextCurrent') || selectedToBeNextCurrent || '';
  }

  getSelectedPresentation() {
    const { presentations } = this.state;
    const pendingId = this.getPendingSelectionId();
    return presentations.find((p) => p.presentationId === pendingId)
      || presentations.find((p) => p?.current);
  }

  isConfirmDisabled() {
    const { presentations } = this.state;
    const selectedItem = this.getSelectedPresentation();

    if (selectedItem) {
      if (selectedItem.uploadErrorMsgKey || selectedItem.uploadErrorDetailsJson) return true;
      if (isPresentationUploadPending(selectedItem)) return true;
      if (!selectedItem.uploadCompleted) return true;
      return false;
    }

    return presentations.some(
      (p) => isPresentationUploadPending(p) || (!p?.uploadCompleted && !p?.uploadErrorMsgKey),
    );
  }

  syncExternalVideoForSelection(selectedItem, propPresentations, options = {}) {
    const { startExternalVideo, stopExternalVideo } = this.props;
    // Always detach Aparat/online first. Media files restart after a short delay so
    // StopExternalVideo settles before StartExternalVideo replaces the stage.
    if (!selectedItem || !isPresentationMedia(selectedItem)) {
      stopExternalVideo?.();
      return;
    }
    startPresentationMediaExternalVideo(
      selectedItem,
      propPresentations,
      { startExternalVideo, stopExternalVideo },
      { delayMs: 250, ...options },
    );
  }

  assignServerPresentationId(tempId, serverPresentationId) {
    if (!tempId || !serverPresentationId || tempId === serverPresentationId) return;

    this.setState(({ presentations: rawPresentations }) => {
      const presentations = normalizePresentations(rawPresentations);
      const fileIndex = presentations.findIndex(
        (f) => f?.presentationId === tempId || f?.uploadTemporaryId === tempId,
      );
      if (fileIndex === -1) return null;

      const pendingSelectionId = this.getPendingSelectionId();
      if (pendingSelectionId === tempId) {
        Session.setItem('selectedToBeNextCurrent', serverPresentationId);
      }

      return {
        presentations: update(presentations, {
          [fileIndex]: {
            $merge: {
              uploadTemporaryId: tempId,
              presentationId: serverPresentationId,
            },
          },
        }),
      };
    });
  }

  handlePresentationRowClick(event, item) {
    if (event.target.closest('button, [role="button"], a, input, label')) return;
    if (item?.uploadErrorMsgKey || item?.uploadErrorDetailsJson) return;
    this.handleCurrentChange(item.presentationId);
  }

  handleNativeFileInput(event) {
    const { intl } = this.props;
    const files = Array.from(event.target.files || []);
    if (files.length) {
      this.handleFiledrop(files, [], this, intl, intlMessages);
    }
    // eslint-disable-next-line no-param-reassign
    event.target.value = '';
  }

  setupFocusTrap() {
    if (this.focusTrapTimeout) {
      clearTimeout(this.focusTrapTimeout);
    }

    this.focusTrapTimeout = setTimeout(() => {
      this.teardownFocusTrap();

      const modal = document.querySelector('[data-test="managePresentationsModal"]')
        || document.getElementById('fsmodal');
      if (!modal) return;

      const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableContent = modal.querySelectorAll(focusableElements);
      if (!focusableContent || focusableContent.length === 0) return;

      const firstFocusableElement = focusableContent[0];
      const lastFocusableElement = focusableContent[focusableContent.length - 1];

      firstFocusableElement?.focus?.();

      this.focusTrapModal = modal;
      this.focusTrapHandler = (e) => {
        const tab = e.key === 'Tab' || e.keyCode === TAB;
        if (!tab) return;
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            e.preventDefault();
          }
        } else if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      };
      modal.addEventListener('keydown', this.focusTrapHandler);
    }, 0);
  }

  teardownFocusTrap() {
    if (this.focusTrapTimeout) {
      clearTimeout(this.focusTrapTimeout);
      this.focusTrapTimeout = null;
    }
    if (this.focusTrapModal && this.focusTrapHandler) {
      this.focusTrapModal.removeEventListener('keydown', this.focusTrapHandler);
    }
    this.focusTrapModal = null;
    this.focusTrapHandler = null;
  }

  componentDidUpdate(prevProps) {
    const {
      isOpen,
      presentations: propPresentationsProp,
      currentPresentation,
      intl,
    } = this.props;
    const propPresentations = normalizePresentations(propPresentationsProp);
    const { presentations: statePresentations } = this.state;
    const presentations = normalizePresentations(statePresentations);
    const prevPropPresentations = normalizePresentations(prevProps.presentations);

    let shouldUpdateState = false;

    let presState = preserveLocalPresentationFields(
      JSON.parse(JSON.stringify(presentations)),
      presentations,
    );

    // New entries comming from graphql
    const propsDiffs = propPresentations.filter(
      (p) => !prevPropPresentations.some(
        (presentation) => p.presentationId === presentation.presentationId
          || (p.uploadTemporaryId
            && presentation.uploadTemporaryId
            && p.uploadTemporaryId === presentation.uploadTemporaryId),
      ),
    );

    if (propsDiffs.length > 0) {
      // Always update when there is a new presentation entry from graphql
      shouldUpdateState = true;

      const replacedCurrent = presState.find(
        (pres) => pres?.current && propsDiffs.some(
          (p) => pres.presentationId === p.uploadTemporaryId
            || pres.presentationId === p.presentationId,
        ),
      );

      // When the entry comes, remove previous presentation with the same temporaryId
      presState = presState.filter(
        (pres) => !propsDiffs.some((p) => pres.presentationId === p.uploadTemporaryId
          || pres.presentationId === p.presentationId),
      );

      let newEntries = JSON.parse(JSON.stringify(propsDiffs)).map((entry) => (
        mergeLocalUploadFields({
          ...entry,
          isMedia: isMediaExtension(entry.name),
        }, presentations)
      ));
      const pendingSelectionId = this.getPendingSelectionId();
      if (replacedCurrent) {
        newEntries = newEntries.map((entry) => {
          if (
            entry.uploadTemporaryId === replacedCurrent.presentationId
            || entry.presentationId === replacedCurrent.presentationId
          ) {
            return { ...entry, current: true };
          }
          return entry;
        });
        if (isOpen) {
          const nextCurrent = pendingSelectionId
            || newEntries.find((entry) => entry.current)?.presentationId;
          if (nextCurrent) {
            Session.setItem('selectedToBeNextCurrent', nextCurrent);
          }
        }
      }

      // Then add the new entries to state
      presState = [
        ...preserveLocalPresentationFields(
          JSON.parse(JSON.stringify(presState)),
          presentations,
        ),
        ...newEntries,
      ];

      if (isOpen && pendingSelectionId) {
        presState = applySelectionToPresentations(presState, pendingSelectionId);
      }
    }

    const presStateFiltered = presState.filter((presentation) => {
      if (!presentation?.presentationId) return false;

      const currentPropPres = propPresentations.find(
        (pres) => pres.presentationId === presentation.presentationId,
      );
      const prevPropPres = prevPropPresentations.find(
        (pres) => pres.presentationId === presentation.presentationId,
      );
      const hasConversionError = !!presentation?.uploadErrorMsgKey;
      const finishedConversion = !presentation?.uploadInProgress
        || !currentPropPres?.uploadInProgress;
      const hasLocalUpload = isPresentationUploadPending(presentation)
        || !!presentation.file
        || !!presentation.uploadStarted;

      if (hasConversionError || (!finishedConversion && hasLocalUpload)) return true;

      const modPresentation = presentation;
      if (!isOpen && currentPropPres?.current !== prevPropPres?.current) {
        modPresentation.current = currentPropPres?.current;
        shouldUpdateState = true;
      }

      if (currentPropPres?.totalPagesUploaded !== prevPropPres?.totalPagesUploaded
        || (presentation?.totalPagesUploaded ?? 0) !== (currentPropPres?.totalPagesUploaded ?? 0)) {
        modPresentation.totalPagesUploaded = currentPropPres?.totalPagesUploaded ?? 0;
        shouldUpdateState = true;
      }

      if (currentPropPres?.uploadCompleted !== prevPropPres?.uploadCompleted
        || presentation.uploadCompleted !== currentPropPres?.uploadCompleted) {
        modPresentation.uploadCompleted = currentPropPres?.uploadCompleted;
        shouldUpdateState = true;
      }

      if (
        currentPropPres?.uploadErrorMsgKey !== prevPropPres?.uploadErrorMsgKey
        && currentPropPres?.uploadErrorDetailsJson !== prevPropPres?.uploadErrorDetailsJson
      ) {
        modPresentation.uploadErrorMsgKey = currentPropPres?.uploadErrorMsgKey;
        modPresentation.uploadErrorDetailsJson = currentPropPres?.uploadErrorDetailsJson;
        shouldUpdateState = true;
      }

      if (currentPropPres?.totalPages !== prevPropPres?.totalPages
        || presentation.totalPages !== currentPropPres?.totalPages) {
        modPresentation.totalPages = currentPropPres?.totalPages;
        shouldUpdateState = true;
      }

      if (currentPropPres?.downloadable !== prevPropPres?.downloadable) {
        modPresentation.downloadable = currentPropPres?.downloadable;
        shouldUpdateState = true;
      }

      if (currentPropPres?.downloadFileUri !== prevPropPres?.downloadFileUri) {
        modPresentation.downloadFileUri = currentPropPres?.downloadFileUri;
        shouldUpdateState = true;
      }

      if (currentPropPres?.filenameConverted !== prevPropPres?.filenameConverted) {
        modPresentation.filenameConverted = currentPropPres?.filenameConverted;
        shouldUpdateState = true;
      }

      if (currentPropPres) {
        modPresentation.uploadInProgress = currentPropPres?.uploadInProgress;
        modPresentation.removable = currentPropPres?.removable;
      }

      return true;
    }).filter((presentation) => {
      const duplicated = presentations.find(
        (pres) => pres.name === presentation.name
          && pres.presentationId !== presentation.presentationId,
      );
      if (duplicated
        && duplicated.presentationId.startsWith(presentation.name)
        && !presentation.presentationId.startsWith(presentation.name)
        && presentation?.uploadInProgress === duplicated?.uploadInProgress) {
        return false; // Prioritizing propPresentations (the one with id from back-end)
      }
      return true;
    });

    if (shouldUpdateState) {
      let shouldDisableActions = false;
      let shouldDisableExportButtonForAllDocuments = false;
      presStateFiltered.forEach(
        (p) => {
          shouldDisableActions = shouldDisableExportButtonForAllDocuments
            || !!p.uploadErrorMsgKey || !!p.uploadErrorDetailsJson;
          shouldDisableExportButtonForAllDocuments = (
            !p.uploadCompleted && !p.uploadErrorDetailsJson
          );
        },
      );
      const pendingSelectionId = isOpen ? this.getPendingSelectionId() : '';
      this.setState({
        presentations: applySelectionToPresentations(
          unique(presStateFiltered, (p) => p.presentationId),
          pendingSelectionId,
        ),
        shouldDisableExportButtonForAllDocuments,
        disableActions: shouldDisableActions,
      });
    }

    if (!isOpen && prevProps.isOpen) {
      unregisterTitleView();
      this.teardownFocusTrap();
    }

    // Updates presentation list when modal opens to avoid missing presentations
    if (isOpen && !prevProps.isOpen) {
      registerTitleView(intl.formatMessage(intlMessages.uploadViewTitle));
      this.hasError = null;
      const currentFromServer = propPresentations.find((p) => p?.current)?.presentationId
        || currentPresentation
        || '';
      if (currentFromServer) {
        Session.setItem('selectedToBeNextCurrent', currentFromServer);
      }
      this.setState({
        presentations: applySelectionToPresentations(
          JSON.parse(JSON.stringify(propPresentations)),
          currentFromServer,
        ),
        disableActions: false,
      });
      this.setupFocusTrap();
    }

    if (!isOpen && currentPresentation && currentPresentation !== prevProps.currentPresentation) {
      const hasPresentationInState = presentations.some(
        (p) => p?.presentationId === currentPresentation,
      );
      if (hasPresentationInState) {
        this.handleCurrentChange(currentPresentation);
      }
    }

    if (toast.isActive(this.exportToastId)) {
      if (!prevProps.isOpen && isOpen) {
        handleDismissToast(this.exportToastId);
      }

      if (typeof this.renderExportToast === 'function') {
        toast.update(this.exportToastId, {
          render: this.renderExportToast(),
        });
      }
    }
  }

  componentWillUnmount() {
    this.teardownFocusTrap();
    if (toast.isActive(this.exportToastId)) {
      toast.dismiss(this.exportToastId);
    }
    Session.setItem('showUploadPresentationView', false);
  }

  handleRemove(item, withErr = false) {
    const {
      handleSave,
      setPresentation,
      removePresentation,
      presentationEnabled,
      presentations: propsPresentations,
    } = this.props;
    if (withErr) {
      const { presentations: statePresentations } = this.state;
      const presentations = normalizePresentations(statePresentations);
      const propPresentations = normalizePresentations(propsPresentations);
      const filteredPropPresentations = propPresentations.filter(
        (d) => d?.uploadCompleted && !d?.uploadInProgress,
      );
      const ids = new Set(filteredPropPresentations.map((d) => d.presentationId));
      const filteredPresentations = presentations.filter(
        (d) => !ids.has(d.presentationId)
          && !d.uploadErrorMsgKey && !(d.uploadCompleted && !d.uploadInProgress),
      );
      const merged = [
        ...filteredPresentations,
        ...filteredPropPresentations,
      ];
      let hasUploading;
      merged.forEach((d) => {
        if (!d.uploadCompleted || d.uploadInProgress) {
          hasUploading = true;
        }
      });
      const hasCurrent = merged.some((pres) => pres?.current);
      if (!hasCurrent && merged[0]) merged[0].current = true;
      this.hasError = false;

      // Save the state without errors in graphql
      handleSave(merged,
        true,
        {},
        propPresentations,
        setPresentation,
        removePresentation,
        presentationEnabled);
      if (hasUploading) {
        this.setState({
          presentations: merged,
        });
        return;
      }
      this.setState({
        presentations: merged,
        disableActions: false,
      });
      return;
    }

    const { presentations: statePresentations } = this.state;
    const presentations = normalizePresentations(statePresentations);
    const toRemoveIndex = presentations.indexOf(item);
    if (toRemoveIndex === -1) return;

    const removedWasCurrent = item?.current === true;
    this.setState({
      presentations: update(presentations, {
        $splice: [[toRemoveIndex, 1]],
      }),
    }, () => {
      const { presentations: updatedPresentations } = this.state;
      const currentIndex = updatedPresentations.findIndex((p) => p?.current);

      if (currentIndex === -1 && updatedPresentations.length > 0) {
        const defaultIndex = updatedPresentations.findIndex((p) => p?.isDefault);
        const newCurrentIndex = defaultIndex === -1 ? 0 : defaultIndex;
        const nextCurrentId = updatedPresentations[newCurrentIndex]?.presentationId || '';
        const updatedCurrent = updatedPresentations.map((presentation, index) => ({
          ...presentation,
          current: index === newCurrentIndex,
        }));
        Session.setItem('selectedToBeNextCurrent', nextCurrentId);
        this.setState({ presentations: updatedCurrent });
        return;
      }

      if (removedWasCurrent && currentIndex === -1) {
        Session.setItem('selectedToBeNextCurrent', '');
      }
    });
  }

  handleCurrentChange(id) {
    this.setState(({ presentations: rawPresentations }) => {
      const presentations = normalizePresentations(rawPresentations);
      if (presentations.length === 0 || !id) return false;

      const target = presentations.find((p) => p?.presentationId === id);
      if (target && (target.uploadErrorMsgKey || target.uploadErrorDetailsJson)) {
        return false;
      }

      const newCurrentIndex = presentations.findIndex((p) => p?.presentationId === id);
      if (newCurrentIndex === -1) return false;

      const currentIndex = presentations.findIndex((p) => p?.current);
      const commands = {};

      // we can end up without a current presentation
      if (currentIndex !== -1) {
        commands[currentIndex] = {
          $apply: (presentation) => {
            const p = presentation;
            p.current = false;
            return p;
          },
        };
      }

      commands[newCurrentIndex] = {
        $apply: (presentation) => {
          if (presentation) {
            const p = presentation;
            p.current = true;
            return p;
          }
          return presentation;
        },
      };

      const presentationsUpdated = update(presentations, commands);
      Session.setItem('selectedToBeNextCurrent', id);
      return {
        presentations: presentationsUpdated,
      };
    });
  }

  triggerAutoUpload(presentationIds) {
    const { handleUploadPending, presentationEnabled } = this.props;

    if (!presentationEnabled || !presentationIds?.length) return;

    const PRESENTATION_CONFIG = window.meetingClientSettings.public.presentation;

    this.setState(({ presentations: rawPresentations }) => {
      const presentations = normalizePresentations(rawPresentations);
      return {
        presentations: presentations.map((p) => (
          presentationIds.includes(p.presentationId)
            ? update(p, { uploadStarted: { $set: true } })
            : p
        )),
      };
    }, () => {
      const { presentations } = this.state;

      handleUploadPending(
        presentations,
        PRESENTATION_CONFIG.uploadEndpoint,
        presentationIds,
      ).catch((error) => {
        logger.error({
          logCode: 'presentationuploader_component_auto_upload_error',
          extraInfo: { error },
        }, 'Presentation uploader catch error on auto upload');
      });
    });
  }

  handleConfirm() {
    const {
      selectedToBeNextCurrent,
      presentations: propPresentations,
      dispatchChangePresentationDownloadable,
      setPresentation,
      removePresentation,
      presentationEnabled,
    } = this.props;
    const { presentations } = this.state;

    if (!presentationEnabled) {
      this.setState(
        { presentations: [] },
        Session.setItem('showUploadPresentationView', false),
      );
      return null;
    }

    if (this.hasError || this.isConfirmDisabled()) {
      return null;
    }

    const selectedItem = this.getSelectedPresentation();
    if (!selectedItem?.uploadCompleted || selectedItem?.uploadInProgress) {
      return null;
    }

    presentations.forEach((item) => {
      if (item.uploadCompleted) {
        const didDownloadableStateChange = propPresentations.some(
          (p) => p.presentationId === item.presentationId && p.downloadable !== item.downloadable,
        );
        if (didDownloadableStateChange) {
          dispatchChangePresentationDownloadable(
            item.presentationId,
            item.downloadable,
            'Original',
          );
        }
      }
    });

    Session.setItem('showUploadPresentationView', false);
    const mergedPresentations = [...propPresentations];
    presentations.forEach((presentation) => {
      const existingIndex = mergedPresentations.findIndex(
        (item) => item.presentationId === presentation.presentationId
          || item.uploadTemporaryId === presentation.presentationId
          || item.uploadTemporaryId === presentation.uploadTemporaryId
          || (item.name === presentation.name && presentation.uploadCompleted),
      );
      if (existingIndex >= 0) {
        mergedPresentations[existingIndex] = {
          ...mergedPresentations[existingIndex],
          ...presentation,
        };
      } else {
        mergedPresentations.push(presentation);
      }
    });
    const resolvedId = resolvePresentationId(selectedItem, mergedPresentations);
    const resolvedSelected = mergedPresentations.find(
      (p) => p.presentationId === resolvedId,
    ) || (selectedItem && resolvedId ? { ...selectedItem, presentationId: resolvedId } : null);

    return Promise.resolve(setPresentation(resolvedId || ''))
      .then(() => Service.applyPresentationSelection(
        propPresentations,
        presentations,
        removePresentation,
      ))
      .then(() => {
        const hasError = presentations.some((p) => !!p.uploadErrorMsgKey);
        if (!hasError) {
          this.setState({
            disableActions: false,
          });
          this.syncExternalVideoForSelection(
            resolvedSelected,
            mergedPresentations,
            { delayMs: 0 },
          );
          return;
        }
        Session.setItem('showUploadPresentationView', true);
        this.setState({
          disableActions: true,
        }, () => {
          const newCurrent = presentations.find((p) => p?.current);
          if (newCurrent?.uploadErrorMsgKey) {
            this.handleCurrentChange(selectedToBeNextCurrent);
          }
        });
      })
      .catch((error) => {
        Session.setItem('showUploadPresentationView', true);
        logger.error({
          logCode: 'presentationuploader_component_save_error',
          extraInfo: { error },
        }, 'Presentation uploader catch error on confirm');
      });
  }

  handleDownloadableChange(item, fileStateType, downloadable) {
    const { dispatchChangePresentationDownloadable, presentations } = this.props;
    const presentationId = resolvePresentationId(item, presentations);

    dispatchChangePresentationDownloadable(
      presentationId,
      downloadable,
      fileStateType,
    );
  }

  handleDismiss() {
    const { presentations: propsPresentations } = this.props;
    const propPresentations = normalizePresentations(propsPresentations);

    const shouldDisableExportButtonForAllDocuments = propPresentations.some(
      (p) => !p?.uploadCompleted,
    );
    this.hasError = null;
    this.setState(
      {
        presentations: JSON.parse(JSON.stringify(propPresentations)),
        disableActions: false,
        shouldDisableExportButtonForAllDocuments,
      },
      Session.setItem('showUploadPresentationView', false),
    );
  }

  handleDownloadingOfPresentation(item, fileStateType) {
    const { exportPresentation } = this.props;

    exportPresentation(item.presentationId, fileStateType);
  }

  getPresentationsToShow() {
    const { presentations, presExporting } = this.state;

    return Array.from(presExporting)
      .map((id) => presentations.find((p) => p.presentationId === id))
      .filter((p) => p);
  }

  deepMergeUpdateFileKey(id, key, value) {
    const applyValue = (toUpdate) => update(toUpdate, { $merge: value });
    this.updateFileKey(id, key, applyValue, '$apply');
  }

  updateFileKey(id, key, value, operation = '$set') {
    this.setState(({ presentations: rawPresentations }) => {
      const presentations = normalizePresentations(rawPresentations);
      const fileIndex = !id ? -1 : presentations.findIndex((f) => (
        f?.presentationId === id
        || f?.uploadTemporaryId === id
      ));

      return fileIndex === -1 ? false : {
        presentations: update(presentations, {
          [fileIndex]: {
            $apply: (file) => update(file, {
              [key]: {
                [operation]: value,
              },
            }),
          },
        }),
      };
    });
  }

  renderExtraHint() {
    const {
      intl,
      fileSizeMax,
      filePagesMax,
    } = this.props;

    const options = {
      maxFileSize: fileSizeMax / 1000000,
      maxFilePages: filePagesMax,
    };

    return (
      <Styled.ExtraHint>
        {intl.formatMessage(intlMessages.extraHint, options)}
      </Styled.ExtraHint>
    );
  }

  renderPresentationList() {
    const { presentations: statePresentations } = this.state;
    const presentations = Array.isArray(statePresentations) ? statePresentations : [];
    const { intl } = this.props;

    this.hasError = null;

    let presentationsSorted = presentations;

    try {
      presentationsSorted = [...presentations]
        .filter(Boolean)
        .sort((a, b) => (a.uploadTimestamp ?? 0) - (b.uploadTimestamp ?? 0))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        .sort((a, b) => (b.totalPagesUploaded ?? 0) - (a.totalPagesUploaded ?? 0))
        .sort((a, b) => Number(b.uploadInProgress) - Number(a.uploadInProgress))
        .sort((a, b) => {
          const aUploadNotTriggeredYet = !a.uploadCompleted && (a.totalPagesUploaded ?? 0) === 0;
          const bUploadNotTriggeredYet = !b.uploadCompleted && (b.totalPagesUploaded ?? 0) === 0;
          return bUploadNotTriggeredYet - aUploadNotTriggeredYet;
        });
    } catch (error) {
      logger.error({
        logCode: 'presentationuploader_component_render_error',
        extraInfo: { error },
      }, 'Presentation uploader catch error on render presentation list');
    }

    return (
      <Styled.ListCard>
        <Styled.PresentationList role="table" aria-label={intl.formatMessage(intlMessages.currentLabel)}>
          <Styled.ListHeader role="row">
            <Styled.ListHeaderCell
              role="columnheader"
              $col="radio"
              aria-label={intl.formatMessage(intlMessages.setAsCurrentPresentation)}
            />
            <Styled.ListHeaderCell role="columnheader" $col="name">
              {intl.formatMessage(intlMessages.filename)}
            </Styled.ListHeaderCell>
            <Styled.ListHeaderCell role="columnheader" $col="badge" aria-hidden />
            <Styled.ListHeaderCell role="columnheader" $col="status">
              {intl.formatMessage(intlMessages.status)}
            </Styled.ListHeaderCell>
            <Styled.ListHeaderCell role="columnheader" $col="actions">
              {intl.formatMessage(intlMessages.actionsLabel)}
            </Styled.ListHeaderCell>
          </Styled.ListHeader>
          <Styled.FileList role="rowgroup">
            {unique(presentationsSorted, (p) => p.presentationId)
              .map((item) => this.renderPresentationItem(item))}
          </Styled.FileList>
        </Styled.PresentationList>
      </Styled.ListCard>
    );
  }

  renderDownloadableWithAnnotationsHint() {
    const {
      intl,
      allowDownloadWithAnnotations,
    } = this.props;

    return allowDownloadWithAnnotations ? (
      <Styled.ExportHint>
        {intl.formatMessage(intlMessages.exportHint)}
      </Styled.ExportHint>
    )
      : null;
  }

  renderPresentationItem(item) {
    if (!item?.presentationId) return null;

    const { disableActions, shouldDisableExportButtonForAllDocuments } = this.state;
    const {
      intl,
      isOpen,
      selectedToBeNextCurrent,
      allowDownloadOriginal,
      allowDownloadConverted,
      allowDownloadWithAnnotations,
      renderPresentationItemStatus,
    } = this.props;

    const pendingSelectionId = this.getPendingSelectionId();
    const isActualCurrent = isOpen && pendingSelectionId
      ? item.presentationId === pendingSelectionId
      : (item.current || item.presentationId === selectedToBeNextCurrent);
    const isUploading = !item.uploadCompleted;
    const { uploadInProgress } = item;
    const hasError = !!item.uploadErrorMsgKey || !!item.uploadErrorDetailsJson;
    const isProcessing = (isUploading || uploadInProgress) && !hasError;

    if (hasError) {
      this.hasError = true;
    }

    const Settings = getSettingsSingletonInstance();
    const { animations } = Settings.application;

    const { removable, downloadable } = item;

    const isExporting = item?.exportToChatStatus === 'RUNNING';

    const shouldDisableExportButton = (isExporting
      || !item.uploadCompleted
      || hasError
      || disableActions);

    const formattedDownloadLabel = isExporting
      ? intl.formatMessage(intlMessages.exporting)
      : intl.formatMessage(intlMessages.export);

    const formattedDownloadAriaLabel = `${formattedDownloadLabel} ${item.name}`;

    const disableExportDropdown = shouldDisableExportButtonForAllDocuments
    || shouldDisableExportButton;

    return (
      <Styled.PresentationItem
        key={item.presentationId}
        role="row"
        isCurrent={isActualCurrent}
        isNew={item.presentationId.indexOf(item.name) !== -1}
        uploading={isUploading}
        uploadInProgress={uploadInProgress}
        error={hasError}
        animated={isProcessing}
        animations={animations}
        data-test="presentationItem"
        data-skyroom-current={isActualCurrent ? 'true' : undefined}
        onClick={(event) => this.handlePresentationRowClick(event, item)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handlePresentationRowClick(event, item);
          }
        }}
        tabIndex={hasError ? -1 : 0}
        aria-selected={isActualCurrent}
      >
        <Styled.ColRadio role="cell">
          <Styled.SetCurrentAction>
            <Radio
              animations={animations}
              ariaLabel={`${intl.formatMessage(intlMessages.setAsCurrentPresentation)} ${item.name}`}
              checked={isActualCurrent}
              keyValue={item.presentationId}
              onChange={() => this.handleCurrentChange(item.presentationId)}
              disabled={hasError}
            />
          </Styled.SetCurrentAction>
        </Styled.ColRadio>
        <Styled.ColName role="cell">
          <Styled.FileNameCell>
            <span title={item.name}>{item.name}</span>
          </Styled.FileNameCell>
        </Styled.ColName>
        <Styled.ColBadge role="cell">
          {isActualCurrent ? (
            <Styled.CurrentBadgeWrap>
              <Styled.CurrentLabel>
                {intl.formatMessage(intlMessages.currentBadge)}
              </Styled.CurrentLabel>
            </Styled.CurrentBadgeWrap>
          ) : null}
        </Styled.ColBadge>
        <Styled.ColStatus role="cell">
          <Styled.FileStatusCell>
            {renderPresentationItemStatus(item, intl)}
          </Styled.FileStatusCell>
        </Styled.ColStatus>
        <Styled.ColActions role="cell">
          {hasError ? null : (
            <Styled.FileActionsCell notDownloadable={!allowDownloadOriginal}>
              {allowDownloadOriginal || allowDownloadWithAnnotations || allowDownloadConverted ? (
                <PresentationDownloadDropdown
                  disabled={disableExportDropdown}
                  data-test="exportPresentation"
                  aria-label={formattedDownloadAriaLabel}
                  color="primary"
                  isDownloadable={downloadable}
                  allowDownloadOriginal={allowDownloadOriginal}
                  allowDownloadConverted={allowDownloadConverted}
                  allowDownloadWithAnnotations={allowDownloadWithAnnotations}
                  handleDownloadableChange={this.handleDownloadableChange}
                  item={item}
                  closeModal={() => Session.setItem('showUploadPresentationView', false)}
                  handleDownloadingOfPresentation={(fileStateType) => this
                    .handleDownloadingOfPresentation(item, fileStateType)}
                />
              ) : null}
              {removable ? (
                <Styled.RemoveButton
                  disabled={disableActions}
                  label={intl.formatMessage(intlMessages.removePresentation)}
                  data-test="removePresentation"
                  aria-label={`${intl.formatMessage(intlMessages.removePresentation)} ${item.name}`}
                  size="sm"
                  icon="delete"
                  hideLabel
                  onClick={() => this.handleRemove(item)}
                  animations={animations}
                />
              ) : null}
            </Styled.FileActionsCell>
          )}
        </Styled.ColActions>
      </Styled.PresentationItem>
    );
  }

  renderDropzone() {
    const {
      intl,
      fileValidMimeTypes,
    } = this.props;
    const acceptList = buildAcceptList(fileValidMimeTypes);

    return this.hasError ? (
      <div>
        <Button
          color="danger"
          onClick={() => this.handleRemove(null, true)}
          label={intl.formatMessage(intlMessages.clearErrors)}
          aria-describedby="clearErrorDesc"
        />
        <div id="clearErrorDesc" style={{ display: 'none' }}>
          {intl.formatMessage(intlMessages.clearErrorsDesc)}
        </div>
      </div>
    ) : (
      <>
        <Styled.MobileFilePickerWrap>
          <Styled.MobileFileInput
            ref={this.fileInputRef}
            type="file"
            multiple
            accept={acceptList}
            data-test="fileUploadNativeInput"
            onChange={this.handleNativeFileInput}
          />
          <Styled.MobileFilePickerButton
            color="default"
            data-test="fileUploadNativeButton"
            onClick={() => this.fileInputRef.current?.click()}
            label={intl.formatMessage(intlMessages.browseFilesLabel)}
          />
        </Styled.MobileFilePickerWrap>
        {/* Until the Dropzone package has fixed the mime type hover validation, the rejectClassName
      prop is being remove to prevent the error styles from being applied to valid file types.
      Error handling is being done in the onDrop prop. */}
        <Styled.UploaderDropzone
          multiple
          activeClassName="dropzoneActive"
          accept={acceptList}
          disablepreview="true"
          data-test="fileUploadDropZone"
          onDrop={(files, files2) => this.handleFiledrop(files, files2, this, intl, intlMessages)}
        >
          <Styled.DropzoneIcon iconName="upload" />
          <Styled.DropzoneMessage>
            {intl.formatMessage(intlMessages.dropzoneLabel)}
            &nbsp;
            <Styled.DropzoneLink>
              {intl.formatMessage(intlMessages.browseFilesLabel)}
            </Styled.DropzoneLink>
          </Styled.DropzoneMessage>
        </Styled.UploaderDropzone>
      </>
    );
  }

  renderExternalUpload() {
    const { externalUploadData, intl } = this.props;

    const {
      presentationUploadExternalDescription, presentationUploadExternalUrl,
    } = externalUploadData;

    if (!presentationUploadExternalDescription || !presentationUploadExternalUrl) return null;

    return (
      <Styled.ExternalUpload>
        <div>
          <Styled.ExternalUploadTitle>
            {intl.formatMessage(intlMessages.externalUploadTitle)}
          </Styled.ExternalUploadTitle>

          <p>{presentationUploadExternalDescription}</p>
        </div>
        <Styled.ExternalUploadButton
          color="default"
          onClick={() => window.open(`${presentationUploadExternalUrl}`)}
          label={intl.formatMessage(intlMessages.externalUploadLabel)}
          aria-describedby={intl.formatMessage(intlMessages.externalUploadLabel)}
        />
      </Styled.ExternalUpload>
    );
  }

  render() {
    const {
      isOpen,
      isPresenter,
      intl,
      fileUploadConstraintsHint,
      allowExternalVideo,
      isSharingVideo,
      startExternalVideo,
      stopExternalVideo,
    } = this.props;
    if (!isPresenter) return null;

    const confirmLabel = intl.formatMessage(intlMessages.confirmLabel);

    if (!isOpen) return null;

    return (
      <ModalFullscreen
        dataTest="managePresentationsModal"
        title={intl.formatMessage(intlMessages.title)}
        isOpen={isOpen}
        priority="medium"
        shouldCloseOnOverlayClick
        onRequestClose={this.handleDismiss}
        confirm={{
          label: confirmLabel,
          callback: () => this.handleConfirm(),
          disabled: !!this.hasError || this.isConfirmDisabled(),
        }}
        dismiss={{
          label: intl.formatMessage(intlMessages.dismissLabel),
          callback: this.handleDismiss,
          disabled: false,
        }}
      >
        <Styled.ModalBody data-test="managePresentationsModalBody">
          <Styled.HintBanner>
            <Styled.ModalHint>
              {intl.formatMessage(intlMessages.message)}
              {fileUploadConstraintsHint ? this.renderExtraHint() : null}
            </Styled.ModalHint>
          </Styled.HintBanner>
          <Styled.ListSection data-skyroom="presentation-upload-list">
            {this.renderPresentationList()}
          </Styled.ListSection>
          <Styled.BottomPanels>
            {startExternalVideo ? (
              <OnlineVideoSection
                allowExternalVideo={allowExternalVideo}
                isSharingVideo={isSharingVideo}
                startExternalVideo={startExternalVideo}
                stopExternalVideo={stopExternalVideo}
              />
            ) : null}
            <Styled.DropzoneSection>
              {this.renderDropzone()}
            </Styled.DropzoneSection>
            {this.renderExternalUpload()}
          </Styled.BottomPanels>
        </Styled.ModalBody>
      </ModalFullscreen>
    );
  }
}

PresentationUploader.propTypes = propTypes;
PresentationUploader.defaultProps = defaultProps;

export default injectIntl(PresentationUploader);
