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

  const handleTouchStart = (event) => {
    if (isWhiteboardChromeTarget(event.target)) return;

    if (event.touches.length === 2) {
      if (!isPresenterRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
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

  const handleTouchMove = throttle({ interval: 175 }, (event) => {
    if (isWhiteboardChromeTarget(event.target)) return;

    if (fingerCountRef.current === 2 && event.touches.length === 2) {
      const [t1, t2] = event.touches;
      const currentDistance = getDistanceBetweenTouches(t1, t2);
      const distanceDiff = Math.abs(currentDistance - initialPinchDistanceRef.current);
      if (distanceDiff > PINCH_THRESHOLD) {
        isPinchingRef.current = true;

        // Pinch-to-zoom for presenters
        if (isPresenterRef.current && tlEditorRef.current && currentPresentationPage) {
          const MAX_ZOOM_FACTOR = 4;
          const MIN_ZOOM_FACTOR = isInfiniteWhiteboard ? 0.25 : 1;
          const ZOOM_STEP = 0.1;

          const { x: cx, y: cy, z: cz } = tlEditorRef.current.getCamera();
          let currentZoomLevel = cz / initialZoomRef.current;

          // Zoom in if fingers moving apart, zoom out if moving together
          if (currentDistance > initialPinchDistanceRef.current) {
            currentZoomLevel = Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM_FACTOR);
          } else {
            currentZoomLevel = Math.max(currentZoomLevel - ZOOM_STEP, MIN_ZOOM_FACTOR);
          }

          const zoomPercentage = currentZoomLevel * 100;
          zoomChanger(zoomPercentage);

          const newCameraZoomFactor = currentZoomLevel * initialZoomRef.current;

          // Calculate center point between the two touches
          const centerX = (t1.clientX + t2.clientX) / 2;
          const centerY = (t1.clientY + t2.clientY) / 2;

          const rect = whiteboardRef.current?.getBoundingClientRect();
          const canvasCenterX = (centerX - (rect?.left || 0)) / cz + cx;
          const canvasCenterY = (centerY - (rect?.top || 0)) / cz + cy;

          const nextCamera = {
            x: cx + (canvasCenterX - cx) * (cz / newCameraZoomFactor - 1),
            y: cy + (canvasCenterY - cy) * (cz / newCameraZoomFactor - 1),
            z: newCameraZoomFactor,
          };

          tlEditorRef.current.setCamera(nextCamera, { duration: 175 });

          // Update initial distance for continuous pinch
          initialPinchDistanceRef.current = currentDistance;
        }
      }
    }
  });

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
      presentationWrapper.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
      presentationWrapper.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
      presentationWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
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
        presentationWrapper.removeEventListener('touchmove', handleTouchMove);
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

const isSkyroomMobileMoreMenuMode = () => {
  if (!isSkyroomMobileViewport()) return false;
  return Boolean(document.getElementById('layout')?.hasAttribute('data-skyroom-mobile'));
};

// Nudge Radix "more" overflow menu above the bottom toolbar on phone.
/* eslint-disable no-param-reassign */
const anchorSkyroomMoreMenuAboveTrigger = () => {
  if (!isSkyroomMobileMoreMenuMode()) return;

  const root = document.getElementById('whiteboard-element');
  if (!root) return;

  const menu = root.querySelector('.tlui-menu[data-state="open"]:has(.tlui-buttons__grid)');
  const trigger = root.querySelector('button[data-testid="tools.more"]');
  if (!menu || !trigger) return;

  const gap = 10;
  const triggerRect = trigger.getBoundingClientRect();
  const stageRect = (
    document.getElementById('presentationInnerWrapper') || root
  ).getBoundingClientRect();
  const presentationToolbar = document.getElementById('presentationToolbarWrapper');
  const wbBottomBar = root.querySelector('.tlui-layout__bottom');
  const reservedBottom = (
    (presentationToolbar?.getBoundingClientRect().height || 0)
    + (wbBottomBar?.getBoundingClientRect().height || 0)
    + gap
  );

  const menuHeight = menu.offsetHeight > 0 ? menu.offsetHeight : menu.scrollHeight;
  const menuWidth = menu.offsetWidth > 0 ? menu.offsetWidth : menu.scrollWidth;

  let top = triggerRect.top - menuHeight - gap;
  top = Math.max(stageRect.top + gap, top);

  const viewportMaxBottom = window.innerHeight - reservedBottom - gap;
  if (top + menuHeight > viewportMaxBottom) {
    top = Math.max(stageRect.top + gap, viewportMaxBottom - menuHeight);
  }

  let left = triggerRect.left + (triggerRect.width / 2) - (menuWidth / 2);
  left = Math.max(stageRect.left + gap, left);
  left = Math.min(left, stageRect.right - menuWidth - gap);

  const desiredTop = `${Math.round(top)}px`;
  const desiredLeft = `${Math.round(left)}px`;

  // Idempotent: if the menu is already anchored where we want it, don't rewrite its style.
  // Rewriting on every mutation nudges the element between touchstart and touchend, which
  // cancels the tap on phones — that was why the menu items appeared to "do nothing".
  if (
    menu.dataset.skyroomMoreMenuAnchored === 'true'
    && menu.style.top === desiredTop
    && menu.style.left === desiredLeft
  ) {
    return;
  }

  menu.style.setProperty('position', 'fixed', 'important');
  menu.style.setProperty('top', desiredTop, 'important');
  menu.style.setProperty('left', desiredLeft, 'important');
  menu.style.setProperty('right', 'auto', 'important');
  menu.style.setProperty('bottom', 'auto', 'important');
  menu.style.setProperty('transform', 'none', 'important');
  menu.style.setProperty('margin', '0', 'important');
  menu.style.setProperty('z-index', '1105', 'important');
  menu.dataset.skyroomMoreMenuAnchored = 'true';
};
/* eslint-enable no-param-reassign */

/** Reposition tools.more overflow grid above the trigger; Radix open/close stays native. */
const useSkyroomMoreMenuAnchor = (enabled) => {
  React.useEffect(() => {
    if (!enabled) return undefined;

    document.querySelectorAll('#skyroom-wb-popover-portal, [data-skyroom-wb-popover-portal="true"]').forEach((el) => {
      el.remove();
    });

    let rafId = null;

    const schedule = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        anchorSkyroomMoreMenuAboveTrigger();
        rafId = requestAnimationFrame(() => {
          rafId = null;
          anchorSkyroomMoreMenuAboveTrigger();
        });
      });
    };

    const root = document.getElementById('whiteboard-element');
    const observer = root
      ? new MutationObserver(schedule)
      : null;

    observer?.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'style'],
      childList: true,
    });

    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [enabled]);
};

export {
  useMouseEvents,
  useCursor,
  useSkyroomMoreMenuAnchor,
};
