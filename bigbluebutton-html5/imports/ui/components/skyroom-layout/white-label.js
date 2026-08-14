/** Product name shown instead of BigBlueButton in the meeting UI. */
export const SKYROOM_PRODUCT_NAME = 'سیف میت';
export const SKYROOM_PRODUCT_NAME_EN = 'SafeMeet';
export const SKYROOM_PLATFORM_URL = 'https://safemeet.ir';
export const SKYROOM_PLATFORM_LOGO_PATH = '/resources/images/skyroom/SafeMeet.ir.svg';
export const SKYROOM_PLATFORM_ICON_PATH = '/resources/images/skyroom/SafeMeet-icon.svg';
export const SKYROOM_ROOMEET_URL = 'https://roomeet.ir';
export const SKYROOM_ROOMEET_LOGO_PATH = '/resources/images/skyroom/Roomeet.ir.svg';
export const SKYROOM_ROOMEET_LOGO_LIGHT_PATH = '/resources/images/skyroom/Roomeet.ir-light.svg';
export const SKYROOM_ROOMEET_ICON_PATH = '/resources/images/skyroom/Roomeet-icon.svg';

const BBB_TEXT_REPLACEMENTS = [
  [/BigBlueButton\s*Inc\.?/gi, ''],
  [/BigBlueButton/gi, SKYROOM_PRODUCT_NAME_EN],
  [/بیگ[\s‌-]*بلو[\s‌-]*باتن/gi, SKYROOM_PRODUCT_NAME],
  [/bigbluebutton/gi, 'safemeet'],
];

const scrubString = (value) => {
  if (typeof value !== 'string' || !value) return value;
  return BBB_TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  ).replace(/\s{2,}/g, ' ').trim();
};

/**
 * Patches client settings from the server so titles, about, and help never
 * expose the upstream product name.
 */
export const applySkyroomWhiteLabelSettings = (settings) => {
  const target = settings || window.meetingClientSettings;
  if (!target?.public) return target;

  const { app, settings: publicSettings } = target.public;

  if (app) {
    app.clientTitle = SKYROOM_PRODUCT_NAME;
    app.copyright = `© ${new Date().getFullYear()} RooMeet. All rights reserved.`;
    app.displayBbbServerVersion = false;
    app.helpLink = '';
    if (app.bbbTabletApp) {
      app.bbbTabletApp.enabled = false;
    }
  }

  if (publicSettings) {
    publicSettings.showHelpButton = false;
  }

  return target;
};

let domObserver = null;

const scrubTextNode = (node) => {
  const original = node.textContent;
  const next = scrubString(original);
  if (next !== original) {
    // eslint-disable-next-line no-param-reassign
    node.textContent = next;
  }
};

const scrubElementTree = (root) => {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    scrubTextNode(node);
    node = walker.nextNode();
  }
};

/**
 * Catches late-rendered strings (toasts, plugins, server-driven labels).
 */
export const startSkyroomWhiteLabelDomWatch = () => {
  if (domObserver || typeof document === 'undefined') return;

  const root = document.getElementById('app') || document.body;
  if (!root) return;

  scrubElementTree(root);

  domObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          scrubTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scrubElementTree(node);
        }
      });
    });
  });

  domObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

export const stopSkyroomWhiteLabelDomWatch = () => {
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
};
