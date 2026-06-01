import React, { useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import deviceInfo from '/imports/utils/deviceInfo';
import { SKYROOM_COLUMN_ATTR } from '../column-layout';
import { useSkyroomUserSearch } from './context';
import PanelChrome from '../panel-chrome/styles';
import Styled from './styles';

const messages = defineMessages({
  placeholder: {
    id: 'app.skyroom.userSearch.placeholder',
    description: 'Skyroom user list search placeholder',
    defaultMessage: 'Search participants',
  },
  ariaLabel: {
    id: 'app.skyroom.userSearch.ariaLabel',
    description: 'Skyroom user list search field label',
    defaultMessage: 'Search participants',
  },
  clear: {
    id: 'app.skyroom.userSearch.clear',
    description: 'Clear user search',
    defaultMessage: 'Clear search',
  },
});

const SkyroomUserSearch: React.FC = () => {
  const intl = useIntl();
  const {
    searchTerm, setSearchTerm, clearSearch, isSearching,
  } = useSkyroomUserSearch();
  const [enabled, setEnabled] = useState(false);
  const [localValue, setLocalValue] = useState(searchTerm);

  useEffect(() => {
    const layoutEl = document.getElementById('layout');
    const check = () => {
      setEnabled(
        !deviceInfo.isPhone
        && Boolean(layoutEl?.hasAttribute(SKYROOM_COLUMN_ATTR)),
      );
    };
    check();
    const observer = new MutationObserver(check);
    if (layoutEl) {
      observer.observe(layoutEl, { attributes: true, attributeFilter: [SKYROOM_COLUMN_ATTR] });
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(localValue.trim());
    }, 180);
    return () => window.clearTimeout(handle);
  }, [localValue, setSearchTerm]);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  if (!enabled) return null;

  return (
    <Styled.SearchWrap data-test="skyroomUserSearch">
      <PanelChrome.PanelSearchField>
        <PanelChrome.PanelSearchIcon aria-hidden />
        <PanelChrome.PanelSearchInput
          type="search"
          value={localValue}
          onChange={onChange}
          placeholder={intl.formatMessage(messages.placeholder)}
          aria-label={intl.formatMessage(messages.ariaLabel)}
          autoComplete="off"
          spellCheck={false}
        />
        {isSearching ? (
          <PanelChrome.PanelSearchClear
            type="button"
            onClick={() => {
              setLocalValue('');
              clearSearch();
            }}
            aria-label={intl.formatMessage(messages.clear)}
            title={intl.formatMessage(messages.clear)}
          >
            ×
          </PanelChrome.PanelSearchClear>
        ) : null}
      </PanelChrome.PanelSearchField>
    </Styled.SearchWrap>
  );
};

export default SkyroomUserSearch;
