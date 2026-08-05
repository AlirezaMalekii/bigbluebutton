import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import Item from './item';
import ClearButton from './buttons/clear';
import Icon from 'components/utils/icon';
import { useCurrentIndex } from 'components/utils/hooks';
import { thumbnails as config } from 'config';
import { ID } from 'utils/constants';
import storage from 'utils/data/storage';
import {
  isEmpty,
  isEqual,
} from 'utils/data/validators';
import {
  buildThumbnailItems,
  getThumbnailScrollAmount,
  getThumbnailScrollState,
} from './utils';
import './index.scss';

const intlMessages = defineMessages({
  aria: {
    id: 'player.thumbnails.wrapper.aria',
    description: 'Aria label for the thumbnails wrapper',
  },
  scrollLeft: {
    id: 'player.thumbnails.scroll.left.aria',
    description: 'Scroll thumbnails left',
  },
  scrollRight: {
    id: 'player.thumbnails.scroll.right.aria',
    description: 'Scroll thumbnails right',
  },
});

const propTypes = {
  handleSearch: PropTypes.func,
  interactive: PropTypes.bool,
  search: PropTypes.array,
};

const defaultProps = {
  handleSearch: () => { },
  interactive: false,
  search: [],
};

const Thumbnails = ({
  handleSearch,
  interactive,
  search,
}) => {
  const interaction = useRef(false);
  const viewport = useRef();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const intl = useIntl();

  const isFiltered = (index) => {
    if (interactive) {
      return !isEmpty(search) && !search.includes(index);
    } else {
      return !search.includes(index);
    }
  }

  const items = useMemo(() => {
    return buildThumbnailItems(storage.thumbnails, storage.layoutSwap, storage.screenshare);
  }, []);

  const currentIndex = useCurrentIndex(items);

  const updateScrollState = useCallback(() => {
    const node = viewport.current;
    if (!node) return;

    const state = getThumbnailScrollState(node);
    setCanScrollLeft(state.canScrollLeft);
    setCanScrollRight(state.canScrollRight);
  }, []);

  const scroll = useCallback((direction) => {
    const node = viewport.current;
    if (!node) return;

    node.scrollBy({
      behavior: 'smooth',
      left: direction * getThumbnailScrollAmount(node.clientWidth),
    });
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return undefined;

    updateScrollState();
    node.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      node.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [search, updateScrollState]);

  useEffect(() => {
    const node = viewport.current;
    const active = node?.querySelector('.thumbnail-wrapper.active');
    if (!config.scroll || interaction.current || !node || !active) return;

    const target = active.offsetLeft - ((node.clientWidth - active.clientWidth) / 2);
    node.scrollTo({ behavior: 'smooth', left: Math.max(target, 0) });
    window.requestAnimationFrame(updateScrollState);
  }, [currentIndex, updateScrollState]);

  return (
    <div className="thumbnails-strip">
      <button
        aria-label={intl.formatMessage(intlMessages.scrollLeft)}
        className="thumbnail-scroll-control thumbnail-scroll-left"
        disabled={!canScrollLeft}
        onClick={() => scroll(-1)}
        type="button"
      >
        <Icon name="left" />
      </button>
      <div
        aria-label={intl.formatMessage(intlMessages.aria)}
        className="thumbnails-wrapper"
        id={ID.THUMBNAILS}
        onMouseEnter={() => interaction.current = true}
        onMouseLeave={() => interaction.current = false}
        ref={viewport}
        tabIndex="0"
      >
        {items.reduce((result, item, index) => {
          if (!isFiltered(index)) {
            const active = index === currentIndex;

            result.push(
              <Item
                active={active}
                index={index}
                interactive={interactive}
                item={item}
                key={`${item.timestamp}-${index}`}
              />
            );
          }

          return result;
        }, [])}
        <ClearButton
          interactive={interactive}
          onClick={() => handleSearch([])}
          search={search}
        />
      </div>
      <button
        aria-label={intl.formatMessage(intlMessages.scrollRight)}
        className="thumbnail-scroll-control thumbnail-scroll-right"
        disabled={!canScrollRight}
        onClick={() => scroll(1)}
        type="button"
      >
        <Icon name="right" />
      </button>
    </div>
  );
};

Thumbnails.propTypes = propTypes;
Thumbnails.defaultProps = defaultProps;

const areEqual = (prevProps, nextProps) => {
  if (!isEqual(prevProps.search, nextProps.search)) return false;

  return true;
};

export default React.memo(Thumbnails, areEqual);
