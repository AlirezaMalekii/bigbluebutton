import styled from 'styled-components';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import {
  colorPrimary,
  colorDanger,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  smPaddingX,
  lgPaddingY,
  titlePositionLeft,
  mdPaddingX,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  fontSizeSmall,
  fontSizeXL,
} from '/imports/ui/stylesheets/styled-components/typography';
import {
  hasPhoneDimentions,
  mediumDown,
  hasPhoneWidth,
  smallOnly,
} from '/imports/ui/stylesheets/styled-components/breakpoints';
import {
  ScrollboxVertical,
} from '/imports/ui/stylesheets/styled-components/scrollable';
import {
  Tab, Tabs, TabList, TabPanel,
} from 'react-tabs';

const Item = styled.li`
  display: flex;
  width: 100%;
  min-height: 3.25rem;
  height: auto;
  border-bottom: 1px solid rgba(218, 230, 245, 0.1);

  ${({ last }) => last && `
    border: none;
  `}
`;

const Left = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const Name = styled.div`
  display: flex;
  width: 27.5%;
  height: 100%;
  align-items: center;
  justify-content: flex-start;

  @media ${hasPhoneDimentions} {
    width: 100%;
  }
`;

const FullName = styled(Name)`
  width: 100%;
`;

const ClientNotRespondingText = styled.div`
  display: flex;
  width: 27.5%;
  height: 100%;
  align-items: center;
  justify-content: flex-start;
  color: ${colorDanger};

  @media ${hasPhoneDimentions} {
    width: 100%;
  }
`;

const Text = styled.div`
  padding-left: .5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${({ offline }) => offline && `
    font-style: italic;
  `}

  [dir="rtl"] & {
    padding: 0;
    padding-right: .5rem;
  }
`;

const Avatar = styled.div`
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

const Icon = styled.div`
  width: 2.05rem;
  height: 2.05rem;
`;

const Right = styled.div`
  display: flex;
  width: 5rem;
  height: 100%;
`;

const Time = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  justify-content: flex-end;
`;

const TimeActive = styled.time`
  color: ${colorPrimary} !important;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  justify-content: flex-end;
`;

const NetworkDataContainer = styled(ScrollboxVertical)`
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: nowrap;
  overflow: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 1.25rem;

  &:focus {
    outline: none;

    &::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,.5);
    }
  }

  @media ${mediumDown} {
    justify-content: space-between;
  }
`;

const NetworkData = styled.div`
  font-size: ${fontSizeSmall};

  ${({ invisible }) => invisible && `
    visibility: hidden;
  `}

  & :first-child {
    font-weight: 600;
  }
`;

const CopyContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  border: none;
  border-top: 1px solid rgba(20, 169, 158, 0.25);
  padding: ${mdPaddingX} 0 0 0;
  margin-top: auto;
`;

const ConnectionStatusModal = styled(ModalSimple)`
  padding: 0;
  width: min(760px, 96vw);
  max-width: 760px;
  max-height: min(90vh, 640px);
  overflow: hidden;
`;

const Container = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
`;

const Header = styled.div`
  margin: 0;
  padding: 0;
  border: none;
  line-height: ${titlePositionLeft};
  margin-bottom: ${lgPaddingY};
`;

const Title = styled.h2`
  color: var(--skyroom-text-primary, #eef4fb);
  font-weight: 700;
  font-size: ${fontSizeXL};
  text-align: left;
  margin: 0;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
`;

const Wrapper = styled.div`
  display: block;
  width: 100%;
  max-height: 16rem;
`;

const Status = styled.div`
  display: flex;
  width: 6rem;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

const Copy = styled.span`
  cursor: pointer;
  color: ${colorPrimary};

  &:hover {
    text-decoration: underline;
  }

  ${({ disabled }) => disabled && `
    cursor: not-allowed !important;
  `}
`;

const HelperWrapper = styled.div`
  min-width: 12.5rem;
  height: 100%;

  @media ${mediumDown} {
    flex: none;
    width: 100%;
    scroll-snap-align: start;
    display: flex;
    justify-content: center;
  }
`;

const Helper = styled.div`
  width: 12.5rem;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(28, 40, 62, 0.95), rgba(16, 24, 40, 0.98));
  border: 1px solid rgba(20, 169, 158, 0.28);
  color: var(--skyroom-text-primary, #eef4fb);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: .75rem;
`;

const NetworkDataContent = styled.div`
  margin: 0;
  display: flex;
  justify-content: space-around;
  flex-grow: 1;

  @media ${mediumDown} {
    flex: none;
    width: 100%;
    scroll-snap-align: start;
  }
`;

const DataColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media ${hasPhoneWidth} {
    flex-grow: 1;
  }
`;

const ConnectionTabs = styled(Tabs)`
  display: flex;
  flex-flow: column;
  justify-content: flex-start;

  @media ${smallOnly} {
    width: 100%;
    flex-flow: column;
  }
`;

const ConnectionTabList = styled(TabList)`
  display: flex;
  flex-flow: row;
  margin: 0;
  margin-bottom: 1rem;
  border: none;
  padding: 4px;
  width: 100%;
  gap: 8px;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 14px;
  border: 1px solid rgba(218, 230, 245, 0.08);
  box-sizing: border-box;

  @media ${smallOnly} {
    width: 100%;
    flex-flow: row;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const ConnectionTabPanel = styled(TabPanel)`
  display: none;
  margin: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  &.is-selected {
    display: flex;
    flex-flow: column;
    flex: 1;
  }

  & ul {
    padding: 0;
  }

  @media ${smallOnly} {
    width: 100%;
    margin: 0;
    padding-left: 1rem;
    padding-right: 1rem;
  }
`;

const ConnectionTabSelector = styled(Tab)`
  display: flex;
  flex-flow: row;
  font-size: 0.82rem;
  flex: 1 1 0;
  justify-content: center;
  border: none !important;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  margin: 0;
  align-items: center;
  min-width: 0;
  color: var(--skyroom-text-secondary, #aab6c7);
  background: transparent;

  & > span {
    min-width: 0;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media ${smallOnly} {
    max-width: 100%;
    margin: 0 ${smPaddingX} 0 0;
    & > i {
      display: none;
    }

    [dir="rtl"] & {
       margin: 0 0 0 ${smPaddingX};
    }
  }

  span {
    border-bottom: none;
    color: inherit;
  }

  &.is-selected {
    border: none;
    color: #ffffff;
    background: linear-gradient(135deg, #0d887e 0%, #14a99e 100%);
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(13, 136, 126, 0.35);

    span {
      border-bottom: none;
      color: #ffffff;
    }
  }
`;

export default {
  Item,
  Left,
  Name,
  Text,
  Avatar,
  Icon,
  Right,
  Time,
  TimeActive,
  NetworkDataContainer,
  NetworkData,
  CopyContainer,
  ConnectionStatusModal,
  ClientNotRespondingText,
  Container,
  Header,
  Title,
  Content,
  Wrapper,
  Status,
  Copy,
  Helper,
  NetworkDataContent,
  FullName,
  DataColumn,
  HelperWrapper,
  ConnectionTabs,
  ConnectionTabList,
  ConnectionTabSelector,
  ConnectionTabPanel,
};
