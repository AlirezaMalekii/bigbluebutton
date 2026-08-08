/**
 * Resolve the chat-column box for floating reaction bubbles.
 * Prefer the live public chat panel; when closed, synthesize the same
 * sidebar column slot so bubbles still rise in the chat area.
 */

const CHAT_PANEL_SELECTORS = [
  '[data-test="publicChatPanel"]',
];

const CONTENT_WRAPPER_SELECTORS = [
  '.resizeSidebarContentWrapper',
];

const USERS_COLUMN_SELECTORS = [
  '[data-test="userListContainer"]',
  '.resizeSidebarNavWrapper',
];

/** Matches skyroom column-layout chat share when both panels are open. */
const CHAT_HEIGHT_RATIO = 0.62;
const MIN_CHAT_HEIGHT = 160;
const DEFAULT_COLUMN_WIDTH = 300;
const GAP = 8;

let lastKnownChatBounds = null;

const toBounds = (rect) => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
  right: rect.right,
  bottom: rect.bottom,
});

export const hasUsableChatBounds = (bounds) => (
  bounds
  && Number(bounds.width) > 0
  && Number(bounds.height) > 0
);

const isVisibleElement = (element) => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const resolveFromSelectors = (selectors) => {
  const selector = selectors.find((candidate) => (
    isVisibleElement(document.querySelector(candidate))
  ));
  if (!selector) return null;

  const element = document.querySelector(selector);
  if (!element) return null;

  return {
    element,
    bounds: toBounds(element.getBoundingClientRect()),
  };
};

const rememberBounds = (resolved) => {
  if (resolved?.bounds && hasUsableChatBounds(resolved.bounds)) {
    lastKnownChatBounds = { ...resolved.bounds };
  }
  return resolved;
};

const getColumnWidth = (layoutEl) => {
  if (!layoutEl) return DEFAULT_COLUMN_WIDTH;
  const style = window.getComputedStyle(layoutEl);
  const raw = parseFloat(style.getPropertyValue('--skyroom-column-width'));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_COLUMN_WIDTH;
};

/**
 * Bottom share of the users/sidebar column — same stack slot chat uses when open.
 */
const synthesizeFromUsersColumn = () => {
  const users = resolveFromSelectors(USERS_COLUMN_SELECTORS);
  if (!users) return null;

  const { bounds } = users;
  const chatHeight = Math.max(
    MIN_CHAT_HEIGHT,
    Math.round(bounds.height * CHAT_HEIGHT_RATIO),
  );
  const top = Math.max(bounds.top, bounds.bottom - chatHeight);
  const height = bounds.bottom - top;
  if (!hasUsableChatBounds({ width: bounds.width, height })) return null;

  return {
    element: users.element,
    bounds: {
      top,
      left: bounds.left,
      width: bounds.width,
      height,
      right: bounds.right,
      bottom: bounds.bottom,
    },
  };
};

/**
 * When no sidebar panels are open, place a ghost chat column using layout
 * CSS geometry / last known bounds / viewport edge.
 */
const synthesizeGhostColumn = () => {
  if (lastKnownChatBounds && hasUsableChatBounds(lastKnownChatBounds)) {
    return {
      element: document.getElementById('layout') || document.documentElement,
      bounds: { ...lastKnownChatBounds },
    };
  }

  const layoutEl = document.getElementById('layout');
  const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
  const isMobile = layoutEl?.hasAttribute('data-skyroom-mobile');
  const columnW = getColumnWidth(layoutEl);
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  if (isMobile) {
    // Bottom zone roughly matches mobile chat tab area (above action/tab bar).
    const bottomReserve = Math.round(viewportH * 0.12);
    const height = Math.max(MIN_CHAT_HEIGHT, Math.round(viewportH * 0.42));
    const top = Math.max(GAP, viewportH - bottomReserve - height);
    const left = GAP;
    const width = Math.max(120, viewportW - GAP * 2);
    return {
      element: layoutEl || document.documentElement,
      bounds: {
        top,
        left,
        width,
        height,
        right: left + width,
        bottom: top + height,
      },
    };
  }

  const top = Math.round(viewportH * 0.28);
  const height = Math.max(MIN_CHAT_HEIGHT, Math.round(viewportH * 0.45));
  const left = isRTL ? GAP : Math.max(GAP, viewportW - columnW - GAP);

  return {
    element: layoutEl || document.documentElement,
    bounds: {
      top,
      left,
      width: columnW,
      height,
      right: left + columnW,
      bottom: top + height,
    },
  };
};

export const resolveChatColumnDomBounds = () => {
  const chatPanel = resolveFromSelectors(CHAT_PANEL_SELECTORS);
  if (chatPanel) return rememberBounds(chatPanel);

  const contentWrapper = resolveFromSelectors(CONTENT_WRAPPER_SELECTORS);
  if (contentWrapper) return rememberBounds(contentWrapper);

  const fromUsers = synthesizeFromUsersColumn();
  if (fromUsers) return rememberBounds(fromUsers);

  return rememberBounds(synthesizeGhostColumn());
};

export default resolveChatColumnDomBounds;
