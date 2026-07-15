import Auth from '/imports/ui/services/auth';
import logger from '/imports/startup/client/logger';
import { partition } from '/imports/utils/array-utils';
import update from 'immutability-helper';
import { v4 as uuid } from 'uuid';
import { uniqueId } from '/imports/utils/string-utils';
import { notify } from '/imports/ui/services/notification';
import apolloContextHolder from '/imports/ui/core/graphql/apolloContextHolder/apolloContextHolder';
import { getPresentationUploadToken } from './queries';
import { requestPresentationUploadTokenMutation } from './mutation';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import Session from '/imports/ui/services/storage/in-memory';
import {
  isFileAccepted,
  isMediaExtension,
  normalizeUploadFile,
} from './fileTypes';

const TOKEN_TIMEOUT = 15000;
const POD_ID = 'DEFAULT_PRESENTATION_POD';

// fetch doesn't support progress. So we use xhr which support progress.
const futch = (url, opts = {}, onProgress) => new Promise((res, rej) => {
  const xhr = new XMLHttpRequest();

  xhr.open(opts.method || 'get', url);

  Object.keys(opts.headers || {})
    .forEach((k) => xhr.setRequestHeader(k, opts.headers[k]));

  xhr.onload = (e) => {
    if (e.target.status !== 200) {
      return rej(new Error({ code: e.target.status, message: e.target.statusText }));
    }

    const responseText = (e.target.responseText || '').trim();
    if (responseText === 'upload-failed') {
      return rej(new Error({ code: 'upload-failed', message: 'upload-failed' }));
    }

    return res(responseText);
  };
  xhr.onerror = rej;
  if (xhr.upload && onProgress) {
    xhr.upload.addEventListener('progress', onProgress, false);
  }
  xhr.send(opts.body);
});

const requestPresentationUploadToken = (
  temporaryPresentationId,
  meetingId,
  filename,
) => new Promise((resolve, reject) => {
  const client = apolloContextHolder.getClient();
  client.mutate({
    mutation: requestPresentationUploadTokenMutation,
    variables: {
      podId: POD_ID,
      filename,
      uploadTemporaryId: temporaryPresentationId,
    },
  });

  const timeout = setTimeout(() => {
    reject(new Error({ code: 408, message: 'requestPresentationUploadToken timeout' }));
  }, TOKEN_TIMEOUT);

  const getData = (n = 0) => {
    if (n > 10) return;
    let recursiveTimeout = null;
    client.query({
      query: getPresentationUploadToken,
      variables: {
        uploadTemporaryId: temporaryPresentationId,
      },
      fetchPolicy: 'network-only',
    }).then((result) => {
      if (result.data.pres_presentation_uploadToken.length > 0) {
        clearTimeout(recursiveTimeout);
        clearTimeout(timeout);
        const tokenEntry = result.data.pres_presentation_uploadToken[0];
        resolve({
          uploadToken: tokenEntry.uploadToken,
          presentationId: tokenEntry.presentationId,
        });
      }
    });
    recursiveTimeout = setTimeout(() => {
      getData(n + 1);
    }, 1000);
  };
  setTimeout(getData, 100);
});

const uploadAndConvertPresentation = (
  filename,
  temporaryPresentationId,
  file,
  downloadable,
  meetingId,
  endpoint,
  onUpload,
  onProgress,
  onConversion,
  onServerPresentationId,
  current,
) => {
  if (!file) return Promise.resolve();

  const uploadFile = normalizeUploadFile(file);

  const data = new FormData();
  data.append('fileUpload', uploadFile);
  data.append('conference', meetingId);
  data.append('room', meetingId);
  data.append('temporaryPresentationId', temporaryPresentationId);

  // TODO: Currently the uploader is not related to a POD so the id is fixed to the default
  data.append('pod_id', POD_ID);

  data.append('is_downloadable', downloadable);
  data.append('current', current);

  const opts = {
    method: 'POST',
    body: data,
  };

  return requestPresentationUploadToken(temporaryPresentationId, meetingId, filename)
    .then(({ uploadToken, presentationId }) => {
      if (presentationId && typeof onServerPresentationId === 'function') {
        onServerPresentationId(presentationId);
      }
      return futch(endpoint.replace('upload', `${uploadToken}/upload`), opts, onProgress);
    })
    // Trap the error so we can have parallel upload
    .catch((error) => {
      logger.debug({
        logCode: 'presentation_uploader_service',
        extraInfo: {
          error,
        },
      }, 'Generic presentation upload exception catcher');
      onUpload({ error: true, done: true, status: error.code });
      return Promise.resolve();
    });
};

const uploadAndConvertPresentations = (
  presentationsToUpload,
  meetingId,
  uploadEndpoint,
) => Promise.all(presentationsToUpload.map((p) => uploadAndConvertPresentation(
  p.name,
  p.presentationId, p.file, p.downloadable, meetingId, uploadEndpoint,
  p.onUpload, p.onProgress, p.onConversion, p.onServerPresentationId, p.current,
)));

const removePresentations = (
  presentationsToRemove,
  removePresentation,
) => Promise.all(presentationsToRemove.map((p) => removePresentation(p.presentationId)));

const isPresentationEligibleForUpload = (p) => {
  if (!p?.file || p.uploadCompleted) return false;
  if (p.upload?.done) return false;
  // Keep uploading while the local File handle exists, even if GraphQL already
  // marked uploadInProgress from the upload-token handshake.
  return true;
};

const getPresentationsPendingUpload = (presentations, presentationIds = null) => {
  const pending = presentations.filter(isPresentationEligibleForUpload);

  if (presentationIds?.length) {
    return pending.filter((p) => presentationIds.includes(p.presentationId));
  }

  return pending;
};

const uploadPendingPresentations = (
  presentations = [],
  uploadEndpoint,
  presentationIds = null,
) => {
  const presentationsToUpload = getPresentationsPendingUpload(
    presentations,
    presentationIds,
  ).map((p) => ({
    ...p,
    // Auto-upload must not activate the presentation; Confirm sets current.
    current: false,
  }));

  if (!presentationsToUpload.length) return Promise.resolve();

  return uploadAndConvertPresentations(
    presentationsToUpload,
    Auth.meetingID,
    uploadEndpoint,
  ).then((results) => {
    results.forEach((result, i) => {
      if (result?.presentationId) {
        presentationsToUpload[i].onDone(result.presentationId);
      }
    });
    return results;
  });
};

const persistPresentationChanges = (
  oldState,
  newState,
  uploadEndpoint,
  setPresentation,
  removePresentation,
) => {
  const presentationsToUpload = getPresentationsPendingUpload(newState).map((p) => ({
    ...p,
    current: p.current ?? false,
  }));
  const presentationsToRemove = oldState.filter((p) => !newState.find(
    (u) => u.presentationId === p.presentationId,
  ));

  let currentPresentation = newState.find((p) => p?.current);
  return uploadAndConvertPresentations(presentationsToUpload, Auth.meetingID, uploadEndpoint)
    .then((presentations) => {
      if (!presentations.length && !currentPresentation) return Promise.resolve();
      // Update the presentation with their new ids
      presentations.forEach((p, i) => {
        if (p === undefined) return;
        presentationsToUpload[i].onDone(p.presentationId);
      });

      return Promise.resolve(presentations);
    })
    .then((presentations) => {
      if (currentPresentation === undefined) {
        setPresentation('');
        return Promise.resolve();
      }

      // If its a newly uploaded presentation we need to get it from promise result
      if (currentPresentation?.uploadInProgress) {
        const currentIndex = presentationsToUpload.findIndex((p) => p === currentPresentation);
        currentPresentation = presentations[currentIndex];
      }

      // skip setting as current if error happened
      if (currentPresentation?.conversion?.error) {
        return Promise.resolve();
      }

      return setPresentation(currentPresentation?.presentationId);
    })
    .then(removePresentations.bind(null, presentationsToRemove, removePresentation));
};

const presentationExistsInState = (presentation, state) => state.some(
  (u) => u.presentationId === presentation.presentationId
    || (u.uploadTemporaryId
      && presentation.uploadTemporaryId
      && u.uploadTemporaryId === presentation.uploadTemporaryId)
    || (presentation.uploadTemporaryId
      && u.presentationId === presentation.uploadTemporaryId),
);

const applyPresentationSelection = (
  oldState,
  newState,
  removePresentation,
) => {
  const presentationsToRemove = oldState.filter(
    (p) => !presentationExistsInState(p, newState),
  );

  return removePresentations(presentationsToRemove, removePresentation);
};

const handleSavePresentation = (
  presentations = [],
  isFromPresentationUploaderInterface = true,
  newPres = {},
  currentPresentations = [],
  setPresentation,
  removePresentation,
  isPresentationEnabled,
) => {
  if (!isPresentationEnabled) {
    return null;
  }
  const PRESENTATION_CONFIG = window.meetingClientSettings.public.presentation;

  let updatedPresentations = [...presentations];

  if (!isFromPresentationUploaderInterface) {
    if (updatedPresentations.length === 0) {
      updatedPresentations = [...currentPresentations];
    }
    updatedPresentations = updatedPresentations.map((p) => update(p, {
      current: {
        $set: false,
      },
    }));
    const updatedNewPres = { ...newPres, current: true }; // Avoid mutating newPres
    updatedPresentations.push(updatedNewPres);
  }
  return persistPresentationChanges(
    currentPresentations,
    updatedPresentations,
    PRESENTATION_CONFIG.uploadEndpoint,
    setPresentation,
    removePresentation,
  );
};

const useExternalUploadData = () => {
  const { data: meeting } = useMeeting((m) => ({
    presentationUploadExternalDescription: m.presentationUploadExternalDescription,
    presentationUploadExternalUrl: m.presentationUploadExternalUrl,
  }));

  const {
    presentationUploadExternalDescription,
    presentationUploadExternalUrl,
  } = meeting || {};

  return {
    presentationUploadExternalDescription,
    presentationUploadExternalUrl,
  };
};

function handleFiledrop(files, files2, that, intl, intlMessages) {
  if (that) {
    const { fileValidMimeTypes } = that.props;
    const { toUploadCount } = that.state;
    const [accepted, rejected] = partition(
      files.concat(files2), (f) => isFileAccepted(f, fileValidMimeTypes),
    );

    const presentationsToUpload = accepted.map((file) => {
      const normalizedFile = normalizeUploadFile(file);
      const id = uniqueId(uuid());
      const isMedia = isMediaExtension(normalizedFile.name);

      return {
        file: normalizedFile,
        downloadable: isMedia,
        isRemovable: true,
        presentationId: id,
        name: file.name,
        isMedia,
        current: false,
        conversion: { done: false, error: false },
        upload: { done: false, error: false, progress: 0 },
        exportation: { error: false },
        onProgress: (event) => {
          if (!event.lengthComputable) {
            that.deepMergeUpdateFileKey(id, 'upload', {
              progress: 100,
              done: true,
            });

            return;
          }

          that.deepMergeUpdateFileKey(id, 'upload', {
            progress: (event.loaded / event.total) * 100,
            done: event.loaded === event.total,
          });
        },
        onConversion: (conversion) => {
          that.deepMergeUpdateFileKey(id, 'conversion', conversion);
        },
        onUpload: (upload) => {
          that.deepMergeUpdateFileKey(id, 'upload', upload);
        },
        onServerPresentationId: (serverPresentationId) => {
          if (typeof that.assignServerPresentationId === 'function') {
            that.assignServerPresentationId(id, serverPresentationId);
          }
        },
        onDone: (newId) => {
          if (typeof that.assignServerPresentationId === 'function') {
            that.assignServerPresentationId(id, newId);
          }
        },
      };
    });

    const uploadIds = presentationsToUpload.map((p) => p.presentationId);
    const firstUploadId = uploadIds[0];
    const PRESENTATION_CONFIG = window.meetingClientSettings.public.presentation;

    that.setState(({ presentations: rawPresentations }) => {
      const presentations = Array.isArray(rawPresentations)
        ? rawPresentations.filter(Boolean)
        : [];
      const mergedPresentations = presentations.concat(presentationsToUpload).map((p) => ({
        ...p,
        current: p.presentationId === firstUploadId,
        uploadStarted: uploadIds.includes(p.presentationId) ? true : p.uploadStarted,
      }));

      return {
        presentations: mergedPresentations,
        toUploadCount: (toUploadCount + presentationsToUpload.length),
        shouldDisableExportButtonForAllDocuments: true,
      };
    }, () => {
      if (firstUploadId) {
        Session.setItem('selectedToBeNextCurrent', firstUploadId);
      }

      uploadPendingPresentations(
        that.state.presentations,
        PRESENTATION_CONFIG.uploadEndpoint,
        uploadIds,
      ).catch((error) => {
        logger.error({
          logCode: 'presentation_uploader_service_auto_upload_error',
          extraInfo: { error, uploadIds },
        }, 'Presentation uploader auto upload failed after file drop');
      });
    });

    if (rejected.length > 0) {
      notify(intl.formatMessage(intlMessages.rejectedError), 'error');
    }
  }
}

export default {
  handleSavePresentation,
  applyPresentationSelection,
  persistPresentationChanges,
  requestPresentationUploadToken,
  uploadAndConvertPresentation,
  uploadPendingPresentations,
  handleFiledrop,
  useExternalUploadData,
  isMediaExtension,
};
