const MEETING_FONT_STACK = "'IRANYekan', 'Source Sans Pro', Tahoma, Arial, sans-serif";

const resolveFontUrl = (relativePath: string): string => {
  try {
    return new URL(relativePath, window.location.href).href;
  } catch {
    return relativePath;
  }
};

const buildIranYekanFontFaces = (): string => {
  const faces: Array<{ weight: number; file: string }> = [
    { weight: 100, file: 'iranyekanwebthinfanum.woff' },
    { weight: 300, file: 'iranyekanweblightfanum.woff' },
    { weight: 400, file: 'iranyekanwebregularfanum.woff' },
    { weight: 500, file: 'iranyekanwebmediumfanum.woff' },
    { weight: 700, file: 'iranyekanwebboldfanum.woff' },
    { weight: 800, file: 'iranyekanwebextraboldfanum.woff' },
    { weight: 900, file: 'iranyekanwebextrablackfanum.woff' },
  ];

  return faces.map(({ weight, file }) => `
@font-face {
  font-family: 'IRANYekan';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('${resolveFontUrl(`fonts/iranyekan/woff/${file}`)}') format('woff');
}
`).join('\n');
};

const OVERLAY_BASE_CSS = `
${buildIranYekanFontFaces()}

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0b1220 !important;
    font-family: ${MEETING_FONT_STACK} !important;
    -webkit-font-smoothing: antialiased;
  }

  #screen-share-chat-overlay-root {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: transparent;
    font-family: ${MEETING_FONT_STACK} !important;
  }

  #screen-share-chat-overlay-root,
  #screen-share-chat-overlay-root * {
    font-family: ${MEETING_FONT_STACK} !important;
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
