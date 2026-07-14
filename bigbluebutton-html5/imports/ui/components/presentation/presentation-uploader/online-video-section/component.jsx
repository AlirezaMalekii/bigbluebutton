import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import Session from '/imports/ui/services/storage/in-memory';
import {
  isDirectVideoUrlValid,
  normalizeVideoUrl,
  parseAparatEmbed,
} from '/imports/ui/components/external-video-player/external-video-utils';
import Styled from './styles';

const intlMessages = defineMessages({
  title: {
    id: 'app.presentationUploder.onlineVideoTitle',
    description: 'Online video section title in presentation modal',
  },
  modeLink: {
    id: 'app.presentationUploder.onlineVideoModeLink',
    description: 'Video link input mode',
  },
  modeAparat: {
    id: 'app.presentationUploder.onlineVideoModeAparat',
    description: 'Aparat embed input mode',
  },
  urlInput: {
    id: 'app.externalVideo.urlInput',
    description: 'URL input placeholder',
  },
  urlNote: {
    id: 'app.externalVideo.noteLabel',
    description: 'External video hint',
  },
  aparatInput: {
    id: 'app.presentationUploder.aparatEmbedInput',
    description: 'Aparat embed textarea label',
  },
  aparatHelp: {
    id: 'app.presentationUploder.aparatEmbedHelp',
    description: 'How to get Aparat embed code',
  },
  aparatSyncNote: {
    id: 'app.presentationUploder.aparatSyncNote',
    description: 'Note about Aparat sync limitations',
  },
  urlError: {
    id: 'app.externalVideo.urlError',
    description: 'Invalid video URL',
  },
  aparatError: {
    id: 'app.presentationUploder.aparatEmbedError',
    description: 'Invalid Aparat embed code',
  },
  start: {
    id: 'app.externalVideo.start',
    description: 'Start playing video',
  },
  stop: {
    id: 'app.presentationUploder.stopOnlineVideo',
    description: 'Stop online video',
  },
});

const MODES = {
  LINK: 'link',
  APARAT: 'aparat',
};

const OnlineVideoSection = ({
  intl,
  allowExternalVideo,
  isSharingVideo,
  startExternalVideo,
  stopExternalVideo,
}) => {
  const [mode, setMode] = useState(MODES.LINK);
  const [videoUrl, setVideoUrl] = useState('');
  const [aparatEmbed, setAparatEmbed] = useState('');

  if (!allowExternalVideo) return null;

  const { formatMessage } = intl;

  const linkValid = isDirectVideoUrlValid(videoUrl);
  const aparatValid = !!parseAparatEmbed(aparatEmbed);
  const isLinkMode = mode === MODES.LINK;
  const canStart = isLinkMode ? (linkValid && !!videoUrl) : aparatValid;
  const showError = isLinkMode
    ? (!linkValid && !!videoUrl)
    : (!aparatValid && !!aparatEmbed.trim());

  const handleStart = () => {
    const raw = isLinkMode ? videoUrl : aparatEmbed;
    const externalVideoUrl = normalizeVideoUrl(raw);
    if (!externalVideoUrl) return;

    startExternalVideo(externalVideoUrl);
    Session.setItem('showUploadPresentationView', false);
    setVideoUrl('');
    setAparatEmbed('');
  };

  const handleStop = () => {
    stopExternalVideo?.();
  };

  return (
    <Styled.Section data-test="onlineVideoSection">
      <Styled.SectionTitle>
        {formatMessage(intlMessages.title)}
      </Styled.SectionTitle>

      <Styled.ModeToggle role="tablist" aria-label={formatMessage(intlMessages.title)}>
        <Styled.ModeButton
          type="button"
          role="tab"
          aria-selected={isLinkMode}
          $active={isLinkMode}
          onClick={() => setMode(MODES.LINK)}
          data-test="onlineVideoModeLink"
        >
          {formatMessage(intlMessages.modeLink)}
        </Styled.ModeButton>
        <Styled.ModeButton
          type="button"
          role="tab"
          aria-selected={!isLinkMode}
          $active={!isLinkMode}
          onClick={() => setMode(MODES.APARAT)}
          data-test="onlineVideoModeAparat"
        >
          {formatMessage(intlMessages.modeAparat)}
        </Styled.ModeButton>
      </Styled.ModeToggle>

      {isLinkMode ? (
        <Styled.InputGroup>
          <label htmlFor="online-video-url-input">
            {formatMessage(intlMessages.urlInput)}
            <Styled.TextInput
              id="online-video-url-input"
              type="url"
              dir="ltr"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value.trim())}
              placeholder={formatMessage(intlMessages.urlInput)}
              data-test="onlineVideoUrlInput"
              onPaste={(e) => { e.stopPropagation(); }}
            />
          </label>
          <Styled.Hint>
            {formatMessage(intlMessages.urlNote)}
          </Styled.Hint>
        </Styled.InputGroup>
      ) : (
        <Styled.InputGroup>
          <label htmlFor="online-video-aparat-input">
            {formatMessage(intlMessages.aparatInput)}
            <Styled.TextArea
              id="online-video-aparat-input"
              dir="ltr"
              value={aparatEmbed}
              onChange={(e) => setAparatEmbed(e.target.value)}
              placeholder={formatMessage(intlMessages.aparatInput)}
              data-test="onlineVideoAparatInput"
              onPaste={(e) => { e.stopPropagation(); }}
            />
          </label>
          <Styled.HelpList>
            {formatMessage(intlMessages.aparatHelp)}
          </Styled.HelpList>
          <Styled.Hint>
            {formatMessage(intlMessages.aparatSyncNote)}
          </Styled.Hint>
        </Styled.InputGroup>
      )}

      {showError ? (
        <Styled.Error data-test="onlineVideoError">
          {formatMessage(isLinkMode ? intlMessages.urlError : intlMessages.aparatError)}
        </Styled.Error>
      ) : null}

      <Styled.Actions>
        <Button
          label={formatMessage(intlMessages.start)}
          color="primary"
          disabled={!canStart}
          onClick={handleStart}
          data-test="startOnlineVideo"
        />
        {isSharingVideo ? (
          <Button
            label={formatMessage(intlMessages.stop)}
            color="default"
            onClick={handleStop}
            data-test="stopOnlineVideo"
          />
        ) : null}
      </Styled.Actions>
    </Styled.Section>
  );
};

OnlineVideoSection.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  allowExternalVideo: PropTypes.bool.isRequired,
  isSharingVideo: PropTypes.bool.isRequired,
  startExternalVideo: PropTypes.func.isRequired,
  stopExternalVideo: PropTypes.func,
};

OnlineVideoSection.defaultProps = {
  stopExternalVideo: null,
};

export default injectIntl(OnlineVideoSection);
