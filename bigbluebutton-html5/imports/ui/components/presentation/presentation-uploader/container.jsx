import React from 'react';
import ErrorBoundary from '/imports/ui/components/common/error-boundary/component';
import FallbackModal from '/imports/ui/components/common/fallback-errors/fallback-modal/component';
import { useMutation } from '@apollo/client';
import Service from './service';
import PresUploaderToast from '/imports/ui/components/presentation/presentation-toast/presentation-uploader-toast/component';
import PresentationUploader from './component';
import {
  useIsPresentationEnabled,
  useIsDownloadPresentationOriginalFileEnabled,
  useIsDownloadPresentationConvertedToPdfEnabled,
  useIsDownloadPresentationWithAnnotationsEnabled,
} from '/imports/ui/services/features';
import {
  PRESENTATIONS_SUBSCRIPTION,
} from '/imports/ui/components/whiteboard/queries';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  PRESENTATION_SET_DOWNLOADABLE,
  PRESENTATION_EXPORT,
  PRESENTATION_SET_CURRENT,
  PRESENTATION_REMOVE,
} from '../mutations';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import {
  EXTERNAL_VIDEO_START,
  EXTERNAL_VIDEO_STOP,
} from '/imports/ui/components/external-video-player/mutations';

const PresentationUploaderContainer = (props) => {
  const { data: currentUserData } = useCurrentUser((user) => ({
    presenter: user.presenter,
  }));
  const userIsPresenter = currentUserData?.presenter;

  const { data: presentationData } = useDeduplicatedSubscription(PRESENTATIONS_SUBSCRIPTION);
  const presentations = (presentationData?.pres_presentation || []).filter(Boolean);
  const currentPresentation = presentations.find((p) => p?.current)?.presentationId || '';

  const [presentationSetDownloadable] = useMutation(PRESENTATION_SET_DOWNLOADABLE);
  const [presentationExport] = useMutation(PRESENTATION_EXPORT);
  const [presentationSetCurrent] = useMutation(PRESENTATION_SET_CURRENT);
  const [presentationRemove] = useMutation(PRESENTATION_REMOVE);
  const [startExternalVideoMutation] = useMutation(EXTERNAL_VIDEO_START);
  const [stopExternalVideoMutation] = useMutation(EXTERNAL_VIDEO_STOP);

  const exportPresentation = (presentationId, fileStateType) => {
    presentationExport({
      variables: {
        presentationId,
        fileStateType,
      },
    });
  };

  const dispatchChangePresentationDownloadable = (presentationId, downloadable, fileStateType) => {
    presentationSetDownloadable({
      variables: {
        presentationId,
        downloadable,
        fileStateType,
      },
    });
  };

  const setPresentation = (presentationId) => (
    presentationSetCurrent({ variables: { presentationId } })
  );

  const removePresentation = (presentationId) => (
    presentationRemove({ variables: { presentationId } })
  );

  const startExternalVideo = (externalVideoUrl) => {
    if (!externalVideoUrl) return;
    startExternalVideoMutation({ variables: { externalVideoUrl } });
  };

  const stopExternalVideo = () => {
    stopExternalVideoMutation();
  };

  const presentationEnabled = useIsPresentationEnabled();
  const allowDownloadOriginal = useIsDownloadPresentationOriginalFileEnabled();
  const allowDownloadConverted = useIsDownloadPresentationConvertedToPdfEnabled();
  const allowDownloadWithAnnotations = useIsDownloadPresentationWithAnnotationsEnabled();
  const externalUploadData = Service.useExternalUploadData();
  const PRESENTATION_CONFIG = window.meetingClientSettings.public.presentation;
  const isOpen = (useStorageKey('showUploadPresentationView') || false) && presentationEnabled;
  const selectedToBeNextCurrent = useStorageKey('selectedToBeNextCurrent') || null;

  return userIsPresenter && (
    <ErrorBoundary Fallback={FallbackModal}>
      <PresentationUploader
        isPresenter={userIsPresenter}
        presentations={presentations}
        currentPresentation={currentPresentation}
        exportPresentation={exportPresentation}
        dispatchChangePresentationDownloadable={dispatchChangePresentationDownloadable}
        setPresentation={setPresentation}
        removePresentation={removePresentation}
        startExternalVideo={startExternalVideo}
        stopExternalVideo={stopExternalVideo}
        isOpen={isOpen}
        selectedToBeNextCurrent={selectedToBeNextCurrent}
        fileUploadConstraintsHint={PRESENTATION_CONFIG.fileUploadConstraintsHint}
        fileSizeMax={PRESENTATION_CONFIG.mirroredFromBBBCore.uploadSizeMax}
        filePagesMax={PRESENTATION_CONFIG.mirroredFromBBBCore.uploadPagesMax}
        fileValidMimeTypes={PRESENTATION_CONFIG.uploadValidMimeTypes}
        allowDownloadOriginal={allowDownloadOriginal}
        allowDownloadConverted={allowDownloadConverted}
        allowDownloadWithAnnotations={allowDownloadWithAnnotations}
        presentationEnabled={presentationEnabled}
        externalUploadData={externalUploadData}
        handleSave={Service.handleSavePresentation}
        handleUploadPending={Service.uploadPendingPresentations}
        handleDismissToast={PresUploaderToast.handleDismissToast}
        renderToastList={Service.renderToastList}
        renderPresentationItemStatus={PresUploaderToast.renderPresentationItemStatus}
        handleFiledrop={Service.handleFiledrop}
        dispatchDisableDownloadable={Service.dispatchDisableDownloadable}
        dispatchEnableDownloadable={Service.dispatchEnableDownloadable}
        {...props}
      />
    </ErrorBoundary>
  );
};

export default PresentationUploaderContainer;
