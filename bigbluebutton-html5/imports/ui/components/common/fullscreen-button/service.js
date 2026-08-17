function getFullscreenElement() {
  if (document.fullscreenElement) return document.fullscreenElement;
  if (document.webkitFullscreenElement) return document.webkitFullscreenElement;
  if (document.mozFullScreenElement) return document.mozFullScreenElement;
  if (document.msFullscreenElement) return document.msFullscreenElement;
  return null;
}

const isAnyFullScreen = () => Boolean(getFullscreenElement());

const isFullScreen = (element) => {
  const fsEl = getFullscreenElement();
  if (!fsEl) return false;
  if (!element) return true;
  return fsEl === element || element.contains?.(fsEl) || fsEl.contains?.(element);
};

function cancelFullScreen() {
  const exit = document.exitFullscreen
    || document.mozCancelFullScreen
    || document.webkitExitFullscreen
    || document.msExitFullscreen;
  if (!exit) return;
  try {
    const result = exit.call(document);
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (e) {
    // Already not in fullscreen — ignore.
  }
}

function fullscreenRequest(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  } else {
    return;
  }
  document.activeElement.blur();
  element.focus();
}

const toggleFullScreen = (ref = null) => {
  const element = ref || document.documentElement;

  // Exit if ANY node is fullscreen. Matching only `ref` fails on mobile
  // desktop-mode (iOS/Android) where the FS element is html/body or a wrapper,
  // so a second tap requested fullscreen again and trapped the user.
  if (isAnyFullScreen()) {
    cancelFullScreen();
  } else {
    fullscreenRequest(element);
  }
};

export default {
  toggleFullScreen,
  isFullScreen,
  isAnyFullScreen,
  cancelFullScreen,
  getFullscreenElement,
};
