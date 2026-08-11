import React from 'react';
import { defineMessages, injectIntl, useIntl } from 'react-intl';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import { SKYROOM_PLATFORM_URL } from '/imports/ui/components/skyroom-layout/white-label';

const intlMessages = defineMessages({
  title: {
    id: 'app.about.title',
    description: 'About title label',
  },
  version: {
    id: 'app.about.version',
    description: 'Client version label',
  },
  copyright: {
    id: 'app.about.copyright',
    defaultMessage: (new Date().getFullYear()),
    description: 'Client copyright label',
  },
  description: {
    id: 'app.about.description',
    description: 'Short product description in the about modal',
  },
  copyrightNotice: {
    id: 'app.about.copyrightNotice',
    description: 'Full copyright notice',
  },
  confirmLabel: {
    id: 'app.about.confirmLabel',
    description: 'Confirmation button label',
  },
  confirmDesc: {
    id: 'app.about.confirmDesc',
    description: 'adds descriptive context to confirmLabel',
  },
  dismissLabel: {
    id: 'app.about.dismissLabel',
    description: 'Dismiss button label',
  },
  dismissDesc: {
    id: 'app.about.dismissDesc',
    description: 'adds descriptive context to dissmissLabel',
  },
  version_label: {
    id: 'app.about.version_label',
    description: 'label for version bbb',
  },
});

const AboutComponent = (props) => {
  const {
    settings, isOpen, onRequestClose, priority,
  } = props;
  const intl = useIntl();
  const {
    html5ClientBuild,
    copyright,
    bbbServerVersion,
    displayBbbServerVersion,
  } = settings;

  const showLabelVersion = () => (
    <>
      <br />
      {`${intl.formatMessage(intlMessages.version_label)} ${bbbServerVersion}`}
    </>
  );

  const skyroomAbout = isSkyroomTheme();
  const copyrightYear = String(new Date().getFullYear());
  const platformHost = SKYROOM_PLATFORM_URL.replace(/^https?:\/\//, '');

  return (
    <ModalSimple
      data-test="aboutModalTitleLabel"
      title={intl.formatMessage(intlMessages.title)}
      dismiss={{
        label: intl.formatMessage(intlMessages.dismissLabel),
        description: intl.formatMessage(intlMessages.dismissDesc),
      }}
      {...{
        isOpen,
        onRequestClose,
        priority,
      }}
    >
      {skyroomAbout ? (
        <div className="skyroom-about-body" data-test="aboutModalBody">
          <p className="skyroom-about-description">
            {intl.formatMessage(intlMessages.description)}
          </p>
          <p className="skyroom-about-copyright">
            {intl.formatMessage(intlMessages.copyrightNotice, { year: copyrightYear })}
          </p>
          <p className="skyroom-about-meta">
            {`${intl.formatMessage(intlMessages.version)} ${html5ClientBuild}`}
            {displayBbbServerVersion ? showLabelVersion() : null}
          </p>
          <p className="skyroom-about-link">
            <a href={SKYROOM_PLATFORM_URL} target="_blank" rel="noopener noreferrer">
              {platformHost}
            </a>
          </p>
        </div>
      ) : (
        <>
          {`${intl.formatMessage(intlMessages.copyright)} ${copyright}`}
          <br />
          {`${intl.formatMessage(intlMessages.version)} ${html5ClientBuild}`}
          {displayBbbServerVersion ? showLabelVersion() : null}
        </>
      )}
    </ModalSimple>
  );
};

export default injectIntl(AboutComponent);
