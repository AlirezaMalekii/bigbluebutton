const OVERLAY_BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent !important;
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

  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      if (styleSheet.href) {
        const link = targetDoc.createElement('link');
        link.rel = 'stylesheet';
        link.type = styleSheet.type || 'text/css';
        link.href = styleSheet.href;
        if (styleSheet.media?.mediaText) {
          link.media = styleSheet.media.mediaText;
        }
        targetDoc.head.appendChild(link);
        return;
      }

      const cssRules = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      if (!cssRules) return;

      const style = targetDoc.createElement('style');
      style.textContent = cssRules;
      targetDoc.head.appendChild(style);
    } catch {
      if (styleSheet.href) {
        const link = targetDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        targetDoc.head.appendChild(link);
      }
    }
  });

  const baseStyle = targetDoc.createElement('style');
  baseStyle.textContent = OVERLAY_BASE_CSS;
  targetDoc.head.appendChild(baseStyle);
};

export default copyStylesToWindow;
