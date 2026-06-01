import styled from 'styled-components';

const DropdownMenuWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  [data-test="presentationOptionsDownload"] {
    display: inline-flex !important;
  }

  [data-test="presentationOptionsDownload"] > span:first-of-type {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 8px;
    background: rgba(32, 199, 187, 0.14) !important;
    border: 1px solid rgba(32, 199, 187, 0.38) !important;
    color: var(--skyroom-brand-400, #20c7bb) !important;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  [data-test="presentationOptionsDownload"]:hover > span:first-of-type,
  [data-test="presentationOptionsDownload"]:focus > span:first-of-type {
    background: rgba(32, 199, 187, 0.26) !important;
    border-color: rgba(32, 199, 187, 0.55) !important;
    color: #fff !important;
  }

  [data-test="presentationOptionsDownload"] i,
  [data-test="presentationOptionsDownload"] i::before {
    color: inherit !important;
  }
`;

export default {
  DropdownMenuWrapper,
};
