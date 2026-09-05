import React, { useEffect } from 'react';
import { throttle } from 'radash';
import { isSkyroomMobileViewport } from '/imports/ui/components/skyroom-layout/panel-toggles';

const WHITEBOARD_CHROME_SELECTOR = [
  '.tlui-layout__bottom',
  '.tlui-toolbar',
  '.tlui-popover__content',
  '.tlui-menu',
  '.tlui-style-panel__wrapper',
  '.tlui-style-panel',
  '[role="dialog"]',
].join(', ');

const isWhiteboardChromeTarget = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(WHITEBOARD_CHROME_SELECTOR));
};

const hasBackgroundImageUrl = (el) => {
  const style = window.getComputedStyle(el);
  const bg = style.backgroundImage || '';
  return bg.includes('url(');
};

const useCursor = (publishCursorUpdate, whiteboardId) => {
  const publishRef = React.useRef(publishCursorUpdate);
  const whiteboardIdRef = React.useRef(whiteboardId);
  const pendingRef = React.useRef(null);
  const rafRef = React.useRef(null);

  useEffect(() => { publishRef.current = publishCursorUpdate; }, [publishCursorUpdate]);
  useEffect(() => { whiteboardIdRef.current = whiteboardId; }, [whiteboardId]);

  useEffect(() => () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (pendingRef.current) {
        publishRef.current({
          whiteboardId: whiteboardIdRef.current,
          ...pendingRef.current,
        });
        pendingRef.current = null;
      }
    }
  }, []);

  const updateCursorPosition = React.useCallback((newX, newY) => {
    if (newX === undefined || newX === null || newY === undefined || newY === null) return;
    pendingRef.current = { xPercent: newX, yPercent: newY };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) {
          publishRef.current({
            whiteboardId: whiteboardIdRef.current,
            ...pendingRef.current,
          });
          pendingRef.current = null;
        }
      });
    }
  }, []);

  return updateCursorPosition;
};

const getPresentationOptionsMenuItem = () => document.querySelector('[data-test="presentationFullscreen"]')
    || document.querySelector('[data-test="presentationSnapshot"]')
    || document.querySelector('[data-test="toolVisibility"]')
    || document.querySelector('[data-test="clearAnnotations"]')
    || null;

const getTldrawOpenMenu = () => {
  const tlElement = document.querySelectorAll('[id^=radix-]');
  const tldrawMenu = Array.from(tlElement).find((el) => {
    const menuClasses = ['tlui-popover__content', 'tlui-menu'];
    if (el && menuClasses.includes(el.className)) {
      return el;
    }
    return false;
  });
  return tldrawMenu;
};

const useMouseEvents = ({
  whiteboardRef, tlEditorRef, isWheelZoomRef, initialZoomRef, isPresenterRef,
}, {
  hasWBAccess,
  whiteboardToolbarAutoHide,
  animations,
  updateCursorPosition,
  toggleToolsAnimations,
  currentPresentationPage,
  zoomChanger,
  setIsMouseDown,
  setIsWheelZoom,
  setWheelZoomTimeout,
  isInfiniteWhiteboard,
}) => {
  const timeoutIdRef = React.useRef();
  const fingerCountRef = React.useRef(0);
  const initialPinchDistanceRef = React.useRef(0);
  const isPinchingRef = React.useRef(false);
  const mouseLeaveTimeoutRef = React.useRef();
  const PINCH_THRESHOLD = 10;

  const getDistanceBetweenTouches = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseUp = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    timeoutIdRef.current = setTimeout(() => {
      setIsMouseDown(false);
    }, 1000);

    tlEditorRef?.current?.updateInstanceState({ canMoveCamera: true, isReadonly: false });
  };

  const handleMouseDownWhiteboard = (event) => {
    if (!isPresenterRef.current && !hasWBAccess) {
      const updateProps = { isReadonly: false };

      if (event.button === 1) {
        updateProps.canMoveCamera = false;
      }

      tlEditorRef?.current?.updateInstanceState(updateProps);
    }

    setIsMouseDown(true);
  };

  const handleMouseDownWindow = (event) => {
    const { target } = event;
    const editor = tlEditorRef.current;
    const presentationInnerWrapper = document.getElementById('presentationInnerWrapper');

    if (!(presentationInnerWrapper && presentationInnerWrapper.contains(target))) {
      if (editor?.getEditingShape()) {
        return editor.complete();
      }
    }

    const selectedShapes = editor?.getSelectedShapes();
    if (
      selectedShapes?.length === 1
      && selectedShapes[0].type === 'frame'
      && editor?.getCurrentToolId() === 'select'
      && !target.matches('[data-testid*="selection.resize"]')
      && !target.matches('[data-testid*="selection.target"]')
      && hasBackgroundImageUrl(target)
    ) {
      editor.selectNone();
      return editor.complete();
    }

    return undefined;
  };

  const handleMouseEnter = () => {
    clearTimeout(mouseLeaveTimeoutRef.current);
    if (whiteboardToolbarAutoHide) {
      toggleToolsAnimations(
        'fade-out',
        'fade-in',
        animations ? '.3s' : '0s',
        hasWBAccess || isPresenterRef.current,
      );
    }
  };

  const handleMouseLeave = () => {
    if (whiteboardToolbarAutoHide) {
      clearTimeout(mouseLeaveTimeoutRef.current);
      const presentationWBOptionsMenuItem = getPresentationOptionsMenuItem();
      const tldrawMenu = getTldrawOpenMenu();
      if (presentationWBOptionsMenuItem || tldrawMenu) {
        if (tldrawMenu) {
          mouseLeaveTimeoutRef.current = setTimeout(() => {
            handleMouseLeave();
          }, 500);
        } else if (presentationWBOptionsMenuItem) {
          const ulElement = presentationWBOptionsMenuItem.parentElement;
          const menuWrapper = ulElement.parentElement;
          const isVisible = menuWrapper.style.visibility !== 'hidden';
          if (isVisible) {
            mouseLeaveTimeoutRef.current = setTimeout(() => {
              handleMouseLeave();
            }, 500);
          } else {
            toggleToolsAnimations(
              'fade-in',
              'fade-out',
              animations ? '3s' : '0s',
              hasWBAccess || isPresenterRef.current,
            );
          }
        } else {
          toggleToolsAnimations(
            'fade-in',
            'fade-out',
            animations ? '3s' : '0s',
            hasWBAccess || isPresenterRef.current,
          );
        }
      }
    }

    setTimeout(() => {
      updateCursorPosition(-1, -1);
    }, 150);
  };

  useEffect(() => () => clearTimeout(mouseLeaveTimeoutRef.current), []);

  const handleMouseWheel = throttle({ interval: 175 }, (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!tlEditorRef.current || !isPresenterRef.current || !currentPresentationPage) {
      return;
    }

    setIsWheelZoom(true);

    const MAX_ZOOM_FACTOR = 4; // Represents 400%
    const MIN_ZOOM_FACTOR = isInfiniteWhiteboard ? 0.25 : 1;
    const ZOOM_IN_FACTOR = 0.25;
    const ZOOM_OUT_FACTOR = 0.25;

    // Get the current mouse position
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Get the current camera position and zoom level
    const { x: cx, y: cy, z: cz } = tlEditorRef.current.getCamera();

    let currentZoomLevel = cz / initialZoomRef.current;
    if (event.deltaY < 0) {
      currentZoomLevel = Math.min(currentZoomLevel + ZOOM_IN_FACTOR, MAX_ZOOM_FACTOR);
    } else {
      currentZoomLevel = Math.max(currentZoomLevel - ZOOM_OUT_FACTOR, MIN_ZOOM_FACTOR);
    }

    // Convert zoom level to a percentage for backend
    const zoomPercentage = currentZoomLevel * 100;
    zoomChanger(zoomPercentage);

    // Calculate the new camera zoom factor
    const newCameraZoomFactor = currentZoomLevel * initialZoomRef.current;

    // Calculate the mouse position in canvas space using whiteboardRef
    const rect = whiteboardRef.current?.getBoundingClientRect();
    const canvasMouseX = (mouseX - (rect?.left || 0)) / cz + cx;
    const canvasMouseY = (mouseY - (rect?.top || 0)) / cz + cy;

    // Calculate the new camera position to keep the mouse position under the cursor
    const nextCamera = {
      x: cx + (canvasMouseX - cx) * (cz / newCameraZoomFactor - 1),
      y: cy + (canvasMouseY - cy) * (cz / newCameraZoomFactor - 1),
      z: newCameraZoomFactor,
    };

    tlEditorRef.current.setCamera(nextCamera, { duration: 175 });

    if (isWheelZoomRef.currentTimeout) {
      clearTimeout(isWheelZoomRef.currentTimeout);
    }

    setWheelZoomTimeout();
  });

  const handlePointerDown = (event) => {
    if (isWhiteboardChromeTarget(event.target)) return;

    if (!event.isPrimary && event.pointerType === 'touch' && !isPresenterRef.current) {
      event.stopPropagation();
      tlEditorRef.current?.cancel();
    }
  };

  const applyPresenterPinchZoom = throttle({ interval: 175 }, (event) => {
    if (!isPresenterRef.current || !tlEditorRef.current || !currentPresentationPage) return;
    if (event.touches.length !== 2) return;

    const [t1, t2] = event.touches;
    const currentDistance = getDistanceBetweenTouches(t1, t2);
    const MAX_ZOOM_FACTOR = 4;
    const MIN_ZOOM_FACTOR = isInfiniteWhiteboard ? 0.25 : 1;
    const ZOOM_STEP = 0.1;

    const { x: cx, y: cy, z: cz } = tlEditorRef.current.getCamera();
    let currentZoomLevel = cz / initialZoomRef.current;

    if (currentDistance > initialPinchDistanceRef.current) {
      currentZoomLevel = Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM_FACTOR);
    } else {
      currentZoomLevel = Math.max(currentZoomLevel - ZOOM_STEP, MIN_ZOOM_FACTOR);
    }

    const zoomPercentage = currentZoomLevel * 100;
    zoomChanger(zoomPercentage);

    const newCameraZoomFactor = currentZoomLevel * initialZoomRef.current;
    const centerX = (t1.clientX + t2.clientX) / 2;
    const centerY = (t1.clientY + t2.clientY) / 2;
    const rect = whiteboardRef.current?.getBoundingClientRect();
    const canvasCenterX = (centerX - (rect?.left || 0)) / cz + cx;
    const canvasCenterY = (centerY - (rect?.top || 0)) / cz + cy;

    tlEditorRef.current.setCamera({
      x: cx + (canvasCenterX - cx) * (cz / newCameraZoomFactor - 1),
      y: cy + (canvasCenterY - cy) * (cz / newCameraZoomFactor - 1),
      z: newCameraZoomFactor,
    }, { duration: 175 });

    initialPinchDistanceRef.current = currentDistance;
  });

  const handleTouchStart = (event) => {
    if (isWhiteboardChromeTarget(event.target)) return;

    if (event.touches.length === 2) {
      // Do not preventDefault: a non-passive listener on the stage delays pen ink.
      event.stopPropagation();
      fingerCountRef.current = 2;
      isPinchingRef.current = false;
      const [t1, t2] = event.touches;
      initialPinchDistanceRef.current = getDistanceBetweenTouches(t1, t2);
    } else if (event.touches.length === 3) {
      fingerCountRef.current = 3;
    } else {
      fingerCountRef.current = 0;
    }
  };

  const handleTouchMove = (event) => {
    // One finger / stylus must reach tldraw on the same frame. Never throttle
    // or preventDefault this path — that is what made strokes lag and drift.
    if (event.touches.length !== 2) return;
    if (isWhiteboardChromeTarget(event.target)) return;

    event.stopPropagation();
    const [t1, t2] = event.touches;
    const currentDistance = getDistanceBetweenTouches(t1, t2);
    if (Math.abs(currentDistance - initialPinchDistanceRef.current) > PINCH_THRESHOLD) {
      isPinchingRef.current = true;
      applyPresenterPinchZoom(event);
    }
  };

  const handleTouchEnd = (event) => {
    if (isWhiteboardChromeTarget(event.target)) return;

    if (event.touches.length === 0) {
      const count = fingerCountRef.current;

      if (!hasWBAccess && !isPresenterRef.current) return;

      if (count === 2) {
        if (!isPinchingRef.current && hasWBAccess) {
          tlEditorRef.current?.undo();
        }
      } else if (count === 3 && hasWBAccess) {
        tlEditorRef.current?.redo();
      }
      fingerCountRef.current = 0;
      isPinchingRef.current = false;
      initialPinchDistanceRef.current = 0;
    }
  };

  React.useEffect(() => {
    if (whiteboardToolbarAutoHide) {
      toggleToolsAnimations(
        'fade-in',
        'fade-out',
        animations ? '3s' : '0s',
        hasWBAccess || isPresenterRef.current,
      );
    } else {
      toggleToolsAnimations(
        'fade-out',
        'fade-in',
        animations ? '.3s' : '0s',
        hasWBAccess || isPresenterRef.current,
      );
    }
  }, [whiteboardToolbarAutoHide]);

  React.useEffect(() => {
    const presentationWrapper = document.getElementById('presentationInnerWrapper');
    window.addEventListener('mousedown', handleMouseDownWindow);
    if (presentationWrapper) {
      presentationWrapper.addEventListener('mousedown', handleMouseDownWhiteboard);
      presentationWrapper.addEventListener('mouseup', handleMouseUp);
      presentationWrapper.addEventListener('mouseenter', handleMouseEnter);
      presentationWrapper.addEventListener('mouseleave', handleMouseLeave);
      presentationWrapper.addEventListener('wheel', handleMouseWheel, { passive: false, capture: true });
      presentationWrapper.addEventListener('pointerdown', handlePointerDown, { capture: true });
      presentationWrapper.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
      presentationWrapper.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
      presentationWrapper.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
    }

    return () => {
      if (presentationWrapper) {
        presentationWrapper.removeEventListener('mousedown', handleMouseDownWhiteboard);
        presentationWrapper.removeEventListener('mouseup', handleMouseUp);
        presentationWrapper.removeEventListener('mouseenter', handleMouseEnter);
        presentationWrapper.removeEventListener('mouseleave', handleMouseLeave);
        presentationWrapper.removeEventListener('wheel', handleMouseWheel, { capture: true });
        presentationWrapper.removeEventListener('pointerdown', handlePointerDown, { capture: true });
        presentationWrapper.removeEventListener('touchstart', handleTouchStart, { capture: true });
        presentationWrapper.removeEventListener('touchend', handleTouchEnd, { capture: true });
        presentationWrapper.removeEventListener('touchmove', handleTouchMove, { capture: true });
      }
      window.removeEventListener('mousedown', handleMouseDownWindow);
    };
  }, [
    tlEditorRef,
    isPresenterRef,
    handleMouseDownWhiteboard,
    handleMouseUp,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseWheel,
  ]);
};

const isSkyroomMobileStylePanelMode = () => {
  if (!isSkyroomMobileViewport()) return false;
  return Boolean(document.getElementById('layout')?.hasAttribute('data-skyroom-mobile'));
};

const STYLE_PANEL_ANCHOR_PROPS = [
  'position', 'top', 'left', 'right', 'bottom', 'transform', 'margin', 'z-index',
];

const isStylePanelPopoverOpen = (el) => {
  if (!el) return false;
  if (el.getAttribute('data-state') === 'open') return true;
  return Boolean(el.querySelector?.('[data-state="open"]'));
};

/* eslint-disable no-param-reassign */
const anchorSkyroomMobileStylePanel = () => {
  if (!isSkyroomMobileStylePanelMode()) return;

  const root = document.getElementById('whiteboard-element');
  if (!root) return;

  const trigger = root.querySelector('button[data-testid="mobile.styles"][data-state="open"]')
    || root.querySelector('button[data-testid="mobile.styles"][aria-expanded="true"]');

  // Only the styles popover (requires StylePanel body). Retry via rAF if it mounts late.
  const popover = root.querySelector('.tlui-popover__content[data-state="open"]:has(.tlui-style-panel)')
    || root.querySelector('[role="dialog"][data-state="open"]:has(.tlui-style-panel)');

  if (!trigger || !popover) return;

  // Radix wraps content in a transformed popper node. Viewport coords must be
  // applied on that wrapper (or transform:none first) — not only on the content.
  const anchorTarget = popover.closest('[data-radix-popper-content-wrapper]') || popover;

  const gap = 8;
  const triggerRect = trigger.getBoundingClientRect();
  const popoverHeight = Math.max(
    popover.offsetHeight,
    popover.scrollHeight,
    anchorTarget.offsetHeight,
    0,
  );
  const popoverWidth = Math.max(
    popover.offsetWidth,
    popover.scrollWidth,
    anchorTarget.offsetWidth,
    0,
  );

  if (popoverHeight < 4 || popoverWidth < 4) return;

  const stageRect = (
    document.getElementById('presentationInnerWrapper') || root
  ).getBoundingClientRect();

  let top = triggerRect.top - popoverHeight - gap;
  top = Math.max(stageRect.top + gap, Math.min(top, triggerRect.top - gap - 4));

  let left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
  left = Math.max(stageRect.left + gap, left);
  left = Math.min(left, stageRect.right - popoverWidth - gap);

  const desiredTop = `${Math.round(top)}px`;
  const desiredLeft = `${Math.round(left)}px`;

  if (
    anchorTarget.dataset.skyroomMobileStylePanelAnchored === 'true'
    && anchorTarget.style.top === desiredTop
    && anchorTarget.style.left === desiredLeft
  ) {
    return;
  }

  anchorTarget.style.setProperty('position', 'fixed', 'important');
  anchorTarget.style.setProperty('top', desiredTop, 'important');
  anchorTarget.style.setProperty('left', desiredLeft, 'important');
  anchorTarget.style.setProperty('right', 'auto', 'important');
  anchorTarget.style.setProperty('bottom', 'auto', 'important');
  anchorTarget.style.setProperty('transform', 'none', 'important');
  anchorTarget.style.setProperty('margin', '0', 'important');
  anchorTarget.style.setProperty('z-index', '1500', 'important');
  anchorTarget.dataset.skyroomMobileStylePanelAnchored = 'true';

  // Keep content in normal flow inside the fixed wrapper.
  if (anchorTarget !== popover) {
    popover.style.setProperty('position', 'relative', 'important');
    popover.style.setProperty('transform', 'none', 'important');
    popover.style.setProperty('top', 'auto', 'important');
    popover.style.setProperty('left', 'auto', 'important');
    popover.style.setProperty('margin', '0', 'important');
    popover.dataset.skyroomMobileStylePanelAnchored = 'true';
  }
};

const clearSkyroomMobileStylePanelAnchors = () => {
  document.querySelectorAll('[data-skyroom-mobile-style-panel-anchored="true"]').forEach((el) => {
    if (isStylePanelPopoverOpen(el)) return;
    delete el.dataset.skyroomMobileStylePanelAnchored;
    STYLE_PANEL_ANCHOR_PROPS.forEach((prop) => el.style.removeProperty(prop));
  });
};
/* eslint-enable no-param-reassign */

/**
 * tldraw ToolbarButton selects on both touchstart and click. Its touchstart handler
 * also calls preventDefault from React's passive listener, which warns and cannot
 * suppress the click. Keep touch interactions on the standard click path so every
 * toolbar action runs once; mouse and keyboard behavior remain unchanged.
 */
const useSkyroomToolbarTouchFix = (enabled) => {
  React.useEffect(() => {
    if (!enabled) return undefined;

    const root = document.getElementById('whiteboard-element');
    if (!root) return undefined;

    const onTouchStart = (event) => {
      const { target } = event;
      if (!(target instanceof Element)) return;
      const button = target.closest(
        '.tlui-toolbar button[data-testid^="tools."], .tlui-toolbar button[data-testid="mobile.styles"]',
      );
      if (!button || !root.contains(button)) return;
      event.stopPropagation();
    };

    root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    return () => {
      root.removeEventListener('touchstart', onTouchStart, { capture: true });
    };
  }, [enabled]);
};

/** Anchor the pen color/size panel above mobile.styles on phone — style panel only. */
const useSkyroomMobileStylePanelAnchor = (enabled) => {
  React.useEffect(() => {
    if (!enabled) return undefined;

    let rafId = null;

    const schedule = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        clearSkyroomMobileStylePanelAnchors();
        anchorSkyroomMobileStylePanel();
        // Second frame: StylePanel may mount after the popover shell opens.
        rafId = requestAnimationFrame(() => {
          rafId = null;
          anchorSkyroomMobileStylePanel();
        });
      });
    };

    const root = document.getElementById('whiteboard-element');
    const observer = root
      ? new MutationObserver(schedule)
      : null;

    // Do not observe `style` — our own fixed positioning would retrigger forever.
    observer?.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-expanded'],
      childList: true,
    });

    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.querySelectorAll('[data-skyroom-mobile-style-panel-anchored="true"]').forEach((el) => {
        el.removeAttribute('data-skyroom-mobile-style-panel-anchored');
        STYLE_PANEL_ANCHOR_PROPS.forEach((prop) => el.style.removeProperty(prop));
      });
    };
  }, [enabled]);
};

export {
  useMouseEvents,
  useCursor,
  useSkyroomToolbarTouchFix,
  useSkyroomMobileStylePanelAnchor,
};
