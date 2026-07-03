import React from 'react';
import PropTypes from 'prop-types';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import cx from 'classnames';
import Thumbnails from 'components/thumbnails';
import { search as config } from 'config';
import { isEmpty } from 'utils/data/validators';
import './index.scss';

const intlMessages = defineMessages({
  placeholder: {
    id: 'player.search.modal.placeholder',
    description: 'Placeholder for the search input',
  },
  minLength: {
    id: 'player.search.modal.minLength',
    description: 'Hint shown when search term is too short',
  },
  noResults: {
    id: 'player.search.modal.noResults',
    description: 'Message shown when no search results are found',
  },
});

const propTypes = {
  handleOnChange: PropTypes.func,
  search: PropTypes.array,
  queryLength: PropTypes.number,
};

const defaultProps = {
  handleOnChange: () => {},
  search: [],
  queryLength: 0,
};

const Body = ({
  handleOnChange,
  search,
  queryLength,
}) => {
  const intl = useIntl();
  const tooShort = queryLength > 0 && queryLength < config.length.min;
  const hasQuery = queryLength >= config.length.min;
  const showNoResults = hasQuery && isEmpty(search);

  return (
    <div className="search-body">
      <div className="search-input-wrap">
        <input
          className="search-input"
          dir="rtl"
          maxLength={config.length.max}
          minLength={config.length.min}
          onChange={(event) => handleOnChange(event)}
          placeholder={intl.formatMessage(intlMessages.placeholder)}
          type="search"
        />
      </div>
      {tooShort ? (
        <div className="search-hint">
          {intl.formatMessage(intlMessages.minLength)}
        </div>
      ) : null}
      {showNoResults ? (
        <div className="search-empty">
          {intl.formatMessage(intlMessages.noResults)}
        </div>
      ) : null}
      <div className={cx('result', { active: !isEmpty(search) })}>
        <Thumbnails
          currentDataIndex={0}
          handleSearch={null}
          player={null}
          search={search}
        />
      </div>
    </div>
  );
};

Body.propTypes = propTypes;
Body.defaultProps = defaultProps;

export default Body;
