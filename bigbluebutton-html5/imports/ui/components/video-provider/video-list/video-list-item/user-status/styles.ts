// @ts-nocheck
/* eslint-disable */
import styled from 'styled-components';
import Icon from '/imports/ui/components/common/icon/component';
import { colorDanger, colorSuccess, colorWhite } from '/imports/ui/stylesheets/styled-components/palette';

const StatusRow = styled.div`
  direction: ltr;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 0;
  height: 22px;
  line-height: 1;
  white-space: nowrap;
`;

const Reaction = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  overflow: hidden;
  font-size: 18px;
  line-height: 1;
  border-radius: 7px;
  background: rgba(5, 8, 17, 0.58);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.38);
`;

const Away = styled(Reaction)`
  font-size: 15px;
`;

const Voice = styled(Icon)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  height: 18px;
  width: 18px;
  margin: 0;
  color: ${colorWhite};
  border-radius: 50%;

  &::before {
    font-size: 80%;
  }

  background-color: ${colorSuccess};
`;

const Muted = styled(Icon)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  height: 18px;
  width: 18px;
  color: ${colorWhite};
  border-radius: 50%;
  margin: 0;

  &::before {
    font-size: 80%;
  }

  background-color: ${colorDanger};
`;

export default {
  StatusRow,
  Reaction,
  Away,
  Voice,
  Muted,
};
