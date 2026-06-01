import React, { useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import deviceInfo from '/imports/utils/deviceInfo';
import { SKYROOM_COLUMN_ATTR } from '../column-layout';
import { useSkyroomChatMessageFilter } from '../chat-message-filter/context';
import PanelChrome from '../panel-chrome/styles';
import Styled from './styles';

const messages = defineMessages({
  placeholder: {
    id: 'app.skyroom.chatUserSearch.placeholder',
    description: 'Skyroom public chat filter by sender',
    defaultMessage: 'Search messages by participant…',
  },
  ariaLabel: {
    id: 'app.skyroom.chatUserSearch.ariaLabel',
    description: 'Skyroom public chat sender filter label',
    defaultMessage: 'Filter public chat by participant name',
  },
  clear: {
    id: 'app.skyroom.chatUserSearch.clear',
    description: 'Clear chat sender filter',
    defaultMessage: 'Clear filter',
  },
});

const SkyroomChatUserSearch: React.FC = () => {
  const intl = useIntl();
  const {
    filterTerm, setFilterTerm, clearFilter, isFiltering,
  } = useSkyroomChatMessageFilter();
  const [enabled, setEnabled] = useState(false);
  const [localValue, setLocalValue] = useState(filterTerm);

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
    setLocalValue(filterTerm);
  }, [filterTerm]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilterTerm(localValue.trim());
    }, 180);
    return () => window.clearTimeout(handle);
  }, [localValue, setFilterTerm]);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  if (!enabled) return null;

  return (
    <Styled.SearchWrap data-test="skyroomChatUserSearch">
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
        {isFiltering ? (
          <PanelChrome.PanelSearchClear
            type="button"
            onClick={() => {
              setLocalValue('');
              clearFilter();
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

export default SkyroomChatUserSearch;
