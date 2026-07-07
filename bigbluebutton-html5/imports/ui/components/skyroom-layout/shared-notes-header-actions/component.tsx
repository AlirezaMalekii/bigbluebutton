import React, { useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { PanelOptionsButton } from '/imports/ui/components/skyroom-layout/panel-chrome/styles';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  PRESENTATIONS_SUBSCRIPTION,
  PresentationsSubscriptionResponse,
} from '/imports/ui/components/whiteboard/queries';
import NotesDropdownService from '/imports/ui/components/notes/notes-dropdown/service';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import Styled from './styles';

const DEBOUNCE_TIMEOUT = 15000;

const intlMessages = defineMessages({
  convertAndUploadLabel: {
    id: 'app.notes.notesDropdown.covertAndUpload',
    description: 'Export shared notes as a PDF and upload to the main room',
  },
  exportAsPDFLabel: {
    id: 'app.notes.notesDropdown.exportAsPDF',
    description: 'Export shared notes as a PDF file',
  },
  pinNotes: {
    id: 'app.notes.notesDropdown.pinNotes',
    description: 'Label for pin shared notes button',
  },
});

interface SkyroomSharedNotesHeaderActionsProps {
  padId: string;
  isEtherpadSharedNotes: boolean;
  presentationEnabled: boolean;
  handlePinSharedNotes: (pinned: boolean) => void;
}

const SkyroomSharedNotesHeaderActions: React.FC<SkyroomSharedNotesHeaderActionsProps> = ({
  padId,
  isEtherpadSharedNotes,
  presentationEnabled,
  handlePinSharedNotes,
}) => {
  const intl = useIntl();
  const [converterButtonDisabled, setConverterButtonDisabled] = useState(false);
  const NOTES_IS_PINNABLE = window.meetingClientSettings.public.notes.pinnable;

  const { data: currentUserData } = useCurrentUser((user) => ({
    presenter: user.presenter,
  }));
  const amIPresenter = !!currentUserData?.presenter;

  const { data: presentationData } = useDeduplicatedSubscription<PresentationsSubscriptionResponse>(
    PRESENTATIONS_SUBSCRIPTION,
  );
  const presentations = presentationData?.pres_presentation || [];

  const actions = useMemo(() => {
    const items: Array<{
      key: string;
      icon: string;
      dataTest: string;
      label: string;
      disabled?: boolean;
      onClick: () => void;
    }> = [];

    if (amIPresenter) {
      items.push({
        key: 'move-notes-to-whiteboard',
        icon: 'upload',
        dataTest: 'moveNotesToWhiteboard',
        label: intl.formatMessage(intlMessages.convertAndUploadLabel),
        disabled: converterButtonDisabled,
        onClick: () => {
          setConverterButtonDisabled(true);
          setTimeout(() => setConverterButtonDisabled(false), DEBOUNCE_TIMEOUT);
          NotesDropdownService.convertAndUpload(
            presentations.filter((p) => p && p.uploadCompleted),
            padId,
            isEtherpadSharedNotes,
            presentationEnabled,
          );
        },
      });
    }

    if (!isEtherpadSharedNotes) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionToken = urlParams.get('sessionToken');
      const hocuspocusServerHostname = window.meetingClientSettings.public.sharedNotes.serverHostname
        || window.location.hostname;

      items.push({
        key: 'export-notes-pdf',
        icon: 'download',
        dataTest: 'exportNotesAsPDF',
        label: intl.formatMessage(intlMessages.exportAsPDFLabel),
        onClick: () => {
          window.open(`https://${hocuspocusServerHostname}/hocuspocus/api/documents/${padId}/export/pdf?sessionToken=${sessionToken}`);
        },
      });
    }

    if (amIPresenter && NOTES_IS_PINNABLE) {
      items.push({
        key: 'pin-notes',
        icon: 'presentation',
        dataTest: 'pinNotes',
        label: intl.formatMessage(intlMessages.pinNotes),
        onClick: () => handlePinSharedNotes(true),
      });
    }

    return items;
  }, [
    amIPresenter,
    converterButtonDisabled,
    handlePinSharedNotes,
    intl,
    isEtherpadSharedNotes,
    NOTES_IS_PINNABLE,
    padId,
    presentationEnabled,
    presentations,
  ]);

  if (!padId || actions.length === 0) return null;

  return (
    <Styled.OptionsGroup data-test="sharedNotesHeaderOptions">
      {actions.map((action) => (
        <PanelOptionsButton
          key={action.key}
          data-test={action.dataTest}
          icon={action.icon}
          label={action.label}
          aria-label={action.label}
          color="light"
          hideLabel
          size="sm"
          circle={false}
          disabled={action.disabled}
          onClick={action.onClick}
        />
      ))}
    </Styled.OptionsGroup>
  );
};

export default SkyroomSharedNotesHeaderActions;
