import styled from 'styled-components';

import {
  colorGrayDark,
  colorWhite,
} from '/imports/ui/stylesheets/styled-components/palette';
import { fontSizeSmall } from '/imports/ui/stylesheets/styled-components/typography';

const CompactRow = styled.div`
  flex-shrink: 0;
  padding: 6px 0 4px;
`;

const CompactButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  margin: 0;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(20, 169, 158, 0.08);
  color: ${colorGrayDark};
  cursor: pointer;
  text-align: start;
  font: inherit;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    outline: none;
    border-color: rgba(20, 169, 158, 0.45);
    background: rgba(20, 169, 158, 0.14);
  }
`;

const CompactIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  color: rgba(20, 199, 187, 0.95);

  i {
    font-size: 16px !important;
    line-height: 1;
  }
`;

const CompactLabel = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  font-size: ${fontSizeSmall};
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b 0%, #e5484d 100%);
  color: ${colorWhite};
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(229, 72, 77, 0.35);
`;

const ChevronIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 14px;
  opacity: 0.55;

  i {
    font-size: 12px !important;
    line-height: 1;
  }

  [dir="rtl"] & i {
    transform: scaleX(-1);
  }
`;

export default {
  CompactRow,
  CompactButton,
  CompactIcon,
  CompactLabel,
  CountBadge,
  ChevronIcon,
};
