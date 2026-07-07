import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { dismissSkyroomSharedNotes } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomSharedNotesHeaderActions from '../shared-notes-header-actions/component';
import Styled from './styles';

const intlMessages = defineMessages({
  title: {
    id: 'app.notes.title',
    description: 'Title for the shared notes',
  },
});

interface SkyroomSharedNotesHeaderProps {
  padId?: string;
  isEtherpadSharedNotes?: boolean;
  presentationEnabled?: boolean;
  handlePinSharedNotes: (pinned: boolean) => void;
}

const SkyroomSharedNotesHeader: React.FC<SkyroomSharedNotesHeaderProps> = ({
  padId,
  isEtherpadSharedNotes,
  presentationEnabled = true,
  handlePinSharedNotes,
}) => {
  const intl = useIntl();
  const title = intl.formatMessage(intlMessages.title);

  return (
    <Styled.Container data-test="sharedNotesPanelTitle">
      <Styled.SmallTitle>
        <Styled.TitleButton
          type="button"
          data-test="hideSharedNotes"
          aria-label={title}
          onClick={() => dismissSkyroomSharedNotes()}
        >
          <Styled.TitleText>{title}</Styled.TitleText>
        </Styled.TitleButton>
      </Styled.SmallTitle>
      {padId ? (
        <SkyroomSharedNotesHeaderActions
          padId={padId}
          isEtherpadSharedNotes={Boolean(isEtherpadSharedNotes)}
          handlePinSharedNotes={handlePinSharedNotes}
          presentationEnabled={presentationEnabled}
        />
      ) : null}
    </Styled.Container>
  );
};

export default SkyroomSharedNotesHeader;
