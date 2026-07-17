import styled from 'styled-components';

import Styled from '/imports/ui/components/user-list/styles';
import StyledContent from '/imports/ui/components/user-list/user-list-content/styles';
import { colorGray } from '/imports/ui/stylesheets/styled-components/palette';

const Messages = styled(Styled.Messages)``;

const Container = styled(StyledContent.Container)``;

const SmallTitle = styled(Styled.SmallTitle)``;

const ScrollableList = styled(StyledContent.ScrollableList)``;

const List = styled(StyledContent.List)``;

const ListItem = styled(StyledContent.ListItem)``;

const BreakoutTitle = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
`;

const BreakoutDuration = styled.p`
  margin: 0;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.15;
  color: ${colorGray};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: normal;
`;

const BreakoutModeratorHint = styled.p`
  margin: 0;
  font-size: 0.62rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--skyroom-panel-accent, #20c7bb);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default {
  Messages,
  Container,
  SmallTitle,
  ScrollableList,
  List,
  ListItem,
  BreakoutTitle,
  BreakoutDuration,
  BreakoutModeratorHint,
};
