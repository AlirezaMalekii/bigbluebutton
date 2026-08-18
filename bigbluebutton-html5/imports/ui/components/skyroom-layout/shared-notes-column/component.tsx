import React, { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import NotesContainer from '/imports/ui/components/notes/component';
import useSkyroomSharedNotesUiVisible from '../useSkyroomSharedNotesUiVisible';
import { GET_PAD_ID, GetPadIdQueryResponse } from '/imports/ui/components/notes/queries';
import { PIN_NOTES } from '/imports/ui/components/notes/mutations';
import { isSkyroomNotesOpen } from '/imports/ui/components/skyroom-layout/panel-toggles';
import { subscribeSkyroomNotesOpen } from '/imports/ui/components/skyroom-layout/notes-panel-state';
import SkyroomSpinner from '/imports/ui/components/skyroom-layout/loading/SkyroomSpinner';
import SkyroomSharedNotesHeader from '../shared-notes-header/component';
import { ACTIONS } from '/imports/ui/components/layout/enums';
import { layoutDispatch } from '/imports/ui/components/layout/context';
import { EXTERNAL_VIDEO_STOP } from '/imports/ui/components/external-video-player/mutations';
import {
  screenshareHasEnded,
  useIsScreenBroadcasting,
} from '/imports/ui/components/screenshare/service';
import { useIsPresentationEnabled } from '/imports/ui/services/features';
import Styled from './styles';

const SkyroomSharedNotesColumn: React.FC = () => {
  const [notesOpen, setNotesOpen] = useState(isSkyroomNotesOpen);
  const showNotes = useSkyroomSharedNotesUiVisible();
  const NOTES_CONFIG = window.meetingClientSettings?.public?.notes;
  const { data: padIdData, loading: padLoading } = useQuery<GetPadIdQueryResponse>(
    GET_PAD_ID,
    { variables: { externalId: NOTES_CONFIG?.id }, skip: !showNotes },
  );
  const padId = padIdData?.sharedNotes?.[0]?.padId ?? '';
  const sharedNotesEditor = padIdData?.sharedNotes?.[0]?.sharedNotesEditor ?? '';
  const padConfigured = Boolean(padId && sharedNotesEditor);
  const isEtherpadSharedNotes = sharedNotesEditor === 'etherpad';

  const layoutContextDispatch = layoutDispatch();
  const [pinSharedNotes] = useMutation(PIN_NOTES);
  const [stopExternalVideoShare] = useMutation(EXTERNAL_VIDEO_STOP);
  const isScreenBroadcasting = useIsScreenBroadcasting();
  const isPresentationEnabled = useIsPresentationEnabled();
  const handlePinSharedNotes = useCallback((pinned: boolean) => {
    if (pinned) {
      stopExternalVideoShare();
      if (isScreenBroadcasting) screenshareHasEnded();
    }
    pinSharedNotes({ variables: { pinned } });
    layoutContextDispatch({
      type: ACTIONS.SET_NOTES_IS_PINNED,
      value: pinned,
    });
  }, [
    isScreenBroadcasting,
    layoutContextDispatch,
    pinSharedNotes,
    stopExternalVideoShare,
  ]);

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);

  if (!showNotes || !notesOpen) return null;

  return (
    <Styled.Column
      id="skyroom-notes-column"
      data-test="sharedNotesPanel"
      data-skyroom-notes-column="true"
    >
      <SkyroomSharedNotesHeader
        padId={padId}
        isEtherpadSharedNotes={isEtherpadSharedNotes}
        presentationEnabled={isPresentationEnabled}
        handlePinSharedNotes={handlePinSharedNotes}
      />
      <Styled.Body>
        {padLoading || !padConfigured ? (
          <Styled.LoadingWrap>
            <SkyroomSpinner size="md" />
          </Styled.LoadingWrap>
        ) : (
          <NotesContainer
            isToSharedNotesBeShow
            skyroomColumn
          />
        )}
      </Styled.Body>
    </Styled.Column>
  );
};

export default SkyroomSharedNotesColumn;
