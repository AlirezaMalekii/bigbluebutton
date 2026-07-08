const OVERLAY_BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0b1220 !important;
    font-family: 'Vazirmatn', 'Source Sans Pro', Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  #screen-share-chat-overlay-root {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: transparent;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

const copyStylesToWindow = (targetWindow: Window): void => {
  const { document: targetDoc } = targetWindow;

  const baseStyle = targetDoc.createElement('style');
  baseStyle.textContent = OVERLAY_BASE_CSS;
  targetDoc.head.appendChild(baseStyle);
};

export default copyStylesToWindow;
