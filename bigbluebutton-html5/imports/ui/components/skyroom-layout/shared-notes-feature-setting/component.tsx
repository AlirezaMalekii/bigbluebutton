import React, { useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Toggle from '/imports/ui/components/common/switch/component';
import Styled from '/imports/ui/components/settings/submenus/application/styles';
import { useIsSharedNotesEnabled } from '/imports/ui/services/features';
import {
  getSkyroomNotesFeatureVisible,
  setSkyroomNotesFeatureVisible,
  subscribeSkyroomNotesFeatureVisible,
} from '../notes-panel-state';
import { broadcastSkyroomNotesFeatureVisible, broadcastSkyroomNotesGlobalOpen } from '../notes-panel-sync/useSkyroomNotesPanelSync';
import { isSkyroomColumnLayout } from '../panel-toggles';

const intlMessages = defineMessages({
  sectionTitle: {
    id: 'app.skyroom.settings.sharedNotesSectionTitle',
    description: 'Skyroom moderator settings section for shared notes',
    defaultMessage: 'Meeting features',
  },
  sharedNotesLabel: {
    id: 'app.skyroom.settings.sharedNotesLabel',
    description: 'Toggle to show shared notes in the meeting UI',
    defaultMessage: 'Shared notes',
  },
});

interface SkyroomSharedNotesFeatureSettingProps {
  isModerator: boolean;
  displaySettingsStatus: (status: boolean, textOnly?: boolean) => string | React.ReactNode;
  showToggleLabel?: boolean;
}

const SkyroomSharedNotesFeatureSetting: React.FC<SkyroomSharedNotesFeatureSettingProps> = ({
  isModerator,
  displaySettingsStatus,
  showToggleLabel = false,
}) => {
  const intl = useIntl();
  const isSharedNotesCapable = useIsSharedNotesEnabled();
  const [featureVisible, setFeatureVisible] = useState(getSkyroomNotesFeatureVisible);

  useEffect(() => subscribeSkyroomNotesFeatureVisible(setFeatureVisible), []);

  const handleToggle = useCallback(() => {
    const next = !getSkyroomNotesFeatureVisible();
    setSkyroomNotesFeatureVisible(next);
    broadcastSkyroomNotesFeatureVisible(next);
    if (!next) {
      broadcastSkyroomNotesGlobalOpen(false);
    }
  }, []);

  if (!isSkyroomColumnLayout() || !isModerator || !isSharedNotesCapable) {
    return null;
  }

  return (
    <>
      <Styled.Title>
        {intl.formatMessage(intlMessages.sectionTitle)}
      </Styled.Title>
      <Styled.Form>
        <Styled.Row>
          <Styled.Col aria-hidden="true">
            <Styled.FormElement>
              <Styled.Label>
                {intl.formatMessage(intlMessages.sharedNotesLabel)}
              </Styled.Label>
            </Styled.FormElement>
          </Styled.Col>
          <Styled.Col>
            <Styled.FormElementRight>
              {displaySettingsStatus(featureVisible)}
              <Toggle
                icons={false}
                checked={featureVisible}
                onChange={handleToggle}
                ariaLabel={`${intl.formatMessage(intlMessages.sharedNotesLabel)} - ${displaySettingsStatus(featureVisible, true)}`}
                showToggleLabel={showToggleLabel}
                data-test="skyroomSharedNotesFeatureToggle"
              />
            </Styled.FormElementRight>
          </Styled.Col>
        </Styled.Row>
      </Styled.Form>
      <Styled.Separator />
    </>
  );
};

export default SkyroomSharedNotesFeatureSetting;
