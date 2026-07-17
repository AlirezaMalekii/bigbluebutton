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
    id: 'app.presentationUploder.onlineVideoUrlNote',
    description: 'Short external video recording hint for presentation modal',
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
  NONE: null,
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
  const [mode, setMode] = useState(MODES.NONE);
  const [videoUrl, setVideoUrl] = useState('');
  const [aparatEmbed, setAparatEmbed] = useState('');

  if (!allowExternalVideo) return null;

  const { formatMessage } = intl;

  const isLinkMode = mode === MODES.LINK;
  const isAparatMode = mode === MODES.APARAT;
  const hasMode = isLinkMode || isAparatMode;

  const linkValid = isDirectVideoUrlValid(videoUrl);
  const aparatParsed = parseAparatEmbed(aparatEmbed);
  const aparatValid = !!aparatParsed;
  // Link mode also accepts Aparat page/embed paste (normalize handles both).
  const canStart = isLinkMode
    ? (linkValid && !!videoUrl.trim())
    : (isAparatMode && aparatValid);
  const showError = isLinkMode
    ? (!linkValid && !!videoUrl.trim())
    : (isAparatMode && !aparatValid && !!aparatEmbed.trim());

  const toggleMode = (nextMode) => {
    setMode((current) => (current === nextMode ? MODES.NONE : nextMode));
  };

  const handleStart = () => {
    if (!hasMode || !canStart) return;
    const raw = isLinkMode ? videoUrl : aparatEmbed;
    const externalVideoUrl = normalizeVideoUrl(raw);
    if (!externalVideoUrl || !isDirectVideoUrlValid(externalVideoUrl)) return;

    startExternalVideo(externalVideoUrl);
    Session.setItem('showUploadPresentationView', false);
    setVideoUrl('');
    setAparatEmbed('');
    setMode(MODES.NONE);
  };

  const handleStop = () => {
    stopExternalVideo?.();
  };

  return (
    <Styled.Section data-test="onlineVideoSection" data-collapsed={!hasMode ? 'true' : undefined}>
      <Styled.SectionTitle>
        {formatMessage(intlMessages.title)}
      </Styled.SectionTitle>

      <Styled.ModeToggle role="tablist" aria-label={formatMessage(intlMessages.title)}>
        <Styled.ModeButton
          type="button"
          role="tab"
          aria-selected={isLinkMode}
          $active={isLinkMode}
          onClick={() => toggleMode(MODES.LINK)}
          data-test="onlineVideoModeLink"
        >
          {formatMessage(intlMessages.modeLink)}
        </Styled.ModeButton>
        <Styled.ModeButton
          type="button"
          role="tab"
          aria-selected={isAparatMode}
          $active={isAparatMode}
          onClick={() => toggleMode(MODES.APARAT)}
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
      ) : null}

      {isAparatMode ? (
        <Styled.InputGroup>
          <label htmlFor="online-video-aparat-input">
            {formatMessage(intlMessages.aparatInput)}
            <Styled.TextArea
              id="online-video-aparat-input"
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
      ) : null}

      {hasMode && showError ? (
        <Styled.Error data-test="onlineVideoError">
          {formatMessage(isLinkMode ? intlMessages.urlError : intlMessages.aparatError)}
        </Styled.Error>
      ) : null}

      {(hasMode || isSharingVideo) ? (
        <Styled.Actions>
          {hasMode ? (
            <Button
              label={formatMessage(intlMessages.start)}
              color="primary"
              disabled={!canStart}
              onClick={handleStart}
              data-test="startOnlineVideo"
            />
          ) : null}
          {isSharingVideo ? (
            <Button
              label={formatMessage(intlMessages.stop)}
              color="default"
              onClick={handleStop}
              data-test="stopOnlineVideo"
            />
          ) : null}
        </Styled.Actions>
      ) : null}
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
