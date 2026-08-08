import React, { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import { shortcuts as config } from 'config';
import Application from './application';
import Content from './content';
import Media from './media';
import Modal from './modal';
import BottomBar from 'components/bars/bottom';
import TopBar from 'components/bars/top';
import {
  play,
  seek,
  skip,
} from 'utils/actions';
import { ID } from 'utils/constants';
import formatJalaliDate from 'utils/jalali';
import layout from 'utils/layout';
import Shortcuts from 'utils/shortcuts';
import storage from 'utils/data/storage';
import { useLayoutSwap, useWebcamVisibility } from 'components/utils/hooks';
import './index.scss';

const intlMessages = defineMessages({
  aria: {
    id: 'player.wrapper.aria',
    description: 'Aria label for the player wrapper',
  },
  documentTitle: {
    id: 'player.document.title',
    description: 'Browser document title for a recording',
  },
});

const Player = () => {
  const intl = useIntl();

  const [fullscreen, setFullscreen] = useState(false);
  const [modal, setModal] = useState('');
  const [search, setSearch] = useState([]);
  const [section, setSection] = useState(layout.section);
  const [swap, setSwap] = useState(layout.swap);

  const shortcuts = useRef();

  const { showPresentation } = useLayoutSwap();
  const hidePresentation = showPresentation === false;
  const showWebcam = useWebcamVisibility();

  useEffect(() => {
    const meetingName = storage.metadata.name?.trim();
    const recordingDate = formatJalaliDate(storage.metadata.start);
    if (!meetingName || !recordingDate) return undefined;

    const previousTitle = document.title;
    document.title = intl.formatMessage(intlMessages.documentTitle, {
      meetingName,
      recordingDate,
    });

    return () => {
      document.title = previousTitle;
    };
  }, [intl]);

  useEffect(() => {
    if (showPresentation === false) {
      setSwap(true);
    } else {
      setSwap(false);
    }
  }, [showPresentation]);

  useEffect(() => {
    const { seconds } = config.seek;

    const actions = {
      fullscreen: () => setFullscreen(prevFullscreen => !prevFullscreen),
      play: () => play(),
      section: () => setSection(prevSection => !prevSection),
      seek: {
        backward: () => seek(-seconds),
        forward: () => seek(+seconds),
      },
      skip: {
        next: () => skip(+1),
        previous: () => skip(-1),
      },
      swap: () => setSwap(prevSwap => !prevSwap),
    };

    shortcuts.current = new Shortcuts(actions);

    return () => {
      if (shortcuts.current) shortcuts.current.destroy();
    };
  }, []);

  const style = {
    'fullscreen-content': fullscreen,
    'hidden-section': !section,
    'single-content': layout.single || hidePresentation,
    'no-webcam': !showWebcam,
  };

  return (
    <div
      aria-label={intl.formatMessage(intlMessages.aria)}
      className={cx('player-wrapper', style)}
      id={ID.PLAYER}
    >
      <TopBar
        openModal={(type) => setModal(type)}
        section={section}
        toggleSection={() => setSection(prevSection => !prevSection)}
        toggleSwap={() => setSwap(prevSwap => !prevSwap)}
        hidePresentation={hidePresentation}
      />
      <Media
        fullscreen={fullscreen}
        showWebcam={showWebcam}
        swap={swap}
        toggleFullscreen={() => setFullscreen(prevFullscreen => !prevFullscreen)}
        hidePresentation={hidePresentation}
      />
      <Application />
      <Content
        fullscreen={fullscreen}
        handleSearch={(value) => setSearch(value)}
        search={search}
        swap={swap}
        toggleFullscreen={() => setFullscreen(prevFullscreen => !prevFullscreen)}
        hidePresentation={hidePresentation}
      />
      <BottomBar />
      <Modal
        handleClose={() => setModal('')}
        handleSearch={(value) => setSearch(value)}
        modal={modal}
      />
    </div>
  );
};

export default Player;
