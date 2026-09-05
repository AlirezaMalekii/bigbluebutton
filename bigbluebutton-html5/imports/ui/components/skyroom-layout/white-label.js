/** Product name shown instead of BigBlueButton in the meeting UI. */
export const SKYROOM_PRODUCT_NAME = 'سیف میت';
export const SKYROOM_PRODUCT_NAME_EN = 'SafeMeet';
export const SKYROOM_PLATFORM_URL = 'https://safemeet.ir';
export const SKYROOM_PLATFORM_LOGO_PATH = '/resources/images/skyroom/SafeMeet.ir.svg';
export const SKYROOM_PLATFORM_ICON_PATH = '/resources/images/skyroom/SafeMeet-icon.svg';
export const SKYROOM_ROOMEET_NAME = 'رومیت';
export const SKYROOM_ROOMEET_NAME_EN = 'RooMeet';
export const SKYROOM_ROOMEET_URL = 'https://roomeet.ir';
export const SKYROOM_ROOMEET_LOGO_PATH = '/resources/images/skyroom/Roomeet.ir.svg';
export const SKYROOM_ROOMEET_LOGO_COMPACT_PATH = '/resources/images/skyroom/Roomeet-lockup-compact.svg';
export const SKYROOM_ROOMEET_LOGO_LIGHT_PATH = '/resources/images/skyroom/Roomeet.ir-light.svg';
export const SKYROOM_ROOMEET_ICON_PATH = '/resources/images/skyroom/Roomeet-icon.svg';
export const SKYROOM_PLATFORM_LOGO_COMPACT_PATH = '/resources/images/skyroom/SafeMeet-lockup-compact.svg';

export const getBrandingThemeId = (settings = window.meetingClientSettings) => (
  settings?.public?.app?.branding?.themeId?.trim().toLowerCase() ?? ''
);

export const isRoomeetBrand = (settings) => getBrandingThemeId(settings) === 'roomeet';

/** Active install theme: RooMeet when `--theme-id roomeet`, otherwise SafeMeet. */
export const getSkyroomBrand = (settings) => {
  if (isRoomeetBrand(settings)) {
    return {
      id: 'roomeet',
      nameFa: SKYROOM_ROOMEET_NAME,
      nameEn: SKYROOM_ROOMEET_NAME_EN,
      url: SKYROOM_ROOMEET_URL,
    };
  }
  return {
    id: 'safemeet',
    nameFa: SKYROOM_PRODUCT_NAME,
    nameEn: SKYROOM_PRODUCT_NAME_EN,
    url: SKYROOM_PLATFORM_URL,
  };
};

export const applySkyroomBrandFavicon = (settings = window.meetingClientSettings) => {
  if (typeof document === 'undefined') return;

  const basename = settings?.public?.app?.basename ?? '';
  const iconPath = isRoomeetBrand(settings)
    ? SKYROOM_ROOMEET_ICON_PATH
    : SKYROOM_PLATFORM_ICON_PATH;
  const href = `${basename}${iconPath}`;
  let favicon = document.querySelector('link[data-skyroom-brand-favicon]');

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.setAttribute('data-skyroom-brand-favicon', '');
    document.head.appendChild(favicon);
  }

  if (favicon.getAttribute('href') !== href) {
    favicon.setAttribute('href', href);
  }
};

const getBbbTextReplacements = () => {
  const brand = getSkyroomBrand();
  return [
    [/BigBlueButton\s*Inc\.?/gi, ''],
    [/BigBlueButton/gi, brand.nameEn],
    [/بیگ[\s‌-]*بلو[\s‌-]*باتن/gi, brand.nameFa],
    [/bigbluebutton/gi, brand.id],
  ];
};

const scrubString = (value) => {
  if (typeof value !== 'string' || !value) return value;
  return getBbbTextReplacements().reduce(
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
  const brand = getSkyroomBrand(target);
  applySkyroomBrandFavicon(target);

  if (app) {
    app.clientTitle = brand.nameFa;
    app.copyright = `© ${new Date().getFullYear()} ${brand.nameEn}. All rights reserved.`;
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
let pendingScrubNodes = [];
let scrubFrame = 0;

const MAYBE_UPSTREAM_BRAND = /big|بیگ|bbb/i;
const SKIP_HOT_TAGS = new Set(['VIDEO', 'CANVAS', 'SVG', 'PATH', 'IMG', 'SOURCE', 'TRACK']);
const SKIP_HOT_SELECTOR = [
  '#whiteboard-element',
  '#whiteboard-container',
  '.tl-container',
  '.tl-canvas',
  '[data-test="webcamVideoItem"]',
  '#cameraDock',
  '#skyroom-stage-webcam-dock',
  '#skyroom-sidebar-webcam-dock',
  '#skyroom-center-webcam-dock',
  'video',
  'canvas',
  'svg',
].join(',');

const isHotMediaNode = (node) => {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (SKIP_HOT_TAGS.has(node.tagName)) return true;
  return typeof node.closest === 'function' && node.closest(SKIP_HOT_SELECTOR);
};

const scrubTextNode = (node) => {
  const original = node.textContent;
  if (!original || !MAYBE_UPSTREAM_BRAND.test(original)) return;
  const next = scrubString(original);
  if (next !== original) {
    // eslint-disable-next-line no-param-reassign
    node.textContent = next;
  }
};

const scrubElementTree = (root) => {
  if (!root || isHotMediaNode(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent && isHotMediaNode(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    scrubTextNode(node);
    node = walker.nextNode();
  }
};

const flushPendingScrubs = () => {
  scrubFrame = 0;
  const nodes = pendingScrubNodes;
  pendingScrubNodes = [];
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && isHotMediaNode(parent)) return;
      scrubTextNode(node);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && document.contains(node)) {
      scrubElementTree(node);
    }
  });
};

const queueScrubNode = (node) => {
  pendingScrubNodes.push(node);
  if (scrubFrame) return;
  scrubFrame = window.requestAnimationFrame(flushPendingScrubs);
};

/**
 * Catches late-rendered strings (toasts, plugins, server-driven labels).
 * Do not watch tldraw/webcam trees or characterData — those mutate every frame
 * and were a major meeting-page CPU cost.
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
          const parent = node.parentElement;
          if (parent && isHotMediaNode(parent)) return;
          queueScrubNode(node);
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && !isHotMediaNode(node)) {
          queueScrubNode(node);
        }
      });
    });
  });

  domObserver.observe(root, {
    childList: true,
    subtree: true,
  });
};

export const stopSkyroomWhiteLabelDomWatch = () => {
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  if (scrubFrame) {
    window.cancelAnimationFrame(scrubFrame);
    scrubFrame = 0;
  }
  pendingScrubNodes = [];
};
