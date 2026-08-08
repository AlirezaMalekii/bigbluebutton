import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Icon from 'components/utils/icon';
import { ID } from 'utils/constants';
import { buildFileURL } from 'utils/data';
import './index.scss';

const propTypes = {
  alt: PropTypes.string,
  src: PropTypes.string,
};

const defaultProps = {
  alt: '',
  src: '',
};

const AudioGlyph = () => (
  <svg aria-hidden="true" className="thumbnail-media-glyph" focusable="false" viewBox="0 0 24 24">
    <path
      d="M9 4v10.35A3.25 3.25 0 1 0 11 17V8h5V4H9z"
      fill="currentColor"
    />
  </svg>
);

const VideoGlyph = () => (
  <svg aria-hidden="true" className="thumbnail-media-glyph" focusable="false" viewBox="0 0 24 24">
    <path
      d="M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 17.5v-11zm13.2 2.1 3.05-1.75A.75.75 0 0 1 21.5 7.5v9a.75.75 0 0 1-1.25.55L17.2 15.3V8.6z"
      fill="currentColor"
    />
  </svg>
);

const Image = ({
  alt,
  src,
}) => {
  if (src === ID.SCREENSHARE) {
    return (
      <div className={cx('thumbnail-image', { screenshare: true })}>
        <Icon name={ID.SCREENSHARE} />
      </div>
    );
  }

  if (src === ID.EXTERNAL_AUDIO) {
    return (
      <div className={cx('thumbnail-image', 'media-thumb', 'audio')}>
        <AudioGlyph />
      </div>
    );
  }

  if (src === ID.EXTERNAL_VIDEO) {
    return (
      <div className={cx('thumbnail-image', 'media-thumb', 'video')}>
        <VideoGlyph />
      </div>
    );
  }

  const logo = src.includes('logo');

  return (
    <img
      alt={alt}
      className={cx('thumbnail-image', { logo })}
      src={buildFileURL(src)}
    />
  );
};

Image.propTypes = propTypes;
Image.defaultProps = defaultProps;

export default Image;
