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

  /* Participants tab — match classroom users box density + search */
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] {
    --skyroom-panel-text: #eef4fb;
    --skyroom-panel-text-muted: rgba(210, 224, 238, 0.82);
    --skyroom-panel-accent: #20c7bb;
    --skyroom-user-row-h: 34px;
  }

  #screen-share-chat-overlay-root [data-test="skyroomUserSearch"] {
    flex-shrink: 0 !important;
    padding: 8px 10px 6px !important;
  }

  #screen-share-chat-overlay-root [data-test="skyroomUserSearch"] label {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    min-height: 34px !important;
    padding: 0 12px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: rgba(0, 0, 0, 0.28) !important;
  }

  #screen-share-chat-overlay-root [data-test="skyroomUserSearch"] input {
    color: #eef4fb !important;
    font-size: 13px !important;
    background: transparent !important;
  }

  #screen-share-chat-overlay-root [data-test="skyroomUserSearch"] input::placeholder {
    color: rgba(198, 208, 220, 0.62) !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] li,
  #screen-share-chat-overlay-root [data-test="userListItem"],
  #screen-share-chat-overlay-root [data-test="userListItemCurrent"] {
    background: transparent !important;
    margin: 0 0 2px !important;
    padding: 0 6px !important;
    list-style: none !important;
    height: auto !important;
    min-height: 0 !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserRow"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    height: var(--skyroom-user-row-h) !important;
    min-height: var(--skyroom-user-row-h) !important;
    max-height: var(--skyroom-user-row-h) !important;
    width: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [role="button"] {
    background: transparent !important;
    border-radius: 8px !important;
    transition: background 140ms ease;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserRowMain"]:hover,
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [role="button"]:hover {
    background: rgba(255, 255, 255, 0.05) !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserItemContents"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    gap: 4px !important;
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    padding: 0 0.1rem !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="userNameContainer"],
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserNameContainer"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    height: 100% !important;
    overflow: hidden !important;
    line-height: 1 !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="moderatorAvatar"],
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="viewerAvatar"] {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    max-width: 30px !important;
    max-height: 30px !important;
    font-size: 0.55rem !important;
    margin-inline-end: 4px !important;
    flex-shrink: 0 !important;
    overflow: visible !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-skyroom-avatar="true"] {
    width: 100% !important;
    height: 100% !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"],
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"] span,
  #screen-share-chat-overlay-root [data-test="userListItem"] span,
  #screen-share-chat-overlay-root [data-test="userListItemCurrent"] span {
    color: var(--skyroom-panel-text) !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserNameSub"] {
    color: var(--skyroom-panel-text-muted) !important;
    font-size: 0.58rem !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="UserName"] {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 0.75rem !important;
    font-weight: 700 !important;
    max-width: 48% !important;
    line-height: 1 !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [class*="ActionMenuWrap"] {
    display: flex !important;
    align-items: center !important;
    flex-shrink: 0 !important;
    height: 100% !important;
    margin-inline-start: 2px !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] .skyroom-user-actions-trigger,
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="userActionsMenuTrigger"],
  #screen-share-chat-overlay-root
    [data-test="screenShareChatOverlayUsers"] .skyroom-user-actions-trigger.buttonWrapper {
    width: calc(var(--skyroom-user-row-h) - 6px) !important;
    height: calc(var(--skyroom-user-row-h) - 6px) !important;
    min-width: calc(var(--skyroom-user-row-h) - 6px) !important;
    min-height: calc(var(--skyroom-user-row-h) - 6px) !important;
    max-width: calc(var(--skyroom-user-row-h) - 6px) !important;
    max-height: calc(var(--skyroom-user-row-h) - 6px) !important;
    border-radius: 5px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #c5d3e4 !important;
  }

  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] .skyroom-user-actions-trigger i,
  #screen-share-chat-overlay-root [data-test="screenShareChatOverlayUsers"] [data-test="userActionsMenuTrigger"] i {
    font-size: 0.85rem !important;
    line-height: 1 !important;
    color: inherit !important;
  }

  /*
   * MUI dropdown chrome for the floating window.
   * Matches classroom skyroom-user-actions-menu (panel-chrome.css): white card,
   * dark readable text, no bullets, anchored popover — not a naked list.
   */
  .MuiModal-root {
    position: fixed !important;
    z-index: 1300 !important;
    inset: 0 !important;
  }

  .MuiModal-root .MuiBackdrop-root {
    position: fixed !important;
    inset: 0 !important;
    background-color: transparent !important;
    z-index: -1 !important;
  }

  .MuiPopover-root,
  .MuiMenu-root {
    position: fixed !important;
    z-index: 1300 !important;
  }

  .MuiPaper-root,
  .MuiMenu-paper,
  .MuiPopover-paper {
    position: absolute !important;
    outline: 0 !important;
    max-width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 24px) !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #ffffff !important;
    color: #1e293b !important;
    border: 1px solid rgba(15, 23, 42, 0.08) !important;
    border-radius: 12px !important;
    box-shadow:
      0 4px 6px rgba(15, 23, 42, 0.04),
      0 16px 40px rgba(15, 23, 42, 0.14) !important;
    padding: 6px 0 !important;
  }

  .skyroom-user-actions-menu .MuiPaper-root,
  .MuiModal-root.skyroom-user-actions-menu .MuiPaper-root,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiPaper-root,
  .MuiPaper-root.MuiPaper-root-mobile,
  .MuiPaper-root.override-mobile-styles {
    min-width: min(240px, calc(100vw - 16px)) !important;
    max-width: min(280px, calc(100vw - 16px)) !important;
    background: #ffffff !important;
    color: #1e293b !important;
    border: 1px solid rgba(15, 23, 42, 0.08) !important;
    border-radius: 12px !important;
    box-shadow:
      0 4px 6px rgba(15, 23, 42, 0.04),
      0 16px 40px rgba(15, 23, 42, 0.14) !important;
    padding: 6px 0 !important;
  }

  .MuiList-root {
    list-style: none !important;
    margin: 0 !important;
    padding: 0 !important;
    outline: 0 !important;
  }

  .MuiList-root li,
  .MuiMenuItem-root {
    list-style: none !important;
  }

  .MuiMenuItem-root,
  .MuiList-padding .MuiMenuItem-root {
    display: flex !important;
    align-items: center !important;
    min-height: 40px !important;
    padding: 8px 14px !important;
    margin: 0 !important;
    color: #1e293b !important;
    font-size: 0.8125rem !important;
    font-weight: 500 !important;
    font-family: ${MEETING_FONT_STACK} !important;
    line-height: 1.35 !important;
    background: transparent !important;
    transition: background-color 0.12s ease !important;
  }

  .MuiMenuItem-root *,
  .MuiMenuItem-root i,
  .MuiMenuItem-root [class*="icon-bbb-"],
  .MuiMenuItem-root [class*="Option"],
  .MuiMenuItem-root [class*="MenuItemWrapper"] {
    color: #1e293b !important;
    font-family: inherit !important;
  }

  .MuiMenuItem-root [class^="icon-bbb-"],
  .MuiMenuItem-root [class*=" icon-bbb-"] {
    font-family: 'bbb-icons' !important;
    font-size: 1rem !important;
    margin-inline-end: 0.35rem;
  }

  /*
   * Hover: soft teal wash + keep dark text/icons.
   * BBBMenuItem forces white text on hover — override that for readable contrast
   * on the light classroom-style menu card.
   */
  .skyroom-user-actions-menu .MuiMenuItem-root:hover,
  .skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root:hover,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root:hover,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root.Mui-focusVisible {
    background: rgba(32, 199, 187, 0.12) !important;
    color: #0f172a !important;
  }

  .skyroom-user-actions-menu .MuiMenuItem-root:hover *,
  .skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible *,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root:hover *,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible *,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root:hover *,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root.Mui-focusVisible *,
  .skyroom-user-actions-menu .MuiMenuItem-root:hover i,
  .skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible i,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root:hover i,
  .MuiModal-root.skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible i,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root:hover i,
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root.Mui-focusVisible i,
  .skyroom-user-actions-menu .MuiMenuItem-root:hover [class*="icon-bbb-"],
  .skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible [class*="icon-bbb-"],
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root:hover [class*="icon-bbb-"],
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root.Mui-focusVisible [class*="icon-bbb-"],
  .skyroom-user-actions-menu .MuiMenuItem-root:hover [class*="Option"],
  .skyroom-user-actions-menu .MuiMenuItem-root.Mui-focusVisible [class*="Option"],
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root:hover [class*="Option"],
  .MuiModal-root:has(.skyroom-user-actions-menu) .MuiMenuItem-root.Mui-focusVisible [class*="Option"] {
    color: #0f172a !important;
  }

  .MuiDivider-root {
    margin: 4px 0 !important;
    border-color: rgba(15, 23, 42, 0.08) !important;
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

const copyStylesToWindow = (targetWindow: Window, options?: { isRTL?: boolean }): void => {
  const { document: targetDoc } = targetWindow;

  targetDoc.documentElement.setAttribute('data-skyroom', 'true');
  targetDoc.documentElement.setAttribute('dir', options?.isRTL ? 'rtl' : 'ltr');
  targetDoc.body.setAttribute('dir', options?.isRTL ? 'rtl' : 'ltr');

  const baseStyle = targetDoc.createElement('style');
  baseStyle.textContent = OVERLAY_BASE_CSS;
  targetDoc.head.appendChild(baseStyle);

  // Icon glyphs used by participant rows / menus inside the floating window.
  copyStylesheetLink(targetDoc, 'stylesheets/bbb-icons.css');
};

export default copyStylesToWindow;
