import React from 'react';
import { defineMessages, injectIntl, useIntl } from 'react-intl';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { isSkyroomTheme } from '/imports/ui/components/skyroom-layout/panel-toggles';
import {
  getSkyroomBrand,
  isRoomeetBrand,
} from '/imports/ui/components/skyroom-layout/white-label';

const intlMessages = defineMessages({
  title: {
    id: 'app.about.title',
    description: 'About title label',
    defaultMessage: 'About {brand}',
  },
  brandSafemeet: {
    id: 'app.skyroom.brand.safemeet',
    description: 'SafeMeet product name',
    defaultMessage: 'SafeMeet',
  },
  brandRoomeet: {
    id: 'app.skyroom.brand.roomeet',
    description: 'RooMeet product name',
    defaultMessage: 'RooMeet',
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
    defaultMessage: '{brand} is an online meeting, webinar, and classroom platform with reliable audio and video, a whiteboard, file sharing, chat, and session recording — so hosts and participants can run a class or meeting simply and reliably.',
  },
  copyrightNotice: {
    id: 'app.about.copyrightNotice',
    description: 'Full copyright notice',
    defaultMessage: '© {year} {brand}. All intellectual property rights in this platform, its brand, marks, and content are reserved. Reproduction, republication, reverse engineering, or commercial use without written permission is prohibited.',
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
  const brand = getSkyroomBrand();
  const brandName = intl.formatMessage(
    isRoomeetBrand() ? intlMessages.brandRoomeet : intlMessages.brandSafemeet,
  );
  const platformHost = brand.url.replace(/^https?:\/\//, '');

  return (
    <ModalSimple
      data-test="aboutModalTitleLabel"
      title={intl.formatMessage(intlMessages.title, { brand: brandName })}
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
            {intl.formatMessage(intlMessages.description, { brand: brandName })}
          </p>
          <p className="skyroom-about-copyright">
            {intl.formatMessage(intlMessages.copyrightNotice, {
              year: copyrightYear,
              brand: brandName,
            })}
          </p>
          <p className="skyroom-about-meta">
            {`${intl.formatMessage(intlMessages.version)} ${html5ClientBuild}`}
            {displayBbbServerVersion ? showLabelVersion() : null}
          </p>
          <p className="skyroom-about-link">
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
            >
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
