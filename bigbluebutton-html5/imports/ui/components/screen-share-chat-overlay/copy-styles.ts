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

const buildBbbIconsFontFace = (): string => `
@font-face {
  font-family: 'bbb-icons';
  src: url('${resolveFontUrl('fonts/BbbIcons/bbb-icons.woff2')}') format('woff2'),
       url('${resolveFontUrl('fonts/BbbIcons/bbb-icons.woff')}') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;

const OVERLAY_BASE_CSS = `
${buildIranYekanFontFaces()}
${buildBbbIconsFontFace()}

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
  #screen-share-chat-overlay-root *:not([class*="icon-bbb-"]):not(.icon-bbb-icons) {
    font-family: ${MEETING_FONT_STACK} !important;
  }

  [class^="icon-bbb-"],
  [class*=" icon-bbb-"] {
    font-family: 'bbb-icons' !important;
    speak: none;
    display: inline-block;
    font-style: normal;
    font-weight: 400;
    line-height: 1;
    text-align: center;
    vertical-align: middle;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Participants tab — dark chrome matching the floating panel */
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] {
    --skyroom-panel-text: #eef4fb;
    --skyroom-panel-text-muted: rgba(210, 224, 238, 0.82);
    --skyroom-user-row-h: 36px;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] li,
  #screen-share-chat-overlay-root [data-test="userListItem"],
  #screen-share-chat-overlay-root [data-test="userListItemCurrent"] {
    background: transparent !important;
    margin: 0 0 2px !important;
    padding: 0 4px !important;
    list-style: none !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [role="button"] {
    background: transparent !important;
    border-radius: 10px !important;
    transition: background 140ms ease;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [role="button"]:hover {
    background: rgba(255, 255, 255, 0.06) !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserItemContents"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    gap: 6px !important;
    min-height: var(--skyroom-user-row-h) !important;
    padding: 2px 4px !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="userNameContainer"],
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserNameContainer"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    overflow: hidden !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"],
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"] span,
  #screen-share-chat-overlay-root [data-test="userListItem"] span,
  #screen-share-chat-overlay-root [data-test="userListItemCurrent"] span {
    color: var(--skyroom-panel-text) !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserNameSub"] {
    color: var(--skyroom-panel-text-muted) !important;
    font-size: 0.62rem !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"] {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 0.78rem !important;
    font-weight: 700 !important;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

const copyStylesheetLink = (targetDoc: Document, href: string): void => {
  try {
    const link = targetDoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(href, window.location.href).href;
    targetDoc.head.appendChild(link);
  } catch {
    // Optional stylesheet — ignore if unavailable
  }
};

const copyStylesToWindow = (targetWindow: Window): void => {
  const { document: targetDoc } = targetWindow;

  const baseStyle = targetDoc.createElement('style');
  baseStyle.textContent = OVERLAY_BASE_CSS;
  targetDoc.head.appendChild(baseStyle);

  // Icon glyphs used by participant rows / menus inside the floating window.
  copyStylesheetLink(targetDoc, 'stylesheets/bbb-icons.css');
};

export default copyStylesToWindow;
