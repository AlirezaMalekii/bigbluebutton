import styled from 'styled-components';
import {
  PanelSearchWrap,
  PanelSearchField,
  PanelSearchIcon,
  PanelSearchInput,
  PanelSearchClear,
} from '../panel-chrome/styles';

const EmptyHint = styled.p`
  margin: 0;
  padding: var(--space-4) var(--space-3);
  text-align: center;
  font-size: 0.75rem;
  color: var(--skyroom-panel-text-muted, #aab6c7);
`;

export {
  PanelSearchWrap as SearchWrap,
  PanelSearchField as SearchField,
  PanelSearchIcon as SearchIcon,
  PanelSearchInput as SearchInput,
  PanelSearchClear as ClearButton,
};

export default {
  SearchWrap: PanelSearchWrap,
  SearchField: PanelSearchField,
  SearchIcon: PanelSearchIcon,
  SearchInput: PanelSearchInput,
  ClearButton: PanelSearchClear,
  EmptyHint,
};
