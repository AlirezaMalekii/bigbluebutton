/* eslint-disable max-len, react/prop-types, import/no-extraneous-dependencies */
import * as React from 'react';
import PropTypes from 'prop-types';
import { useRef, useCallback, useState } from 'react';
import { defineMessages } from 'react-intl';
import { isEqual } from 'radash';
import {
  Tldraw,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  DefaultHorizontalAlignStyle,
  DefaultVerticalAlignStyle,
  setDefaultUiAssetUrls,
  setDefaultEditorAssetUrls,
  toolbarItem,
} from '@bigbluebutton/tldraw';
import {
  GeoShapeGeoStyle,
} from '@bigbluebutton/editor';
import '@bigbluebutton/tldraw/tldraw.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import SlideCalcUtil, { HUNDRED_PERCENT } from '/imports/utils/slideCalcUtils';
import getFromUserSettings from '/imports/ui/services/users-settings';
import KEY_CODES from '/imports/utils/keyCodes';
import { debounce } from '/imports/utils/debounce';
import logger from '/imports/startup/client/logger';
import Styled from './styles';
import {
  mapLanguage,
  isValidShapeType,
  usePrevious,
  getDifferences,
} from './utils';
import {
  useMouseEvents,
  useCursor,
  useSkyroomToolbarTouchFix,
  useSkyroomMobileStylePanelAnchor,
} from './hooks';
import {
  notifyShapeNumberExceeded, getCustomEditorAssetUrls, getCustomAssetUrls,
  debouncedUpdateShapes, sanitizeShape,
} from './service';
import NoopTool from './custom-tools/noop-tool/component';
import DeleteSelectedItemsTool from './custom-tools/delete-selected-items/component';
import SessionStorage from '/imports/ui/services/storage/session';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

const USER_CAMERA_INTERACTION_MS = (
  window.meetingClientSettings?.public?.presentation?.panZoomInterval || 200
);

const CENTER_OFFSET_PUBLISH_EPSILON = 0.5;
const BG_SHAPE_ID_PREFIX = 'shape:BG-';

const isBackgroundShapeId = (id) => typeof id === 'string' && id.startsWith(BG_SHAPE_ID_PREFIX);

const isBackgroundShape = (shape) => isBackgroundShapeId(shape?.id);

// Viewport for letterbox centering. Do NOT feed this into widthGap zoom math.
// Skyroom uses a fitted svg box (#presentationInnerWrapper = slide size); prefer
// that DOM size so hideUi / tldraw chrome cannot shift the camera origin.
const resolveCameraViewportSize = (editor, fallbackWidth, fallbackHeight) => {
  const bounds = editor?.getViewportScreenBounds?.();
  let width = bounds?.width > 0 ? bounds.width : fallbackWidth;
  let height = bounds?.height > 0 ? bounds.height : fallbackHeight;

  if (isSkyroomColumnLayout()) {
    const inner = typeof document !== 'undefined'
      ? document.getElementById('presentationInnerWrapper')
      : null;
    const canvasW = inner?.clientWidth || fallbackWidth;
    const canvasH = inner?.clientHeight || fallbackHeight;
    if (canvasW > 0 && canvasH > 0) {
      width = canvasW;
      height = canvasH;
    }
  }

  return {
    areaWidth: Number.isFinite(width) ? width : 0,
    areaHeight: Number.isFinite(height) ? height : 0,
  };
};

// tldraw camera.x/y are page-space (page = screen/z + camera).
// Letterbox/pillarbox centering uses negative offsets when the slide is smaller
// than the viewport.
const calculateCenteredCameraOffsets = (
  scaledWidth,
  scaledHeight,
  baseZoom,
  areaWidth,
  areaHeight,
  fitToWidthMode,
) => {
  const zoom = Number.isFinite(baseZoom) && baseZoom > 0 ? baseZoom : 1;
  const safeAreaWidth = Number.isFinite(areaWidth) && areaWidth > 0 ? areaWidth : 0;
  const safeAreaHeight = Number.isFinite(areaHeight) && areaHeight > 0 ? areaHeight : 0;
  const pageViewportWidth = safeAreaWidth / zoom;
  const pageViewportHeight = safeAreaHeight / zoom;

  let xOffset = 0;
  let yOffset = 0;

  if (!(pageViewportWidth > 0) || !(pageViewportHeight > 0)) {
    return { xOffset, yOffset };
  }

  if (fitToWidthMode) {
    if (scaledHeight < pageViewportHeight) {
      yOffset = (scaledHeight - pageViewportHeight) / 2;
    }
  } else {
    if (scaledWidth < pageViewportWidth) {
      xOffset = (scaledWidth - pageViewportWidth) / 2;
    }
    if (scaledHeight < pageViewportHeight) {
      yOffset = (scaledHeight - pageViewportHeight) / 2;
    }
  }

  return { xOffset, yOffset };
};

/**
 * Letterbox-center in the live canvas. Zoom may use a slightly smaller "safe"
 * presentationArea* on phone; centering must still use the real viewport so
 * the slide stays in the middle (never pinned to a corner).
 */
const calculateSkyroomAwareCenteredCameraOffsets = (
  scaledWidth,
  scaledHeight,
  baseZoom,
  areaWidth,
  areaHeight,
  fitToWidthMode,
) => calculateCenteredCameraOffsets(
  scaledWidth,
  scaledHeight,
  baseZoom,
  areaWidth,
  areaHeight,
  fitToWidthMode,
);

// Pan bounds in page-space. When the slide is smaller than the viewport, lock to
// the centered camera so letterbox/pillarbox cannot collapse back to the corner.
const clampCameraPanOffsets = (
  x,
  y,
  _zoom,
  presentationWidth,
  presentationHeight,
  viewportPageWidth,
  viewportPageHeight,
) => {
  const safeViewportPageWidth = Number.isFinite(viewportPageWidth) ? viewportPageWidth : 0;
  const safeViewportPageHeight = Number.isFinite(viewportPageHeight) ? viewportPageHeight : 0;

  let minX;
  let maxX;
  let minY;
  let maxY;

  if (presentationWidth <= safeViewportPageWidth) {
    const centeredX = (presentationWidth - safeViewportPageWidth) / 2;
    minX = centeredX;
    maxX = centeredX;
  } else {
    maxX = 0;
    minX = -(presentationWidth - safeViewportPageWidth);
  }

  if (presentationHeight <= safeViewportPageHeight) {
    const centeredY = (presentationHeight - safeViewportPageHeight) / 2;
    minY = centeredY;
    maxY = centeredY;
  } else {
    maxY = 0;
    minY = -(presentationHeight - safeViewportPageHeight);
  }

  let nextX = x;
  let nextY = y;

  if (nextX > maxX) {
    nextX = maxX;
  } else if (nextX < minX) {
    nextX = minX;
  }

  if (nextY > maxY) {
    nextY = maxY;
  } else if (nextY < minY) {
    nextY = minY;
  }

  return { x: nextX, y: nextY };
};

const shouldLocallyCenterCamera = (backendX, backendY) => (
  Math.abs(backendX ?? 0) < CENTER_OFFSET_PUBLISH_EPSILON
  && Math.abs(backendY ?? 0) < CENTER_OFFSET_PUBLISH_EPSILON
);

// Older SafeMeet builds published positive screen-pixel margins as camera.x/y.
// tldraw page-space never needs those for fit-to-area letterboxing — recover.
const hasLegacyScreenSpaceOffset = (x, y) => (
  (x ?? 0) > CENTER_OFFSET_PUBLISH_EPSILON
  || (y ?? 0) > CENTER_OFFSET_PUBLISH_EPSILON
);

// Upstream BBB fills #presentationInnerWrapper (svgWidth×svgHeight) with camera
// at ~0,0 when the viewed region is the whole slide. Viewport-specific negative
// letterbox offsets from another client must not be replayed — they pin images
// into a corner on phone.
//
// Also treat viewBox >= slide as "showing the whole slide" (common after a
// phone presenter briefly published letterbox viewport ratios > 100%).
const isFullSlideCameraView = (page) => {
  if (!page) return false;
  const {
    scaledWidth,
    scaledHeight,
    scaledViewBoxWidth,
    scaledViewBoxHeight,
  } = page;
  if (!(scaledWidth > 0) || !(scaledHeight > 0)) return false;
  if (!(scaledViewBoxWidth > 0) || !(scaledViewBoxHeight > 0)) return false;
  const widthMatches = Math.abs(scaledViewBoxWidth - scaledWidth)
    <= CENTER_OFFSET_PUBLISH_EPSILON;
  const heightMatches = Math.abs(scaledViewBoxHeight - scaledHeight)
    <= CENTER_OFFSET_PUBLISH_EPSILON;
  const viewContainsSlide = scaledViewBoxWidth + CENTER_OFFSET_PUBLISH_EPSILON >= scaledWidth
    && scaledViewBoxHeight + CENTER_OFFSET_PUBLISH_EPSILON >= scaledHeight;
  return (widthMatches && heightMatches) || viewContainsSlide;
};

const shouldUseLocalFullSlideCamera = (page, backendX, backendY) => (
  isFullSlideCameraView(page)
  || shouldLocallyCenterCamera(backendX, backendY)
  || hasLegacyScreenSpaceOffset(backendX, backendY)
);

// Publish a canonical full-slide view — never phone-specific letterbox x/y or
// viewBox ratios > 100. Each client letterbox-centers locally instead.
const buildPublishableFullSlideView = (pageId) => ({
  pageId,
  w: HUNDRED_PERCENT,
  h: HUNDRED_PERCENT,
  x: 0,
  y: 0,
});

const CAMERA_TYPE = 'camera';
const colorStyles = [
  'black',
  'blue',
  'green',
  'grey',
  'light-blue',
  'light-green',
  'light-red',
  'light-violet',
  'orange',
  'red',
  'violet',
  'yellow',
];
const dashStyles = ['dashed', 'dotted', 'draw', 'solid'];
const fillStyles = ['none', 'pattern', 'semi', 'solid'];
const fontStyles = ['draw', 'mono', 'sans', 'serif'];
const sizeStyles = ['l', 'm', 's', 'xl'];

// Helper functions
const deleteLocalStorageItemsWithPrefix = (prefix) => {
  const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith(prefix));
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

// Example of typical LocalStorage entry tldraw creates:
// `{ TLDRAW_USER_DATA_v3: '{"version":2,"user":{"id":"epDk1 ...`
const clearTldrawCache = () => {
  deleteLocalStorageItemsWithPrefix('TLDRAW');
};

const createCamera = (pageId, zoomLevel) => ({
  id: `camera:page:${pageId}`,
  meta: {},
  typeName: CAMERA_TYPE,
  x: 0,
  y: 0,
  z: zoomLevel,
});

const defaultUser = {
  userId: '',
};

const customTools = [NoopTool, DeleteSelectedItemsTool];

const intlMessages = defineMessages({
  yes: {
    id: 'app.poll.y',
    description: 'Poll option for affirmative response',
  },
  no: {
    id: 'app.poll.n',
    description: 'Poll option for negative response',
  },
  abstention: {
    id: 'app.poll.abstention',
    description: 'Poll option for abstaining from vote',
  },
  true: {
    id: 'app.poll.answer.true',
    description: 'Poll option for true/correct answer',
  },
  false: {
    id: 'app.poll.answer.false',
    description: 'Poll option for false/incorrect answer',
  },
});

// Persists the presenter's actual zoom ratio across React unmount/remount cycles
// (e.g. minimize → restore presentation). A plain module-level object outlives
// any individual component instance without serialization overhead.
const _pageZoomRatioCache = {};

const Whiteboard = React.memo((props) => {
  const {
    isPresenter = false,
    removeShapes,
    persistShapeWrapper,
    shapes,
    removedShapes,
    assets,
    currentUser = defaultUser,
    whiteboardId = undefined,
    zoomSlide,
    curPageNum: curPageId,
    zoomChanger,
    isMultiUserActive,
    isRTL,
    fitToWidth,
    zoomValue,
    colorStyle,
    dashStyle,
    fillStyle,
    fontStyle,
    sizeStyle,
    presentationAreaHeight,
    presentationAreaWidth,
    setTldrawIsMounting,
    setTldrawAPI,
    whiteboardToolbarAutoHide,
    toggleToolsAnimations,
    animations,
    isToolbarVisible,
    isModerator,
    currentPresentationPage,
    presentationId = undefined,
    hasWBAccess,
    bgShape,
    publishCursorUpdate,
    presentationWidth,
    presentationHeight,
    skipToSlide,
    intl,
    maxNumberOfAnnotations,
    notifyNotAllowedChange,
    locale,
    isInfiniteWhiteboard,
    isPhone,
    setEditor,
    lockToolbarTools,
    layoutChanged,
    pointerDiameter = 5,
  } = props;

  const allowInfiniteWhiteboardPanForViewers = window.meetingClientSettings
    ?.public
    ?.whiteboard
    ?.allowInfiniteWhiteboardPanForViewers;

  const viewerCanPan = allowInfiniteWhiteboardPanForViewers
    && isInfiniteWhiteboard
    && !isPresenter
    && !isModerator
    && hasWBAccess;

  const tldrawCacheClearedRef = React.useRef(false);
  if (!tldrawCacheClearedRef.current) {
    clearTldrawCache();
    tldrawCacheClearedRef.current = true;
  }

  const [isMounting, setIsMounting] = React.useState(true);
  const [cursorType, setCursorType] = React.useState('');
  const [, setCursorZoom] = React.useState({ slideZoom: 1, containerZoom: 1 });
  const updateCursorZoomRef = React.useRef(null);

  if (isMounting) {
    setDefaultEditorAssetUrls(getCustomEditorAssetUrls());
    setDefaultUiAssetUrls(getCustomAssetUrls());
  }

  const whiteboardRef = React.useRef(null);
  const zoomValueRef = React.useRef(null);
  const prevShapesRef = React.useRef(shapes);
  const tlEditorRef = React.useRef(null);
  const slideChanged = React.useRef(false);
  const slideNext = React.useRef(null);
  const prevZoomValueRef = React.useRef(null);
  const initialZoomRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const shapeBatchRef = useRef({});
  const isMountedRef = useRef(false);
  const isWheelZoomRef = useRef(false);
  const isUserPanningRef = useRef(false);
  const userInteractionTimeoutRef = useRef(null);
  const pageJustChangedRef = useRef(false);
  const isPresenterRef = useRef(isPresenter);
  const viewerCanPanRef = useRef(viewerCanPan);
  const pageActualZoomRatioRef = useRef(_pageZoomRatioCache);
  const calculateZoomValueRef = useRef(null);
  const calculateZoomWithGapValueRef = useRef(null);
  const resolveFullSlideFitZoomRef = useRef(null);
  const fitToWidthRef = useRef(fitToWidth);
  const whiteboardIdRef = React.useRef(whiteboardId);
  const curPageIdRef = React.useRef(curPageId);
  const hasWBAccessRef = React.useRef(hasWBAccess);
  const isModeratorRef = React.useRef(isModerator);
  const currentPresentationPageRef = React.useRef(currentPresentationPage);
  const initialViewBoxWidthRef = React.useRef(null);
  const initialViewBoxHeightRef = React.useRef(null);
  const previousTool = React.useRef(null);
  const bgSelectedRef = React.useRef(false);
  const lastVisibilityStateRef = React.useRef('');
  const mountedTimeoutIdRef = useRef(null);
  const presentationIdRef = React.useRef(presentationId);
  const innerWrapperPollingFrameRef = React.useRef(null);
  const isMountedPollingFrameRef = React.useRef(null);
  const hasZoomSyncedRef = useRef(false);
  const lastForcedViewRef = useRef(null);
  const currentUserRef = useRef(currentUser);

  currentUserRef.current = currentUser;

  const [pageZoomMap, setPageZoomMap] = useState(() => {
    try {
      const saved = localStorage.getItem('pageZoomMap');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const customUiOverrides = React.useMemo(() => ({
    tools: (editor, tools) => {
      const updatedTools = {
        ...tools,
        deleteSelectedItems: {
          id: 'delete-selected-items',
          label: intl?.messages['app.whiteboard.toolbar.delete'],
          readonlyOk: false,
          icon: 'tool-delete-selected-items',
          onSelect() {
            editor.deleteShapes(editor.getSelectedShapes().map((shape) => {
              if (currentUser?.presenter || (shape?.meta?.createdBy === currentUser?.userId)) {
                return shape.id;
              }
              return '';
            })?.filter((s) => s?.length > 0));
          },
        },
      };
      return updatedTools;
    },
    toolbar: (_editor, toolbarItems, { tools }) => {
      const isTestEnv = typeof navigator !== 'undefined' && navigator.webdriver;
      const bbbMultiUserPenOnly = getFromUserSettings(
        'bbb_multi_user_pen_only',
        window.meetingClientSettings.public.whiteboard.toolbar.multiUserPenOnly,
      );
      const bbbPresenterTools = getFromUserSettings(
        'bbb_presenter_tools',
        window.meetingClientSettings.public.whiteboard.toolbar.presenterTools,
      );
      const bbbMultiUserTools = getFromUserSettings(
        'bbb_multi_user_tools',
        window.meetingClientSettings.public.whiteboard.toolbar.multiUserTools,
      );
      if (tools.deleteAll) {
        toolbarItems.splice(7, 0, toolbarItem(tools.deleteAll));
      }
      const hasRestrictions = bbbMultiUserPenOnly
      || (Array.isArray(bbbPresenterTools) && bbbPresenterTools.length > 0)
      || (Array.isArray(bbbMultiUserTools) && bbbMultiUserTools.length > 0);
      const shouldBypassFiltering = isTestEnv && !hasRestrictions;

      if (shouldBypassFiltering) {
        return toolbarItems;
      }

      // PEN-ONLY for everyone who's NOT mod or presenter
      if (bbbMultiUserPenOnly && !isModerator && !isPresenter) {
        const items = toolbarItems.filter((item) => item.id === 'draw');
        if (viewerCanPan) {
          const handItem = toolbarItems.find((item) => item.id === 'hand');
          if (handItem) items.unshift(handItem);
        }
        return items;
      }

      // PRESENTER-TOOLS mode for presenters
      if (bbbPresenterTools.length >= 1 && isPresenter) {
        return toolbarItems.filter((item) => bbbPresenterTools.includes(item.id));
      }

      // MULTI-USER-TOOLS for anyone who's NOT a moderator
      if (bbbMultiUserTools.length >= 1 && !isModerator) {
        const items = toolbarItems.filter((item) => bbbMultiUserTools.includes(item.id));
        if (viewerCanPan && !items.some((item) => item.id === 'hand')) {
          const handItem = toolbarItems.find((item) => item.id === 'hand');
          if (handItem) items.push(handItem);
        }
        return items;
      }
      // full toolbar
      return toolbarItems;
    },
    // Add locale translations for poll options
    // this way is adding support to regional and non regional languages
    // "en" is a fallback for not supported languages
    // TLdraw is only supporting 35 while bbb supports 63
    translations: ['en', intl.locale, intl.locale.split('-')[0]].reduce((acc, translationLocale) => {
      acc[translationLocale] = {
        'app.poll.t': intl.formatMessage(intlMessages.true),
        'app.poll.f': intl.formatMessage(intlMessages.false),
        'app.poll.y': intl.formatMessage(intlMessages.yes),
        'app.poll.n': intl.formatMessage(intlMessages.no),
        'app.poll.abstention': intl.formatMessage(intlMessages.abstention),
      };
      return acc;
    }, {}),
  }), [intl, currentUser?.presenter, currentUser?.userId, isModerator, viewerCanPan]);

  const presenterChanged = usePrevious(isPresenter) !== isPresenter;
  const prevCurPageId = usePrevious(curPageId);
  const pageChanged = prevCurPageId !== curPageId;

  let clipboardContent = null;
  let isPasting = false;
  let pasteTimeout = null;

  const setIsMouseDown = (val) => {
    isMouseDownRef.current = val;
  };

  const setIsWheelZoom = (val) => {
    isWheelZoomRef.current = val;
  };

  const markUserCameraInteraction = () => {
    isUserPanningRef.current = true;
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserPanningRef.current = false;
      userInteractionTimeoutRef.current = null;
    }, USER_CAMERA_INTERACTION_MS);
  };

  const setWheelZoomTimeout = () => {
    isWheelZoomRef.currentTimeout = setTimeout(() => {
      setIsWheelZoom(false);
    }, USER_CAMERA_INTERACTION_MS);
  };

  const cleanupStore = (cpid) => {
    const allRecords = tlEditorRef.current.store.allRecords();
    const shapeIdsToRemove = allRecords
      .filter((record) => record.typeName === 'shape' && record.parentId)
      .filter((record) => (
        record?.meta?.presentationId !== presentationIdRef.current
          || !record?.meta?.presentationId || record.parentId !== cpid
      ))
      .map((shape) => shape.id);

    if (shapeIdsToRemove.length > 0) {
      tlEditorRef.current?.store.remove([...shapeIdsToRemove]);
    }
  };

  const debouncedSetInitialZoom = debounce(() => {
    if (
      currentPresentationPageRef.current
      && currentPresentationPageRef.current.scaledWidth > 0
      && currentPresentationPageRef.current.scaledHeight > 0
      && presentationAreaWidth > 0
      && presentationAreaHeight > 0
    ) {
      const slideAspectRatio = currentPresentationPageRef.current.scaledWidth
        / currentPresentationPageRef.current.scaledHeight;

      const presentationAreaAspectRatio = presentationAreaWidth / presentationAreaHeight;

      let initialZoom;

      if (
        slideAspectRatio > presentationAreaAspectRatio
        || (fitToWidthRef.current && isPresenterRef.current)
      ) {
        initialZoom = presentationAreaWidth
          / currentPresentationPageRef.current.scaledWidth;
      } else {
        initialZoom = presentationAreaHeight
          / currentPresentationPageRef.current.scaledHeight;
      }

      initialZoomRef.current = initialZoom;
      prevZoomValueRef.current = zoomValue;
    }
  }, 200);

  React.useEffect(() => {
    localStorage.setItem('pageZoomMap', JSON.stringify(pageZoomMap));
  }, [pageZoomMap]);

  React.useEffect(() => {
    currentPresentationPageRef.current = currentPresentationPage;
  }, [currentPresentationPage]);

  React.useEffect(() => {
    updateCursorZoomRef.current?.();
  }, [currentPresentationPage, presentationAreaWidth, presentationAreaHeight]);

  React.useEffect(() => {
    curPageIdRef.current = curPageId;
  }, [curPageId]);

  React.useEffect(() => {
    isModeratorRef.current = isModerator;
  }, [isModerator]);

  React.useEffect(() => {
    whiteboardIdRef.current = whiteboardId;
  }, [whiteboardId]);

  React.useEffect(() => {
    presentationIdRef.current = presentationId;
    // New presentation (e.g. freshly uploaded image): drop settled-view cache so
    // camera re-centers against the real viewport after layout settles.
    lastForcedViewRef.current = null;
    try {
      localStorage.removeItem('initialViewBoxWidth');
      localStorage.removeItem('initialViewBoxHeight');
    } catch (error) {
      // ignore quota / private-mode failures
    }
  }, [presentationId]);

  React.useEffect(() => {
    hasWBAccessRef.current = hasWBAccess;

    const toolbarSavedState = SessionStorage.getItem('whiteboardToolbarSavedState');

    if (!hasWBAccess && !isPresenter) {
      tlEditorRef?.current?.setCurrentTool('noop');
    } else if (hasWBAccess && !isPresenter) {
      const {
        initialSelectedTool: initialSelectedToolFromConfig,
        multiUserTools,
      } = window.meetingClientSettings.public.whiteboard.toolbar;
      let initialSelectedTool = getFromUserSettings(
        'bbb_initial_selected_tool',
        initialSelectedToolFromConfig,
      );

      if (toolbarSavedState) {
        const {
          selectedTool: savedSelectedTool,
        } = toolbarSavedState;

        if (savedSelectedTool && multiUserTools.includes(savedSelectedTool)) {
          initialSelectedTool = savedSelectedTool;
        }
      }

      tlEditorRef?.current?.setCurrentTool(initialSelectedTool);
    } else if (isPresenter) {
      // Presenter (including multi-user presenters): default to draw.
      tlEditorRef?.current?.setCurrentTool('draw');
    }
  }, [hasWBAccess, isPresenter]);

  React.useEffect(() => {
    viewerCanPanRef.current = viewerCanPan;
  }, [viewerCanPan]);

  React.useEffect(() => {
    const wasPresenter = isPresenterRef.current;
    isPresenterRef.current = isPresenter;

    if (!hasWBAccessRef.current && !isPresenter) {
      tlEditorRef?.current?.setCurrentTool('noop');
      return;
    }

    // Role grant → draw. Also cover first paint if the editor is already idle.
    if (isPresenter && (!wasPresenter || tlEditorRef?.current?.getCurrentToolId() === 'noop')) {
      tlEditorRef?.current?.setCurrentTool('draw');
    }
  }, [isPresenter]);

  React.useEffect(() => {
    if (allowInfiniteWhiteboardPanForViewers
      && !isPresenterRef.current
      && !isModeratorRef.current
      && hasWBAccessRef.current) {
      tlEditorRef?.current?.setCurrentTool(isInfiniteWhiteboard ? 'hand' : 'noop');
    }
  }, [isInfiniteWhiteboard]);

  React.useEffect(() => {
    fitToWidthRef.current = fitToWidth;
  }, [fitToWidth]);

  React.useEffect(() => {
    if (shapes && Object.keys(shapes).length > 0) {
      prevShapesRef.current = shapes;
    }
    debouncedUpdateShapes(
      shapes, tlEditorRef, presentationIdRef, pageChanged, assets, bgShape,
    );
  }, [shapes]);

  React.useEffect(() => {
    if (removedShapes && removedShapes.length > 0) {
      tlEditorRef.current?.store.mergeRemoteChanges(() => {
        tlEditorRef.current?.store.remove([...removedShapes]);
      });
    }
  }, [removedShapes]);

  const handleCopy = useCallback(() => {
    const selectedShapes = tlEditorRef.current?.getSelectedShapes();
    if (!selectedShapes || selectedShapes.length === 0) {
      return;
    }
    const content = tlEditorRef.current?.getContentFromCurrentPage(
      selectedShapes.map((shape) => shape.id),
    );
    if (content) {
      clipboardContent = content;
      const stringifiedClipboard = compressToBase64(
        JSON.stringify({
          type: 'application/tldraw',
          kind: 'content',
          data: content,
        }),
      );

      if (navigator.clipboard?.write) {
        const htmlBlob = new Blob([`<tldraw>${stringifiedClipboard}</tldraw>`], {
          type: 'text/html',
        });

        navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': new Blob([''], { type: 'text/plain' }),
          }),
        ]);
      } else if (navigator.clipboard.writeText) {
        navigator.clipboard.writeText(`<tldraw>${stringifiedClipboard}</tldraw>`);
      }
    }
  }, [tlEditorRef]);

  const handleKeybindZoom = useCallback((operation) => {
    if (
      !tlEditorRef.current
      || !initialZoomRef.current
      || !whiteboardRef.current
    ) {
      return;
    }

    const MAX_ZOOM_FACTOR = 4; // Represents 400%
    const MIN_ZOOM_FACTOR = isInfiniteWhiteboard ? 0.25 : 1;
    const ZOOM_IN_FACTOR = 0.25;
    const ZOOM_OUT_FACTOR = 0.25;

    // Get the current camera position and zoom level
    const { x: cx, y: cy, z: cz } = tlEditorRef.current.getCamera();

    let currentZoomLevel = cz / initialZoomRef.current;
    if (operation === 'zoomIn') {
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
    const centerX = (rect?.width || 0) / 2;
    const centerY = (rect?.height || 0) / 2;
    const canvasMouseX = centerX / cz + cx;
    const canvasMouseY = centerY / cz + cy;

    // Calculate the new camera position to keep the mouse position under the cursor
    const nextCamera = {
      x: cx + (canvasMouseX - cx) * (cz / newCameraZoomFactor - 1),
      y: cy + (canvasMouseY - cy) * (cz / newCameraZoomFactor - 1),
      z: newCameraZoomFactor,
    };

    tlEditorRef.current.setCamera(nextCamera, { duration: 175 });
  }, [isInfiniteWhiteboard, zoomChanger]);

  const handleCut = useCallback((shouldCopy) => {
    const selectedShapes = tlEditorRef.current?.getSelectedShapes();
    if (!selectedShapes || selectedShapes.length === 0) {
      return;
    }
    if (shouldCopy) {
      handleCopy();
    }
    tlEditorRef.current?.deleteShapes(selectedShapes.map((shape) => shape.id));
  }, [tlEditorRef]);

  const pasteTldrawContent = (editor, clipboard, point) => {
    const p = point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : undefined);
    editor.mark('paste');
    editor.putContentOntoCurrentPage(clipboard, {
      point: p,
      select: true,
    });
  };

  const handlePaste = useCallback(() => {
    if (isPasting) {
      return;
    }
    isPasting = true;

    clearTimeout(pasteTimeout);
    pasteTimeout = setTimeout(() => {
      if (clipboardContent) {
        pasteTldrawContent(tlEditorRef.current, clipboardContent);
        isPasting = false;
      } else {
        navigator.clipboard.readText().then((text) => {
          const match = text.match(/<tldraw>(.*)<\/tldraw>/);
          if (match && match[1]) {
            const content = JSON.parse(decompressFromBase64(match[1]));
            pasteTldrawContent(tlEditorRef.current, content);
          }
          isPasting = false;
        }).catch(() => {
          isPasting = false;
        });
      }
    }, 100);
  }, [tlEditorRef]);

  const handleKeyDown = useCallback((event) => {
    if (event.repeat) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // ignore if the edit link dialog is open
    if (event.target.tagName === 'INPUT') {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'escape' || event.keyCode === 27) {
      tlEditorRef.current?.deselect(...tlEditorRef.current?.getSelectedShapes());
      return;
    }

    const editingShape = tlEditorRef.current?.getEditingShape();
    if (editingShape && (isPresenterRef.current || hasWBAccessRef.current)) {
      return;
    }

    if (['delete', 'backspace'].includes(key.toLowerCase())) {
      handleCut(false);
      return;
    }

    if ((isPresenterRef.current || viewerCanPanRef.current) && event.keyCode === KEY_CODES.SPACE && tlEditorRef.current?.getCurrentToolId() !== 'hand') {
      event.preventDefault();
      event.stopPropagation();
      previousTool.current = tlEditorRef.current?.getCurrentToolId();
      tlEditorRef.current?.setCurrentTool('hand');
      return;
    }

    // Mapping of simple key shortcuts to tldraw functions
    const simpleKeyMap = {
      // Combos
      1: () => tlEditorRef.current?.setCurrentTool('select'),
      2: () => tlEditorRef.current?.setCurrentTool('draw'),
      3: () => tlEditorRef.current?.setCurrentTool('eraser'),
      4: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      5: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      6: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'triangle');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      7: () => tlEditorRef.current?.setCurrentTool('line'),
      8: () => tlEditorRef.current?.setCurrentTool('arrow'),
      9: () => tlEditorRef.current?.setCurrentTool('text'),
      0: () => tlEditorRef.current?.setCurrentTool('note'),

      // Alternatives
      v: () => tlEditorRef.current?.setCurrentTool('select'),
      d: () => tlEditorRef.current?.setCurrentTool('draw'),
      p: () => tlEditorRef.current?.setCurrentTool('draw'),
      g: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'triangle');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      '[': () => {
        tlEditorRef.current?.sendBackward(tlEditorRef.current?.getSelectedShapes());
      },
      ']': () => {
        tlEditorRef.current?.bringForward(tlEditorRef.current?.getSelectedShapes());
      },
      e: () => tlEditorRef.current?.setCurrentTool('eraser'),
      h: () => {
        if (isPresenterRef.current || viewerCanPanRef.current) {
          tlEditorRef.current?.setCurrentTool('hand');
        }
      },
      r: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      o: () => {
        tlEditorRef.current?.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse');
        tlEditorRef.current?.setCurrentTool('geo');
      },
      a: () => tlEditorRef.current?.setCurrentTool('arrow'),
      l: () => tlEditorRef.current?.setCurrentTool('line'),
      t: () => tlEditorRef.current?.setCurrentTool('text'),
      f: () => tlEditorRef.current?.setCurrentTool('frame'),
      n: () => tlEditorRef.current?.setCurrentTool('note'),
      s: () => tlEditorRef.current?.setCurrentTool('note'),
    };

    if (
      event.shiftKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey
    ) {
      const shiftKeyMap = {
        d: () => {
          tlEditorRef.current?.setCurrentTool('highlight');
        },
        h: () => {
          tlEditorRef.current?.flipShapes(tlEditorRef.current?.getSelectedShapes(), 'horizontal');
        },
        v: () => {
          tlEditorRef.current?.flipShapes(tlEditorRef.current?.getSelectedShapes(), 'vertical');
        },
        '}': () => {
          tlEditorRef.current?.bringToFront(tlEditorRef.current?.getSelectedShapes());
        },
        '{': () => {
          tlEditorRef.current?.sendToBack(tlEditorRef.current?.getSelectedShapes());
        },
        '!': () => {
          zoomChanger(HUNDRED_PERCENT);
        },
        '@': () => {
          const selectionBounds = tlEditorRef.current?.getSelectionPageBounds();
          const selectionAspectRatio = selectionBounds.w / selectionBounds.h;
          const presentationAreaAspectRatio = presentationWidth / presentationHeight;

          let baseZoomToFitIn;

          if (
            selectionAspectRatio > presentationAreaAspectRatio
            || (fitToWidthRef.current && isPresenterRef.current)
          ) {
            baseZoomToFitIn = presentationWidth / selectionBounds.w;
          } else {
            baseZoomToFitIn = presentationHeight / selectionBounds.h;
          }

          const adjustedBaseZoomToFitIn = (Math.max(baseZoomToFitIn, initialZoomRef.current)) / initialZoomRef.current;
          const zoomPercentage = adjustedBaseZoomToFitIn * 100;
          zoomChanger(zoomPercentage);

          const nextCamera = {
            x: selectionBounds.x,
            y: selectionBounds.y,
            z: adjustedBaseZoomToFitIn,
          };

          tlEditorRef.current.setCamera(nextCamera, { duration: 175 });
        },
      };

      if (shiftKeyMap[key]) {
        event.preventDefault();
        event.stopPropagation();
        shiftKeyMap[key]();
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      if (key === 'z') {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          // Redo (Ctrl + Shift + z)
          tlEditorRef.current?.redo();
        } else {
          // Undo (Ctrl + z)
          tlEditorRef.current?.undo();
        }
        return;
      }

      if (key === 'l' && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        tlEditorRef.current?.toggleLock(tlEditorRef.current?.getSelectedShapes());
        return;
      }

      const ctrlKeyMap = {
        a: () => {
          tlEditorRef.current?.selectAll();
          tlEditorRef.current?.setCurrentTool('select');
        },
        d: () => {
          tlEditorRef.current
            ?.duplicateShapes(tlEditorRef.current?.getSelectedShapes(), { x: 35, y: 35 });
        },
        x: () => {
          handleCut(true);
        },
        c: () => {
          handleCopy();
        },
        v: () => {
          if (!isPasting) {
            handlePaste();
          }
        },
        '+': handleKeybindZoom.bind(null, 'zoomIn'),
        '-': handleKeybindZoom.bind(null, 'zoomOut'),
        '=': handleKeybindZoom.bind(null, 'zoomIn'),
        add: handleKeybindZoom.bind(null, 'zoomIn'),
        subtract: handleKeybindZoom.bind(null, 'zoomOut'),
      };

      if (ctrlKeyMap[key]) {
        event.preventDefault();
        event.stopPropagation();
        ctrlKeyMap[key]();
        return;
      }
    }

    if (
      !event.altKey
      && !event.ctrlKey
      && !event.shiftKey
      && simpleKeyMap[key]
      && (isPresenterRef.current || hasWBAccessRef.current)
    ) {
      event.preventDefault();
      event.stopPropagation();
      simpleKeyMap[key]();
      return;
    }

    const moveDistance = 10;
    const selectedShapes = tlEditorRef.current?.getSelectedShapes().map((shape) => shape.id);

    const arrowKeyMap = {
      ArrowUp: { x: 0, y: -moveDistance },
      ArrowDown: { x: 0, y: moveDistance },
      ArrowLeft: { x: -moveDistance, y: 0 },
      ArrowRight: { x: moveDistance, y: 0 },
    };

    if (arrowKeyMap[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      tlEditorRef.current?.nudgeShapes(selectedShapes, arrowKeyMap[event.key], { squashing: true });
    }
  }, [
    tlEditorRef, isPresenterRef, hasWBAccessRef, previousTool, handleCut, handleCopy, handlePaste,
    isInfiniteWhiteboard, zoomChanger, presentationHeight, presentationWidth,
  ]);

  const createPage = (currentPageId) => [
    {
      meta: {},
      id: currentPageId,
      name: `Slide ${currentPageId?.split(':')[1]}`,
      index: 'a1',
      typeName: 'page',
    },
  ];

  React.useEffect(() => {
    if (whiteboardRef.current) {
      whiteboardRef.current.addEventListener('keydown', handleKeyDown, {
        capture: true,
      });
    }

    return () => {
      whiteboardRef.current?.removeEventListener('keydown', handleKeyDown, {
        capture: true,
      });
    };
  }, [whiteboardRef.current, handleKeyDown]);

  const language = React.useMemo(() => mapLanguage(locale?.toLowerCase() || 'en'), [locale]);

  const updateCursorPosition = useCursor(
    publishCursorUpdate,
    whiteboardIdRef.current,
  );

  const setCamera = (zoom, x = 0, y = 0) => {
    if (tlEditorRef.current) {
      tlEditorRef.current.setCamera({ x, y, z: zoom }, { duration: 175 });
    }
  };

  const calculateZoomValue = (localWidth, localHeight) => {
    // Upstream BBB: always use presentationArea* props here. Mixing in the live
    // tldraw viewport breaks presenter widthGap (area already equals svgWidth,
    // then subtracting container−svgWidth shrinks zoom and letterboxes the slide).
    const calcedZoom = fitToWidth
      ? presentationAreaWidth / localWidth
      : Math.min(
        presentationAreaWidth / localWidth,
        presentationAreaHeight / localHeight,
      );

    return calcedZoom === 0 || calcedZoom === Infinity || Number.isNaN(calcedZoom)
      ? HUNDRED_PERCENT
      : calcedZoom;
  };

  // Fitted svg box is the tldraw canvas on Skyroom. Fitting to presentationArea*
  // (full stage) over-zooms once the presenter toolbar hides and pins the slide left.
  const calculateCanvasFitZoom = (localWidth, localHeight) => {
    const canvasW = Number.isFinite(presentationWidth) ? presentationWidth : 0;
    const canvasH = Number.isFinite(presentationHeight) ? presentationHeight : 0;
    if (!(canvasW > 0) || !(canvasH > 0) || !(localWidth > 0) || !(localHeight > 0)) {
      return calculateZoomValue(localWidth, localHeight);
    }
    const calcedZoom = fitToWidth
      ? canvasW / localWidth
      : Math.min(canvasW / localWidth, canvasH / localHeight);
    return calcedZoom === 0 || calcedZoom === Infinity || Number.isNaN(calcedZoom)
      ? calculateZoomValue(localWidth, localHeight)
      : calcedZoom;
  };

  const resolveFullSlideFitZoom = (fitWidth, fitHeight) => (
    isSkyroomColumnLayout()
      ? calculateCanvasFitZoom(fitWidth, fitHeight)
      : calculateZoomValue(fitWidth, fitHeight)
  );

  // Ref keeps store listeners and RAF callbacks pointing at the latest closure (avoids stale presentationAreaWidth/Height).
  calculateZoomValueRef.current = calculateZoomValue;
  resolveFullSlideFitZoomRef.current = resolveFullSlideFitZoom;

  const getContainerDimensions = () => {
    const container = document.querySelector('[data-test="presentationContainer"]');
    const innerWrapper = document.getElementById('presentationInnerWrapper');
    const containerWidth = container ? container.offsetWidth : 0;
    const innerWrapperWidth = innerWrapper ? innerWrapper.offsetWidth : 0;
    // Phone now uses the same fitted svg box as desktop, so upstream widthGap
    // (stage − slide) is correct again for presenter zoom.
    const widthGap = Math.max(containerWidth - innerWrapperWidth, 0);
    return { containerWidth, innerWrapperWidth, widthGap };
  };

  const coreCameraLogic = ({
    baseZoom,
    xOffset,
    yOffset,
    description,
  }) => {
    const throwIfInvalid = (value, desc) => {
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid ${desc}: ${value}`);
      }
    };

    throwIfInvalid(baseZoom, `baseZoom ${description}`);
    throwIfInvalid(xOffset, `camera.x ${description}`);
    throwIfInvalid(yOffset, `camera.y ${description}`);

    const camera = tlEditorRef.current.getCamera();
    const formattedPageId = Number(curPageIdRef.current);
    if (Number.isNaN(formattedPageId)) {
      throw new Error(`Invalid formattedPageId ${description}: ${formattedPageId}`);
    }

    const updatedCurrentCam = {
      ...camera,
      x: xOffset,
      y: yOffset,
      z: baseZoom,
    };

    // mergeRemoteChanges → source "remote" so the user listener does not
    // publish Skyroom letterbox x/y as the meeting-wide camera view.
    tlEditorRef.current.store.mergeRemoteChanges(() => {
      tlEditorRef.current.store.put([updatedCurrentCam]);
    });
  };

  const calculateZoomWithGapValue = (
    localWidth,
    localHeight,
    widthAdjustment = 0,
  ) => {
    // Upstream BBB: presentationAreaWidth − widthGap ≈ svgWidth.
    const presentationWidthLocal = Math.max(presentationAreaWidth - widthAdjustment, 0);
    const calcedZoom = (fitToWidth
      ? presentationWidthLocal / localWidth
      : Math.min(
        presentationWidthLocal / localWidth,
        presentationAreaHeight / localHeight,
      ));
    return calcedZoom === 0 || calcedZoom === Infinity || Number.isNaN(calcedZoom)
      ? calculateZoomValue(localWidth, localHeight) // Fallback to no gap base zoom
      : calcedZoom;
  };

  calculateZoomWithGapValueRef.current = calculateZoomWithGapValue;

  // updateCursorZoom is a plain function (not useCallback) so it always closes
  // over fresh presentationAreaWidth/presentationAreaHeight/fitToWidth each render.
  // updateCursorZoomRef.current keeps the store.listen closure pointed at the latest version.
  const updateCursorZoom = () => {
    const page = currentPresentationPageRef.current;
    const editor = tlEditorRef.current;

    if (!page || !(page.scaledWidth > 0) || !(page.scaledHeight > 0)) return;

    const rawInitialZoom = initialZoomRef.current;
    if (!(rawInitialZoom > 0)) return;

    const rawCameraZ = editor?.getCamera()?.z;
    if (!Number.isFinite(rawCameraZ) || rawCameraZ <= 0) return;

    const newSlideZoom = rawCameraZ / rawInitialZoom;
    const newContainerZoom = calculateZoomValue(page.scaledWidth, page.scaledHeight);

    if (!Number.isFinite(newSlideZoom) || !Number.isFinite(newContainerZoom)) return;

    const nextCursorZoom = {
      slideZoom: newSlideZoom,
      containerZoom: newContainerZoom,
    };

    // Defer React state updates — store.listen can fire while tldraw is rendering.
    queueMicrotask(() => {
      setCursorZoom((prev) => (
        prev.slideZoom === nextCursorZoom.slideZoom
        && prev.containerZoom === nextCursorZoom.containerZoom
          ? prev
          : nextCursorZoom
      ));
    });
  };
  updateCursorZoomRef.current = updateCursorZoom;

  const adjustCameraOnMount = (includeViewerLogic = true) => {
    try {
      if (presenterChanged) {
        localStorage.removeItem('initialViewBoxWidth');
        localStorage.removeItem('initialViewBoxHeight');
      }

      const storedWidth = localStorage.getItem('initialViewBoxWidth');
      const storedHeight = localStorage.getItem('initialViewBoxHeight');

      const throwIfInvalid = (val, desc) => {
        if (!Number.isFinite(val)) {
          throw new Error(`Invalid ${desc}: ${val}`);
        }
      };

      if (storedWidth && storedHeight) {
        const parsedWidth = parseFloat(storedWidth);
        const parsedHeight = parseFloat(storedHeight);
        throwIfInvalid(parsedWidth, 'stored initialViewBoxWidth');
        throwIfInvalid(parsedHeight, 'stored initialViewBoxHeight');

        initialViewBoxWidthRef.current = parsedWidth;
        initialViewBoxHeightRef.current = parsedHeight;
      } else {
        const currentPage = currentPresentationPageRef.current || {};
        const {
          scaledWidth, scaledHeight, scaledViewBoxWidth, scaledViewBoxHeight,
        } = currentPage;

        if (scaledViewBoxWidth === 0 || scaledViewBoxHeight === 0) {
          throw new Error(
            `scaledViewBoxWidth or scaledViewBoxHeight is zero:
            ${scaledViewBoxWidth}, ${scaledViewBoxHeight}`,
          );
        }

        const currentZoomLevel = scaledWidth / scaledViewBoxWidth;
        throwIfInvalid(currentZoomLevel, 'currentZoomLevel');

        const calculatedWidth = currentZoomLevel !== 1
          ? scaledWidth / currentZoomLevel
          : scaledWidth;
        const calculatedHeight = currentZoomLevel !== 1
          ? scaledHeight / currentZoomLevel
          : scaledHeight;

        throwIfInvalid(calculatedWidth, 'calculatedWidth');
        throwIfInvalid(calculatedHeight, 'calculatedHeight');

        initialViewBoxWidthRef.current = calculatedWidth;
        initialViewBoxHeightRef.current = calculatedHeight;

        try {
          localStorage.setItem('initialViewBoxWidth', calculatedWidth.toString());
          localStorage.setItem('initialViewBoxHeight', calculatedHeight.toString());
        } catch (error) {
          logger.warn(
            { logCode: 'InitialViewBoxStorage' },
            `Failed to store viewbox dimensions: ${error}`,
          );
        }
      }

      const {
        scaledWidth,
        scaledHeight,
        scaledViewBoxWidth,
        scaledViewBoxHeight,
        xOffset,
        yOffset,
      } = currentPresentationPageRef.current || {};

      if (
        presentationAreaHeight > 0
        && presentationAreaWidth > 0
        && scaledWidth > 0
        && scaledHeight > 0
        && tlEditorRef.current
      ) {
        let baseZoom = calculateZoomValueRef.current(scaledWidth, scaledHeight);
        throwIfInvalid(baseZoom, 'baseZoom');

        if (isPresenterRef.current) {
          // Upstream BBB presenter mount: fit zoom (with widthGap). Full-slide uses
          // local letterbox offsets from the live canvas — never publish them.
          const { widthGap } = getContainerDimensions();

          if (widthGap > 0) {
            const zoomWithGap = calculateZoomWithGapValueRef.current(scaledWidth, scaledHeight, widthGap);
            throwIfInvalid(zoomWithGap, 'zoomWithGap');
            baseZoom = zoomWithGap;
          }

          const page = currentPresentationPageRef.current;
          const backendX = xOffset ?? 0;
          const backendY = yOffset ?? 0;
          const useFullSlideOrigin = shouldUseLocalFullSlideCamera(page, backendX, backendY);
          let nextX = useFullSlideOrigin ? 0 : backendX;
          let nextY = useFullSlideOrigin ? 0 : backendY;

          if (useFullSlideOrigin) {
            const {
              areaWidth: cameraAreaWidth,
              areaHeight: cameraAreaHeight,
            } = resolveCameraViewportSize(
              tlEditorRef.current,
              presentationWidth,
              presentationHeight,
            );
            const centered = calculateSkyroomAwareCenteredCameraOffsets(
              scaledWidth,
              scaledHeight,
              baseZoom,
              cameraAreaWidth,
              cameraAreaHeight,
              fitToWidthRef.current,
            );
            nextX = centered.xOffset;
            nextY = centered.yOffset;
          }

          coreCameraLogic({
            baseZoom,
            xOffset: nextX,
            yOffset: nextY,
            description: '(presenter)',
          });
        } else if (includeViewerLogic) {
          // Upstream viewer: zoom to viewBox + backend offsets. Full-slide / legacy
          // offsets → fit the whole slide locally and letterbox-center in THIS canvas.
          const page = currentPresentationPageRef.current;
          const useFullSlideOrigin = shouldUseLocalFullSlideCamera(
            page,
            xOffset,
            yOffset,
          );
          const viewerFitWidth = useFullSlideOrigin ? scaledWidth : scaledViewBoxWidth;
          const viewerFitHeight = useFullSlideOrigin ? scaledHeight : scaledViewBoxHeight;
          baseZoom = useFullSlideOrigin
            ? (resolveFullSlideFitZoomRef.current?.(viewerFitWidth, viewerFitHeight)
              ?? calculateZoomValueRef.current(viewerFitWidth, viewerFitHeight))
            : calculateZoomValueRef.current(viewerFitWidth, viewerFitHeight);
          let nextX = useFullSlideOrigin ? 0 : xOffset;
          let nextY = useFullSlideOrigin ? 0 : yOffset;

          if (useFullSlideOrigin) {
            const {
              areaWidth: cameraAreaWidth,
              areaHeight: cameraAreaHeight,
            } = resolveCameraViewportSize(
              tlEditorRef.current,
              presentationWidth,
              presentationHeight,
            );
            const centered = calculateSkyroomAwareCenteredCameraOffsets(
              viewerFitWidth,
              viewerFitHeight,
              baseZoom,
              cameraAreaWidth,
              cameraAreaHeight,
              fitToWidthRef.current,
            );
            nextX = centered.xOffset;
            nextY = centered.yOffset;
          }

          coreCameraLogic({
            baseZoom,
            xOffset: nextX,
            yOffset: nextY,
            description: '(viewer)',
          });
        }

        // coreCameraLogic calls store.put which schedules _flushHistory via
        // throttledRaf — the user-source listener fires ASYNCHRONOUSLY in the
        // next animation frame, AFTER this function returns. If we set
        // isMountedRef.current = true here, the async listener sees it as true
        // and overwrites the stored zoom ratio with fit-zoom (ratio=1.0).
        // Double-rAF guarantees we only become "mounted" after that flush fires.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isMountedRef.current = true;
          });
        });
      }
    } catch (error) {
      logger.error({ logCode: 'AdjustCameraOnMount' }, `Failed to store viewbox: ${error}`);
      throw error;
    }
  };

  const pollInnerWrapperDimensionsUntilStable = (
    onReady,
    options = {
      maxTries: 120,
      stabilityFrames: 50,
    },
    frameIdRef = null,
    currentTry = 0,
    stableCount = 0,
    lastDimensions = { width: 0, height: 0 },
  ) => {
    const container = document.querySelector('[data-test="presentationContainer"]');
    const innerWrapper = document.getElementById('presentationInnerWrapper');

    const containerWidth = container ? container.offsetWidth : 0;
    const containerHeight = container ? container.offsetHeight : 0;
    const innerWrapperWidth = innerWrapper ? innerWrapper.offsetWidth : 0;
    const innerWrapperHeight = innerWrapper ? innerWrapper.offsetHeight : 0;

    let _stableCount = stableCount;
    let _lastDimensions = lastDimensions;
    const _frameIdRef = frameIdRef;

    if (innerWrapperWidth <= 0 || innerWrapperHeight <= 0) {
      _stableCount = 0;
    } else if (
      innerWrapperWidth === lastDimensions.width
        && innerWrapperHeight === lastDimensions.height
    ) {
      _stableCount += 1;
    } else {
      _stableCount = 0;
      _lastDimensions = { width: innerWrapperWidth, height: innerWrapperHeight };
    }

    if (_stableCount >= options.stabilityFrames) {
      onReady({
        containerWidth, containerHeight, innerWrapperWidth, innerWrapperHeight,
      });
      return;
    }

    if (currentTry < options.maxTries) {
      const frameId = requestAnimationFrame(() => {
        pollInnerWrapperDimensionsUntilStable(
          onReady,
          options,
          _frameIdRef,
          currentTry + 1,
          _stableCount,
          _lastDimensions,
        );
      });
      if (_frameIdRef) {
        _frameIdRef.current = frameId;
      }
    } else {
      logger.warn(
        { logCode: 'pollInnerWrapperDimensionsUntilStable' },
        'Failed to store viewbox dimensions',
      );
      onReady({
        containerWidth, containerHeight, innerWrapperWidth, innerWrapperHeight,
      });
    }
  };

  const pollUntilMounted = (
    onReady,
    onFail,
    ref = null,
    options = { maxTries: 240 },
    currentTry = 0,
  ) => {
    const _ref = ref;
    if (isMountedRef.current) {
      onReady();
    } else if (currentTry <= options.maxTries) {
      const frameId = requestAnimationFrame(() => {
        pollUntilMounted(onReady, onFail, ref, options, currentTry + 1);
      });
      if (_ref) {
        _ref.current = frameId;
      }
    } else {
      onFail();
    }
  };

  const handleTldrawMount = (editor) => {
    if (typeof editor.history.setMaxStackSize === 'function') {
      editor.history.setMaxStackSize(window.meetingClientSettings.public.whiteboard.maxHistoryStackSize);
    } else {
      logger.warn({ logCode: 'SetMaxStackSize' }, 'Failed to set max history stack size - feature not available');
    }

    tlEditorRef.current = editor;
    setTldrawAPI(editor);
    setEditor(editor);

    let initialColorStyle = colorStyle;
    let initialDashStyle = dashStyle;
    let initialFillStyle = fillStyle;
    let initialFontStyle = fontStyle;
    let initialSizeStyle = sizeStyle;

    const toolbarSavedState = SessionStorage.getItem('whiteboardToolbarSavedState');

    if (toolbarSavedState) {
      const {
        colorStyle: savedColorStyle,
        dashStyle: savedDashStyle,
        fillStyle: savedFillStyle,
        fontStyle: savedFontStyle,
        sizeStyle: savedSizeStyle,
        selectedTool: savedSelectedTool,
      } = toolbarSavedState;

      if (savedColorStyle) {
        if (colorStyles.includes(savedColorStyle)) {
          initialColorStyle = savedColorStyle;
        }
      }
      if (savedDashStyle) {
        if (dashStyles.includes(savedDashStyle)) {
          initialDashStyle = savedDashStyle;
        }
      }
      if (savedFillStyle) {
        if (fillStyles.includes(savedFillStyle)) {
          initialFillStyle = savedFillStyle;
        }
      }
      if (savedFontStyle) {
        if (fontStyles.includes(savedFontStyle)) {
          initialFontStyle = savedFontStyle;
        }
      }
      if (savedSizeStyle) {
        if (sizeStyles.includes(savedSizeStyle)) {
          initialSizeStyle = savedSizeStyle;
        }
      }
      if (savedSelectedTool) {
        const { multiUserTools } = window.meetingClientSettings.public.whiteboard.toolbar;
        if (multiUserTools.includes(savedSelectedTool)) {
          editor.setCurrentTool(savedSelectedTool);
        }
      }
    }

    DefaultHorizontalAlignStyle.defaultValue = isRTL ? 'end' : 'start';
    DefaultVerticalAlignStyle.defaultValue = 'start';

    editor?.user?.updateUserPreferences({ locale: language });
    if (lockToolbarTools) {
      editor?.updateInstanceState({ isToolLocked: true });
    }

    if (colorStyles.includes(initialColorStyle)) {
      editor.setStyleForNextShapes(DefaultColorStyle, initialColorStyle);
    }
    if (dashStyles.includes(initialDashStyle)) {
      editor.setStyleForNextShapes(DefaultDashStyle, initialDashStyle);
    }
    if (fillStyles.includes(initialFillStyle)) {
      editor.setStyleForNextShapes(DefaultFillStyle, initialFillStyle);
    }
    if (fontStyles.includes(initialFontStyle)) {
      editor.setStyleForNextShapes(DefaultFontStyle, initialFontStyle);
    }
    if (sizeStyles.includes(initialSizeStyle)) {
      editor.setStyleForNextShapes(DefaultSizeStyle, initialSizeStyle);
    }

    editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
      // Presentation slide image must never be deleted (select+move/undo used to wipe it).
      if (isBackgroundShape(shape)) return false;
      const { presenter, isModerator: userIsModerator, userId } = currentUserRef.current;
      const isOwn = userId && shape.meta?.createdBy === userId;
      const hasPermission = isOwn || presenter || userIsModerator;
      return source === 'user' ? hasPermission : true;
    });

    editor.store.listen(
      (entry) => {
        const { changes } = entry;
        const { added, updated, removed } = changes;

        const addedIds = Object.keys(added).filter((id) => !isBackgroundShapeId(id));
        const addedCount = addedIds.length;
        const localShapes = editor.getCurrentPageShapes();
        const filteredShapes = localShapes?.filter((item) => item?.index !== 'a0' && !isBackgroundShape(item)) || [];
        const shapeNumberExceeded = filteredShapes
          .length + addedCount - 1 > maxNumberOfAnnotations;
        const invalidShapeType = addedIds.find((id) => !isValidShapeType(added[id]));

        if (addedCount > 0 && (shapeNumberExceeded || invalidShapeType)) {
          // notify and undo last command without persisting
          // to not generate the onUndo/onRedo callback
          if (shapeNumberExceeded) {
            notifyShapeNumberExceeded(intl, maxNumberOfAnnotations);
          } else {
            notifyNotAllowedChange(intl);
          }
          // use remote to not trigger unwanted updates
          editor.store.mergeRemoteChanges(() => {
            editor.history.undo({ persist: false });
            const tool = editor.getCurrentToolId();
            editor.setCurrentTool('noop');
            editor.setCurrentTool(tool);
          });
        } else {
          // Add new shapes to the batch (never persist the presentation BG image)
          addedIds.forEach((id) => {
            const record = added[id];
            const updatedRecord = {
              ...record,
              meta: {
                ...record.meta,
                createdBy: currentUser?.userId,
                presentationId: presentationIdRef.current,
              },
            };
            shapeBatchRef.current[updatedRecord.id] = updatedRecord;
          });
        }

        // Update existing shapes and add them to the batch
        Object.values(updated).forEach(([previousRecord, record]) => {
          if (isBackgroundShape(record)) return;

          const createdBy = previousRecord?.meta?.createdBy || currentUser?.userId;
          const updatedRecord = {
            ...record,
            meta: {
              ...record.meta,
              createdBy,
              updatedBy: currentUser?.userId,
              presentationId: presentationIdRef.current,
            },
          };

          const diff = getDifferences(prevShapesRef.current[record?.id], updatedRecord);
          if (diff) {
            diff.id = record.id;
            shapeBatchRef.current[updatedRecord.id] = diff;
          } else {
            shapeBatchRef.current[updatedRecord.id] = updatedRecord;
          }
        });

        // Handle removed shapes immediately (not batched). Never sync-remove the slide BG.
        const idsToRemove = Object.keys(removed).filter((id) => !isBackgroundShapeId(id));
        if (idsToRemove.length > 0) {
          removeShapes(idsToRemove);
        }
      },
      { source: 'user', scope: 'document' },
    );

    editor.store.listen(
      (entry) => {
        const { changes } = entry;
        const { updated } = changes;
        const { 'pointer:pointer': pointers } = updated;

        const path = editor.getPath();

        if ((isPresenterRef.current || hasWBAccessRef.current) && pointers) {
          const [, nextPointer] = pointers;
          updateCursorPosition(nextPointer?.x, nextPointer?.y);
        }

        const camKey = `camera:page:${curPageIdRef.current}`;
        const { [camKey]: cameras } = updated;

        if (cameras) {
          const [prevCam, nextCam] = cameras;
          const panned = prevCam.x !== nextCam.x || prevCam.y !== nextCam.y;

          const zoomed = prevCam.z !== nextCam.z;
          if (panned && !isWheelZoomRef.current) {
            markUserCameraInteraction();
          }
          if (isPresenterRef.current && (panned || zoomed) && isMountedRef.current) {
            const baseZ = calculateZoomValueRef.current?.(
              currentPresentationPageRef.current?.scaledWidth,
              currentPresentationPageRef.current?.scaledHeight,
            );
            if (baseZ > 0) {
              const pageKey = `${presentationIdRef.current}_${curPageIdRef.current}`;
              pageActualZoomRatioRef.current[pageKey] = nextCam.z / baseZ;
            }
          }

          if ((panned || (zoomed || fitToWidthRef.current)) && isPresenterRef.current) {
            const page = currentPresentationPageRef.current;
            const viewportPageBounds = editor?.getViewportPageBounds();
            let viewedRegionW = SlideCalcUtil.calcViewedRegionWidth(
              viewportPageBounds?.w,
              page?.scaledWidth,
            );
            let viewedRegionH = SlideCalcUtil.calcViewedRegionHeight(
              viewportPageBounds?.h,
              page?.scaledHeight,
            );
            let publishX = nextCam.x;
            let publishY = nextCam.y;

            // Skyroom phone letterboxes the slide inside a full-stage canvas.
            // Those local negative camera offsets must stay local — publishing
            // them (or viewBox > 100%) breaks the presenter's own later sync and
            // is unnecessary because every client recenters full-slide views.
            const showingFullSlide = viewedRegionW >= HUNDRED_PERCENT - 0.2
              && viewedRegionH >= HUNDRED_PERCENT - 0.2;
            if (showingFullSlide) {
              viewedRegionW = HUNDRED_PERCENT;
              viewedRegionH = HUNDRED_PERCENT;
              publishX = 0;
              publishY = 0;
            }

            const tlCamPercent = Math.round(
              (nextCam.z / (initialZoomRef.current || 1)) * 100,
            );

            if (tlCamPercent !== zoomValueRef.current) {
              hasZoomSyncedRef.current = false;
            }

            if (isWheelZoomRef.current) {
              zoomSlide(
                viewedRegionW, viewedRegionH, publishX, publishY,
                page,
              );
              return;
            }

            if (
              tlCamPercent === zoomValueRef.current
              && (!hasZoomSyncedRef.current || (hasZoomSyncedRef.current && panned))
              && isMountedRef.current
            ) {
              hasZoomSyncedRef.current = true;

              zoomSlide(
                viewedRegionW, viewedRegionH, publishX, publishY,
                page,
              );
            }
          }
        }

        // Check for idle states and persist the batch if there are shapes
        if (
          path === 'note.idle'
          || path === 'frame.idle'
          || path === 'line.idle'
          || path === 'arrow.idle'
          || path === 'geo.idle'
          || path === 'select.idle'
          || path === 'draw.idle'
          || path === 'select.editing_shape'
          || path === 'highlight.idle'
          || path === 'eraser.idle'
        ) {
          if (Object.keys(shapeBatchRef.current).length > 0) {
            const shapesToPersist = Object.values(shapeBatchRef.current);
            shapesToPersist.forEach((shape) => {
              persistShapeWrapper(
                shape,
                whiteboardIdRef.current,
                isModeratorRef.current,
              );
            });

            shapeBatchRef.current = {};
          }
        }
      },
      { source: 'user' },
    );

    // Capture camera changes from ALL sources (incl. 'api' from setCamera calls
    // that sync the viewer's camera to the presenter's zoom level).
    // No scope filter: camera records may not be in the 'document' scope in this
    // tldraw version, so omitting scope ensures the listener always fires.
    editor.store.listen(
      ({ changes, source }) => {
        const camKey = `camera:page:${curPageIdRef.current}`;
        if (changes?.updated?.[camKey]) {
          if (source === 'api' && isPresenterRef.current && isMountedRef.current) {
            const [, nextCam] = changes.updated[camKey];
            const baseZ = calculateZoomValueRef.current?.(
              currentPresentationPageRef.current?.scaledWidth,
              currentPresentationPageRef.current?.scaledHeight,
            );
            if (baseZ > 0) {
              const pKey = `${presentationIdRef.current}_${curPageIdRef.current}`;
              pageActualZoomRatioRef.current[pKey] = nextCam.z / baseZ;
            }
          }
          updateCursorZoomRef.current?.();
        }
      },
    );

    if (editor && curPageIdRef.current) {
      const page = [];
      const formattedPageId = parseInt(curPageIdRef.current, 10);
      const currentPageId = `page:${formattedPageId}`;
      const currPageExists = tlEditorRef.current?.getPage(currentPageId);

      if (!currPageExists) {
        const currentPage = createPage(currentPageId);
        page.push(...currentPage);
      }

      const hasShapes = shapes && Object.keys(shapes).length > 0;
      // Filter shapes to only include those belonging to the current presentation
      const currentPresId = presentationIdRef.current;
      const remoteShapesArray = hasShapes
        ? Object.values(shapes)
          .filter((shape) => {
            const shapePresId = shape.meta?.presentationId;
            return !shapePresId || shapePresId === currentPresId;
          })
          .map((shape) => sanitizeShape(shape))
        : [];

      editor.store.mergeRemoteChanges(() => {
        editor.batch(() => {
          editor.store.put(page);
          editor.store.put(assets);
          editor.setCurrentPage(`page:${curPageIdRef.current}`);
          editor.store.put(bgShape);
          if (remoteShapesArray.length > 0) {
            editor.store.put(remoteShapesArray);
          }
          editor.history.clear();
        });
      });

      // eslint-disable-next-line no-param-reassign
      editor.store.onBeforeChange = (prev, next) => {
        if (isPhone && whiteboardToolbarAutoHide) {
          const path = editor.getPath();
          const activePaths = [
            'draw.drawing',
            'eraser.erasing',
            'select.dragging_handle',
            'select.resizing',
            'select.translating',
            'select.rotating',
            'select.editing_shape',
            'hand.pointing',
            'hand.dragging',
            'geo.pointing',
            'line.pointing',
            'highlight.drawing',
          ];
          const idlePaths = [
            'draw.idle',
            'eraser.idle',
            'select.idle',
            'hand.idle',
            'highlight.idle',
          ];

          let visibilityState = null;
          if (activePaths.includes(path)) {
            visibilityState = 'visible';
          } else if (idlePaths.includes(path)) {
            visibilityState = 'hidden';
          }

          if (visibilityState && visibilityState !== lastVisibilityStateRef.current) {
            if (visibilityState === 'visible') {
              toggleToolsAnimations(
                'fade-in',
                'fade-out',
                '0s',
                hasWBAccessRef.current || isPresenterRef.current,
              );
            } else if (visibilityState === 'hidden') {
              toggleToolsAnimations(
                'fade-out',
                'fade-in',
                '0s',
                hasWBAccessRef.current || isPresenterRef.current,
              );
            }
            lastVisibilityStateRef.current = visibilityState;
          }
        }

        const newNext = next;
        if (next?.typeName === 'instance_page_state') {
          // Never leave the slide image selected — transform/move handles make it
          // jump or vanish when users try to pan with the select tool on mobile.
          if (Array.isArray(next.selectedShapeIds) && next.selectedShapeIds.length > 0) {
            const withoutBg = next.selectedShapeIds.filter((id) => !isBackgroundShapeId(id));
            if (withoutBg.length !== next.selectedShapeIds.length) {
              newNext.selectedShapeIds = withoutBg;
            }
          }

          if (isBackgroundShapeId(next.hoveredShapeId)) {
            newNext.hoveredShapeId = null;
          }

          if (isPresenterRef.current || isModeratorRef.current) return newNext;

          // Filter selectedShapeIds based on shape owner
          if (newNext.selectedShapeIds?.length > 0) {
            newNext.selectedShapeIds = newNext.selectedShapeIds.filter((shapeId) => {
              const selectedShape = editor.getShape(shapeId);
              // A remote annotation delete may land between pointer hit-testing
              // and this page-state update. Never retain an id whose shape is no
              // longer in the store; tldraw assumes selected ids are resolvable.
              if (!selectedShape) return false;
              const shapeOwner = selectedShape.meta?.createdBy;
              return !shapeOwner || shapeOwner === currentUserRef.current?.userId;
            });
          }

          if (!isEqual(prev.hoveredShapeId, newNext.hoveredShapeId)
            && newNext.hoveredShapeId) {
            const hoveredShape = editor.getShape(newNext.hoveredShapeId);
            const hoveredShapeOwner = hoveredShape?.meta?.createdBy;
            // setHoveredShape(null) is the normal pointer-leave path. Do not pass
            // that null through editor.getShape: this tldraw version dereferences
            // non-string inputs as shape objects. Also clear stale ids produced by
            // a concurrent remote deletion before the next pointer event sees them.
            if (!hoveredShape
              || hoveredShapeOwner !== currentUserRef.current?.userId
              || isBackgroundShapeId(newNext.hoveredShapeId)) {
              newNext.hoveredShapeId = null;
            }
          }

          return newNext;
        }

        if (next && next?.typeName === 'shape') {
          // Pin the presentation BG image against select-tool translate/unlock.
          // Still allow remote asset/size sync via ...next props.
          if (isBackgroundShape(next) && prev && isBackgroundShape(prev)) {
            const moved = prev.x !== next.x
              || prev.y !== next.y
              || (prev.rotation ?? 0) !== (next.rotation ?? 0);
            const unlocked = next.isLocked === false;
            if (moved || unlocked) {
              return {
                ...next,
                x: prev.x,
                y: prev.y,
                rotation: prev.rotation ?? 0,
                isLocked: true,
                meta: {
                  ...next?.meta,
                  version: next.meta?.version ? next.meta.version + 1 : 1,
                },
              };
            }
          }

          const newVersion = next.meta?.version ? next.meta?.version + 1 : 1;
          return {
            ...next,
            meta: {
              ...next?.meta,
              version: newVersion,
            },
          };
        }

        // Adjust camera position to ensure it stays within bounds.
        // Use screenBounds/next.z — getViewportPageBounds() still reflects prev.z
        // during onBeforeChange, which mis-clamps letterbox centering and leaves
        // newly uploaded images stuck in the presenter's top-left corner on phone.
        const isCameraRecord = next?.typeName === CAMERA_TYPE
          || (typeof next?.id === 'string' && next.id.includes('camera'));
        const panned = isCameraRecord && (prev.x !== next.x || prev.y !== next.y);
        const zoomChanged = isCameraRecord && prev.z !== next.z;
        // Presenters: also re-clamp on zoom so a z-only update at x/y=0 cannot
        // leave a contain-fit slide pinned to the corner. Viewers: pan only
        // (upstream), so following a zoomed presenter is unchanged.
        const shouldClampCamera = !currentPresentationPageRef.current?.infiniteWhiteboard
          && (panned || (zoomChanged && isPresenterRef.current));
        if (shouldClampCamera) {
          const presentationWidthLocal = currentPresentationPageRef.current?.scaledWidth || 0;
          const presentationHeightLocal = currentPresentationPageRef.current?.scaledHeight || 0;
          const zoom = Number.isFinite(next.z) && next.z > 0 ? next.z : 1;
          // Clamp against the real canvas (presentationWidth×Height / DOM), never
          // the Skyroom phone "safe" fit area — that re-pins letterboxed slides.
          const {
            areaWidth: screenW,
            areaHeight: screenH,
          } = resolveCameraViewportSize(
            editor,
            presentationWidth,
            presentationHeight,
          );
          let viewportWidth = screenW / zoom;
          let viewportHeight = screenH / zoom;

          // Non-Skyroom / following a zoomed presenter: prefer the published
          // viewBox when the slide is larger than the local contain viewport.
          if (!isPresenterRef.current) {
            const viewBoxW = currentPresentationPageRef.current?.scaledViewBoxWidth;
            const viewBoxH = currentPresentationPageRef.current?.scaledViewBoxHeight;
            const presentationPage = currentPresentationPageRef.current;
            const localFullSlide = shouldUseLocalFullSlideCamera(
              presentationPage,
              presentationPage?.xOffset,
              presentationPage?.yOffset,
            );
            if (!localFullSlide && viewBoxW > 0 && viewBoxH > 0) {
              viewportWidth = viewBoxW;
              viewportHeight = viewBoxH;
            }
          }

          const { x: clampedX, y: clampedY } = clampCameraPanOffsets(
            next.x,
            next.y,
            next.z,
            presentationWidthLocal,
            presentationHeightLocal,
            viewportWidth,
            viewportHeight,
          );
          newNext.x = clampedX;
          newNext.y = clampedY;
        }

        return newNext;
      };

      // eslint-disable-next-line no-param-reassign
      editor.store.onAfterChange = (prev, next) => {
        if (next?.typeName !== 'instance_page_state') return;
        // onBeforeChange strips BG from selection; keep this flag for toolbar CSS only.
        bgSelectedRef.current = (next.selectedShapeIds || [])
          .some((id) => isBackgroundShapeId(id));
      };

      if (!isPresenterRef.current && !hasWBAccessRef.current) {
        editor?.setCurrentTool('noop');
      } else {
        const {
          initialSelectedTool: initialSelectedToolFromConfig,
          multiUserTools,
        } = window.meetingClientSettings.public.whiteboard.toolbar;
        let initialSelectedTool = getFromUserSettings(
          'bbb_initial_selected_tool',
          initialSelectedToolFromConfig,
        );

        if (toolbarSavedState) {
          const {
            selectedTool: savedSelectedTool,
          } = toolbarSavedState;

          if (savedSelectedTool && multiUserTools.includes(savedSelectedTool)) {
            initialSelectedTool = savedSelectedTool;
          }
        }

        if (isPresenterRef.current) {
          // SafeMeet: presenters always start with the draw tool selected.
          editor?.setCurrentTool('draw');
        } else if (
          allowInfiniteWhiteboardPanForViewers
          && currentPresentationPageRef.current?.infiniteWhiteboard
          && !isModeratorRef.current
        ) {
          editor?.setCurrentTool('hand');
        } else {
          const initialTool = multiUserTools.includes(initialSelectedTool) ? initialSelectedTool : 'noop';
          editor?.setCurrentTool(initialTool);
        }
      }
    }

    pollInnerWrapperDimensionsUntilStable(() => {
      adjustCameraOnMount(!isPresenterRef.current);
    });

    // New cursor hint shape: circle scaled by pointerDiameter, centered at (0,0)
    // so that useTransform's translate(x,y) places the circle center exactly on
    // the cursor's page coordinate (no additional CSS offset needed).
    const hintRadius = 3 * (pointerDiameter / 5);
    const newD = `M ${hintRadius},0 A ${hintRadius},${hintRadius} 0 1,0 ${-hintRadius},0 A ${hintRadius},${hintRadius} 0 1,0 ${hintRadius},0`;
    // Fetch the cursor hint element and update its path
    const cursorHint = document.getElementById('cursor_hint');
    if (cursorHint) {
      cursorHint.setAttribute('d', newD);
    }
  };

  const syncCameraOnPresenterZoom = () => {
    if (
      !tlEditorRef.current
      || !curPageIdRef.current
      || !currentPresentationPageRef.current
    ) {
      return;
    }

    let zoomLevelForReset;
    if (fitToWidthRef.current || !initialZoomRef.current) {
      zoomLevelForReset = calculateZoomValue(
        currentPresentationPageRef.current.scaledWidth,
        currentPresentationPageRef.current.scaledHeight,
      );
    } else {
      zoomLevelForReset = initialZoomRef.current;
    }

    const { widthGap } = getContainerDimensions();

    if (widthGap > 0) {
      zoomLevelForReset = calculateZoomWithGapValue(
        currentPresentationPageRef.current.scaledWidth,
        currentPresentationPageRef.current.scaledHeight,
        widthGap,
      );
    }

    const zoomCamera = (zoomLevelForReset * zoomValueRef.current) / HUNDRED_PERCENT;
    const slideShape = tlEditorRef.current.getShape(`shape:BG-${curPageIdRef.current}`);
    const camera = tlEditorRef.current.getCamera();
    const viewportScreenBounds = tlEditorRef.current.getViewportScreenBounds();
    const viewportWidth = viewportScreenBounds.width;
    const viewportHeight = viewportScreenBounds.height;
    let newCamera;

    // Upstream BBB: keep the cursor/slide centered while toolbar zoom changes by
    // preserving pan relative to the BG shape's screen center.
    if (slideShape) {
      const prevZoomCamera = camera.z;
      const prevCenteredCameraX = -slideShape.x
        + (viewportWidth - slideShape.props.w * prevZoomCamera) / (2 * prevZoomCamera);
      const prevCenteredCameraY = -slideShape.y
        + (viewportHeight - slideShape.props.h * prevZoomCamera) / (2 * prevZoomCamera);

      const pageJustChanged = pageJustChangedRef.current;
      if (pageJustChanged) pageJustChangedRef.current = false;

      const panningOffsetX = pageJustChanged ? 0 : (camera.x - prevCenteredCameraX);
      const panningOffsetY = pageJustChanged ? 0 : (camera.y - prevCenteredCameraY);

      const centeredCameraX = -slideShape.x
        + (viewportWidth - slideShape.props.w * zoomCamera) / (2 * zoomCamera);
      const centeredCameraY = -slideShape.y
        + (viewportHeight - slideShape.props.h * zoomCamera) / (2 * zoomCamera);

      if (pageJustChanged && zoomValueRef.current !== HUNDRED_PERCENT) {
        newCamera = {
          x: currentPresentationPageRef.current.xOffset,
          y: currentPresentationPageRef.current.yOffset,
          z: zoomCamera,
        };
      } else {
        newCamera = {
          x: centeredCameraX + panningOffsetX,
          y: centeredCameraY + panningOffsetY,
          z: zoomCamera,
        };
      }
    } else {
      newCamera = {
        x: camera.x + ((viewportWidth / 2) / camera.z - (viewportWidth / 2) / zoomCamera),
        y: camera.y + ((viewportHeight / 2) / camera.z - (viewportHeight / 2) / zoomCamera),
        z: zoomCamera,
      };
    }

    if (newCamera) {
      tlEditorRef.current.setCamera(newCamera, { duration: 175 });
    }
  };

  const syncCameraWithPresentationArea = () => {
    if (isWheelZoomRef.current || isUserPanningRef.current) {
      return;
    }

    if (
      !tlEditorRef.current
      || !currentPresentationPageRef.current
      || presentationAreaWidth <= 0
      || presentationAreaHeight <= 0
    ) {
      return;
    }

    const currentZoom = zoomValueRef.current || HUNDRED_PERCENT;
    const {
      scaledWidth,
      scaledHeight,
      scaledViewBoxWidth,
      scaledViewBoxHeight,
      xOffset,
      yOffset,
    } = currentPresentationPageRef.current || {};

    if (scaledWidth <= 0 || scaledHeight <= 0) {
      return;
    }

    const baseZoom = calculateZoomValue(scaledWidth, scaledHeight);

    // Use the actual stored zoom ratio for this page if available (preserves wheel zoom
    // across slide switches). The ratio is zoom-level-independent so it scales correctly
    // on resize. Fall back to toolbar zoom for first-visit or untracked pages.
    const pageKey = `${presentationIdRef.current}_${curPageIdRef.current}`;
    const storedZoomRatio = pageActualZoomRatioRef.current[pageKey];
    let adjustedZoom = storedZoomRatio !== undefined
      ? storedZoomRatio * baseZoom
      : (baseZoom * currentZoom) / HUNDRED_PERCENT;

    if (isPresenter) {
      const {
        widthGap,
      } = getContainerDimensions();

      if (widthGap > 0 && storedZoomRatio === undefined) {
        const gapZoom = (
          calculateZoomWithGapValue(
            scaledWidth,
            scaledHeight,
            widthGap,
          ) || HUNDRED_PERCENT
        );
        adjustedZoom = (gapZoom * currentZoom) / HUNDRED_PERCENT;
      }

      const camera = tlEditorRef.current.getCamera();
      const newZ = adjustedZoom;
      const page = currentPresentationPageRef.current;
      const backendX = xOffset ?? 0;
      const backendY = yOffset ?? 0;
      const useFullSlideOrigin = shouldUseLocalFullSlideCamera(page, backendX, backendY);
      let nextX = camera.x;
      let nextY = camera.y;

      if (useFullSlideOrigin) {
        const {
          areaWidth: cameraAreaWidth,
          areaHeight: cameraAreaHeight,
        } = resolveCameraViewportSize(
          tlEditorRef.current,
          presentationWidth,
          presentationHeight,
        );
        const centered = calculateSkyroomAwareCenteredCameraOffsets(
          scaledWidth,
          scaledHeight,
          newZ,
          cameraAreaWidth,
          cameraAreaHeight,
          fitToWidthRef.current,
        );
        nextX = centered.xOffset;
        nextY = centered.yOffset;
      }

      // Upstream BBB updates zoom on area resize; full-slide recenters locally
      // without publishing viewport-specific letterbox offsets.
      const updatedCurrentCam = {
        ...camera,
        x: nextX,
        y: nextY,
        z: newZ,
      };
      tlEditorRef.current.store.mergeRemoteChanges(() => {
        tlEditorRef.current.store.put([updatedCurrentCam]);
      });

      // Remote camera updates do not trigger the user-source listener.
      // Fit-to-width and full-slide contain views publish a canonical 100/100/0/0
      // so phone letterbox offsets never become the meeting-wide camera.
      if (fitToWidthRef.current || useFullSlideOrigin) {
        requestAnimationFrame(() => {
          const forcedView = buildPublishableFullSlideView(curPageIdRef.current);

          if (isEqual(lastForcedViewRef.current, forcedView)) {
            return;
          }

          const presentationPage = currentPresentationPageRef.current;
          const backendAlreadyCanonical = shouldLocallyCenterCamera(
            presentationPage?.xOffset,
            presentationPage?.yOffset,
          ) && isFullSlideCameraView(presentationPage);

          if (backendAlreadyCanonical) {
            lastForcedViewRef.current = forcedView;
            return;
          }

          lastForcedViewRef.current = forcedView;
          zoomSlide(
            forcedView.w,
            forcedView.h,
            forcedView.x,
            forcedView.y,
            presentationPage,
          );
        });
      }
    } else {
      const page = currentPresentationPageRef.current;
      const useFullSlideOrigin = shouldUseLocalFullSlideCamera(page, xOffset, yOffset);
      const viewerFitWidth = useFullSlideOrigin ? scaledWidth : scaledViewBoxWidth;
      const viewerFitHeight = useFullSlideOrigin ? scaledHeight : scaledViewBoxHeight;
      const newZoom = useFullSlideOrigin
        ? resolveFullSlideFitZoom(viewerFitWidth, viewerFitHeight)
        : calculateZoomValue(viewerFitWidth, viewerFitHeight);
      const camera = tlEditorRef.current.getCamera();
      let nextX = useFullSlideOrigin ? 0 : xOffset;
      let nextY = useFullSlideOrigin ? 0 : yOffset;

      if (useFullSlideOrigin) {
        const {
          areaWidth: cameraAreaWidth,
          areaHeight: cameraAreaHeight,
        } = resolveCameraViewportSize(
          tlEditorRef.current,
          presentationWidth,
          presentationHeight,
        );
        const centered = calculateSkyroomAwareCenteredCameraOffsets(
          viewerFitWidth,
          viewerFitHeight,
          newZoom,
          cameraAreaWidth,
          cameraAreaHeight,
          fitToWidthRef.current,
        );
        nextX = centered.xOffset;
        nextY = centered.yOffset;
      }

      const updatedCurrentCam = {
        ...camera,
        x: nextX,
        y: nextY,
        z: newZoom,
      };
      tlEditorRef.current.store.put([updatedCurrentCam]);
    }
  };

  // Image uploads often resolve svgUrl / scaled size after tldraw mounts. Without
  // this sync the BG asset stays empty or half-sized and the camera centers on
  // stale slide bounds (common on Skyroom mobile after picking a photo).
  React.useEffect(() => {
    if (!tlEditorRef.current || !assets?.length || !bgShape?.length) return undefined;

    tlEditorRef.current.store.mergeRemoteChanges(() => {
      tlEditorRef.current.store.put(assets);
      tlEditorRef.current.store.put(bgShape);
    });

    if (isWheelZoomRef.current || isUserPanningRef.current) return undefined;

    // New/settled dimensions invalidate any prior "already published" fit so
    // phone re-letterboxes the real image instead of keeping a corner crop.
    lastForcedViewRef.current = null;
    try {
      localStorage.removeItem('initialViewBoxWidth');
      localStorage.removeItem('initialViewBoxHeight');
    } catch (error) {
      // ignore quota / private-mode failures
    }
    initialViewBoxWidthRef.current = null;
    initialViewBoxHeightRef.current = null;

    const frameId = requestAnimationFrame(() => {
      pollInnerWrapperDimensionsUntilStable(() => {
        if (isPresenterRef.current) {
          try {
            adjustCameraOnMount(false);
          } catch (error) {
            syncCameraWithPresentationArea();
          }
        } else {
          syncCameraWithPresentationArea();
        }
      }, {
        maxTries: 80,
        stabilityFrames: 16,
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [
    currentPresentationPage?.svgUrl,
    currentPresentationPage?.scaledWidth,
    currentPresentationPage?.scaledHeight,
    curPageId,
    presentationId,
  ]);

  useMouseEvents(
    {
      whiteboardRef, tlEditorRef, isWheelZoomRef, initialZoomRef, isPresenterRef,
    },
    {
      hasWBAccess: hasWBAccessRef.current,
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
    },
  );

  useSkyroomToolbarTouchFix(
    isSkyroomColumnLayout() && isSkyroomMobileViewport(),
  );

  useSkyroomMobileStylePanelAnchor(
    isSkyroomColumnLayout() && isSkyroomMobileViewport(),
  );

  React.useEffect(() => {
    const handleArrowPress = (event) => {
      const currPageNum = parseInt(curPageIdRef.current, 10);
      const shapeSelected = tlEditorRef.current.getSelectedShapes()?.length > 0;
      const changeSlide = (direction) => {
        if (!currentPresentationPage) return;
        const newSlideNum = currPageNum + direction;
        const outOfBounds = direction > 0
          ? newSlideNum > currentPresentationPage?.totalPages
          : newSlideNum < 1;

        if (outOfBounds) return;

        skipToSlide(newSlideNum);
        zoomChanger(HUNDRED_PERCENT);
        zoomSlide(HUNDRED_PERCENT, HUNDRED_PERCENT, 0, 0);
      };

      if (!shapeSelected) {
        if (event.keyCode === KEY_CODES.ARROW_RIGHT) {
          changeSlide(1); // Move to the next slide
        } else if (event.keyCode === KEY_CODES.ARROW_LEFT) {
          changeSlide(-1); // Move to the previous slide
        }
      }
    };

    const handleKeyDown2 = (event) => {
      if (
        (event.keyCode === KEY_CODES.ARROW_RIGHT
          || event.keyCode === KEY_CODES.ARROW_LEFT)
        && isPresenterRef.current
      ) {
        handleArrowPress(event);
      }

      if (
        event.keyCode === KEY_CODES.ENTER
        && event.target.classList.contains('tl-frame-name-input')
      ) {
        tlEditorRef.current?.selectNone();
        tlEditorRef.current?.complete();
      }
    };

    const handleKeyUp = (event) => {
      if (event.keyCode === KEY_CODES.SPACE) {
        event.preventDefault();
        event.stopPropagation();
        if (previousTool.current) {
          tlEditorRef.current?.setCurrentTool(previousTool.current);
          previousTool.current = null;
        }
      }
    };

    whiteboardRef.current?.addEventListener('keydown', handleKeyDown2, {
      capture: true,
    });
    whiteboardRef.current?.addEventListener('keyup', handleKeyUp, {
      capture: true,
    });
    return () => {
      whiteboardRef.current?.removeEventListener('keydown', handleKeyDown2);
      whiteboardRef.current?.removeEventListener('keyup', handleKeyUp);
    };
  }, [whiteboardRef.current]);

  React.useEffect(() => {
    zoomValueRef.current = zoomValue;
    setPageZoomMap((prev) => ({
      ...prev,
      [`${presentationIdRef.current}_${curPageIdRef.current}`]: zoomValue,
    }));

    if (pageChanged) {
      // On first mount, usePrevious returns undefined, causing a false-positive
      // pageChanged that would call zoomChanger(100) from an empty pageZoomMap
      // (cleared on unmount). Guard against it to preserve the toolbar zoom value
      // after a minimize → restore cycle.
      if (prevCurPageId === undefined) {
        prevZoomValueRef.current = zoomValue;
        return;
      }
      const storedZoom = pageZoomMap[`${presentationIdRef.current}_${curPageIdRef.current}`] || HUNDRED_PERCENT;
      zoomChanger(storedZoom);
      // If storedZoom === zoomValue, zoomChanger is a no-op and no follow-up effect will fire.
      // In that case syncCameraOnPresenterZoom must be called directly to restore camera position.
      if (storedZoom === zoomValue) {
        if (tlEditorRef.current && curPageIdRef.current && currentPresentationPage && isPresenter && !isMounting) {
          pageJustChangedRef.current = true;
          syncCameraOnPresenterZoom();
        }
      } else {
        pageJustChangedRef.current = true;
      }
      return;
    }

    if (
      tlEditorRef.current
      && curPageIdRef.current
      && currentPresentationPage
      && isPresenter
      && !isWheelZoomRef.current
      && !isUserPanningRef.current
    ) {
      if (!isMounting && prevZoomValueRef.current !== zoomValue) {
        syncCameraOnPresenterZoom();
      }
    }
    prevZoomValueRef.current = zoomValue;
  }, [zoomValue, pageChanged, tlEditorRef.current]);

  const prevFitToWidth = usePrevious(fitToWidth);

  React.useEffect(() => {
    if (prevFitToWidth !== undefined && prevFitToWidth !== fitToWidth && isPresenter) {
      zoomChanger(HUNDRED_PERCENT);
      zoomSlide(HUNDRED_PERCENT, HUNDRED_PERCENT, 0, 0);
    }
  }, [fitToWidth, prevFitToWidth, isPresenter, zoomChanger, zoomSlide]);

  React.useEffect(() => {
    debouncedSetInitialZoom();
  }, [
    presentationAreaWidth,
    presentationAreaHeight,
    presentationWidth,
    presentationHeight,
    isPresenter,
    presentationId,
    fitToWidth,
    layoutChanged,
    pageChanged,
  ]);

  React.useEffect(() => {
    if (isMountedPollingFrameRef.current !== null) {
      cancelAnimationFrame(isMountedPollingFrameRef.current);
    }
    isMountedPollingFrameRef.current = requestAnimationFrame(() => {
      pollUntilMounted(() => {
        if (innerWrapperPollingFrameRef.current !== null) {
          cancelAnimationFrame(innerWrapperPollingFrameRef.current);
        }
        innerWrapperPollingFrameRef.current = requestAnimationFrame(() => {
          pollInnerWrapperDimensionsUntilStable(() => {
            syncCameraWithPresentationArea();
          }, {
            maxTries: 120,
            stabilityFrames: 35,
          }, innerWrapperPollingFrameRef);
        });
      }, () => {
        logger.warn(
          { logCode: 'pollUntilMounted' },
          'Failed to wait for component to be mounted',
        );
      }, isMountedPollingFrameRef);
    });
  }, [
    presentationHeight,
    presentationWidth,
    presentationAreaHeight,
    presentationAreaWidth,
    curPageId,
    presentationId,
    isPresenter,
    hasWBAccess,
  ]);

  React.useEffect(() => {
    // hideUi / slide-nav unmount on role change; let the settled-area poll
    // recenter instantly instead of animating a stale over-zoom to the left.
    if (presenterChanged) {
      return;
    }
    if (!isPresenter
      && !viewerCanPan
      && tlEditorRef.current
      && initialViewBoxWidthRef.current
      && initialViewBoxHeightRef.current
      && currentPresentationPage
    ) {
      const {
        scaledWidth,
        scaledHeight,
        scaledViewBoxWidth,
        scaledViewBoxHeight,
        xOffset: pageXOffset,
        yOffset: pageYOffset,
      } = currentPresentationPage;
      const useFullSlideOrigin = shouldUseLocalFullSlideCamera(
        currentPresentationPage,
        pageXOffset,
        pageYOffset,
      );
      const viewerFitWidth = useFullSlideOrigin ? scaledWidth : scaledViewBoxWidth;
      const viewerFitHeight = useFullSlideOrigin ? scaledHeight : scaledViewBoxHeight;
      const fitZoom = useFullSlideOrigin
        ? resolveFullSlideFitZoom(viewerFitWidth, viewerFitHeight)
        : calculateZoomValue(viewerFitWidth, viewerFitHeight);
      let nextX = useFullSlideOrigin ? 0 : pageXOffset;
      let nextY = useFullSlideOrigin ? 0 : pageYOffset;

      if (useFullSlideOrigin) {
        const {
          areaWidth: cameraAreaWidth,
          areaHeight: cameraAreaHeight,
        } = resolveCameraViewportSize(
          tlEditorRef.current,
          presentationWidth,
          presentationHeight,
        );
        const centered = calculateSkyroomAwareCenteredCameraOffsets(
          viewerFitWidth,
          viewerFitHeight,
          fitZoom,
          cameraAreaWidth,
          cameraAreaHeight,
          fitToWidth,
        );
        nextX = centered.xOffset;
        nextY = centered.yOffset;
      }

      // Full-slide: letterbox-center in this client's canvas. Otherwise follow
      // the presenter's published page-space viewBox offsets (upstream sync).
      setCamera(fitZoom, nextX, nextY);
    }
  }, [currentPresentationPage, isPresenter, viewerCanPan, presentationAreaWidth, presentationAreaHeight, fitToWidth]);

  React.useEffect(() => {
    if (tlEditorRef.current) {
      const useElement = document.querySelector('.tl-cursor use');
      if (useElement && !isMultiUserActive && !isPresenter) {
        useElement.setAttribute('href', '#redPointer');
      } else if (useElement) {
        useElement.setAttribute('href', '#cursor');
      }
    }
  }, [isMultiUserActive, isPresenter]);

  const updateStore = (pages, cameras) => {
    tlEditorRef.current.store.put(pages);
    tlEditorRef.current.store.put(cameras);
    tlEditorRef.current.store.put(assets);
    tlEditorRef.current.store.put(bgShape);
  };

  const finalizeStore = () => {
    tlEditorRef.current.history.clear();
  };

  const toggleToolbarIfNeeded = () => {
    if (whiteboardToolbarAutoHide && toggleToolsAnimations) {
      toggleToolsAnimations('fade-in', 'fade-out', '0s', hasWBAccessRef.current || isPresenterRef.current);
    }
  };

  const resetSlideState = () => {
    slideChanged.current = false;
    slideNext.current = null;
  };

  React.useEffect(() => {
    const formattedPageId = parseInt(curPageIdRef.current, 10);
    if (tlEditorRef.current && formattedPageId !== 0) {
      tlEditorRef.current.store.mergeRemoteChanges(() => {
        tlEditorRef.current.batch(() => {
          const currentPageId = `page:${formattedPageId}`;
          const tlZ = tlEditorRef.current.getCamera()?.z;
          const cameras = [];
          const pages = [];
          const currPageExists = tlEditorRef.current?.getPage(currentPageId);
          if (!currPageExists) {
            const currentPage = createPage(currentPageId);
            pages.push(...currentPage);
          }
          const allRecords = tlEditorRef.current.store.allRecords();
          const cameraRecords = allRecords.filter(
            (record) => record.typeName === 'camera' && record.id === `camera:page:${formattedPageId}`,
          );
          if (cameraRecords?.length < 1) {
            cameras.push(createCamera(formattedPageId, tlZ));
          }
          cleanupStore(currentPageId);
          updateStore(pages, cameras);
          tlEditorRef.current.setCurrentPage(currentPageId);
          finalizeStore();
        });
      });

      toggleToolbarIfNeeded();
      resetSlideState();

      if (viewerCanPanRef.current) {
        pollInnerWrapperDimensionsUntilStable(() => {
          adjustCameraOnMount(true);
        });
      }
    }
  }, [curPageId]);

  React.useEffect(() => {
    setTldrawIsMounting(true);
    return () => {
      isMountedRef.current = false;
      localStorage.removeItem('initialViewBoxWidth');
      localStorage.removeItem('initialViewBoxHeight');
      localStorage.removeItem('pageZoomMap');
      localStorage.removeItem('pageActualZoomRatioMap');
      if (mountedTimeoutIdRef.current) {
        clearTimeout(mountedTimeoutIdRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isMounting) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      setIsMounting(false);
      // Defer parent state updates until after tldraw finishes its layout pass.
      setTldrawIsMounting(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isMounting, presentationAreaWidth, presentationAreaHeight, presentationId, setTldrawIsMounting]);

  React.useEffect(() => {
    const baseName = window.meetingClientSettings.public.app.cdn
      + window.meetingClientSettings.public.app.basename;
    const makeCursorUrl = (filename) => `${baseName}/resources/images/whiteboard-cursor/${filename}`;

    const TOOL_CURSORS = {
      draw: `url('${makeCursorUrl('pencil.png')}') 2 22, default`,
      line: `url('${makeCursorUrl('line.png')}'), default`,
      text: `url('${makeCursorUrl('text.png')}'), default`,
      note: `url('${makeCursorUrl('square.png')}'), default`,
      pan: `url('${makeCursorUrl('pan.png')}'), default`,
    };

    const currentTool = tlEditorRef.current?.getCurrentToolId();
    const newCursor = hasWBAccessRef.current || currentUser?.presenter ? TOOL_CURSORS[currentTool] || '' : 'inherit';
    setCursorType(newCursor);
  }, [tlEditorRef.current?.getCurrentToolId()]);

  const getToolbarCurrentState = useCallback(() => ({
    colorStyle: tlEditorRef.current?.getInstanceState().stylesForNextShape[DefaultColorStyle.id],
    dashStyle: tlEditorRef.current?.getInstanceState().stylesForNextShape[DefaultDashStyle.id],
    fillStyle: tlEditorRef.current?.getInstanceState().stylesForNextShape[DefaultFillStyle.id],
    fontStyle: tlEditorRef.current?.getInstanceState().stylesForNextShape[DefaultFontStyle.id],
    sizeStyle: tlEditorRef.current?.getInstanceState().stylesForNextShape[DefaultSizeStyle.id],
    selectedTool: tlEditorRef.current?.getCurrentToolId(),
  }), [
    tlEditorRef.current?.getInstanceState().stylesForNextShape,
    tlEditorRef.current?.getCurrentToolId(),
  ]);

  React.useEffect(() => () => {
    SessionStorage.setItem('whiteboardToolbarSavedState', getToolbarCurrentState());
  }, [getToolbarCurrentState]);

  React.useEffect(() => {
    if (!whiteboardToolbarAutoHide) {
      const optionsDropdown = document.getElementById('WhiteboardOptionButton');
      if (optionsDropdown?.classList.contains('fade-in')) {
        optionsDropdown.classList.remove('fade-in');
      }
    }
  }, [whiteboardToolbarAutoHide]);

  React.useEffect(() => {
    if (!isPhone || !toggleToolsAnimations || whiteboardToolbarAutoHide) return undefined;
    if (!(hasWBAccess || isPresenter)) return undefined;

    const isSkyroomMobilePresenter = isSkyroomColumnLayout()
      && isSkyroomMobileViewport()
      && isPresenter;

    const timer = window.setTimeout(() => {
      if (isSkyroomMobilePresenter) {
        toggleToolsAnimations('fade-out', 'fade-in', '0s', true);
        return;
      }
      toggleToolsAnimations('fade-in', 'fade-out', '0s', true);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [
    presentationId,
    isMounting,
    isPhone,
    hasWBAccess,
    isPresenter,
    whiteboardToolbarAutoHide,
    toggleToolsAnimations,
  ]);

  const hiddenGeoShapes = React.useMemo(() => {
    const bbbMultiUserPenOnly = getFromUserSettings(
      'bbb_multi_user_pen_only',
      window.meetingClientSettings.public.whiteboard.toolbar.multiUserPenOnly,
    );
    const bbbPresenterTools = getFromUserSettings(
      'bbb_presenter_tools',
      window.meetingClientSettings.public.whiteboard.toolbar.presenterTools,
    );
    const bbbMultiUserTools = getFromUserSettings(
      'bbb_multi_user_tools',
      window.meetingClientSettings.public.whiteboard.toolbar.multiUserTools,
    );

    const allGeoShapes = [...GeoShapeGeoStyle.values];
    if (bbbMultiUserPenOnly && !isModerator && !isPresenter) {
      return allGeoShapes;
    }
    if (bbbPresenterTools.length >= 1 && isPresenter) {
      return allGeoShapes.filter((shape) => !bbbPresenterTools.includes(shape));
    }
    if (bbbMultiUserTools.length >= 1) {
      return allGeoShapes.filter((shape) => !bbbMultiUserTools.includes(shape));
    }
    return [];
  }, [isPresenter, isModerator]);

  return (
    <div
      ref={whiteboardRef}
      id="whiteboard-element"
      key={`animations=-${animations}-${whiteboardToolbarAutoHide}-${language}-${presentationId}-${fitToWidth}`}
    >
      <Tldraw
        autoFocus={false}
        key={`tldrawv2-${presentationId}-${animations}`}
        forceMobile
        hideUi={!(hasWBAccess || isPresenter)}
        onMount={handleTldrawMount}
        tools={customTools}
        overrides={customUiOverrides}
      />
      {!isPresenter && !hasWBAccess && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 300,
            touchAction: 'none',
          }}
        />
      )}
      <Styled.TldrawV2GlobalStyle
        {...{
          hasWBAccess,
          bgSelected: bgSelectedRef.current,
          isPresenter,
          isRTL,
          isMultiUserActive,
          isToolbarVisible,
          presentationHeight,
          cursorType,
          pointerDiameter,
          hiddenGeoShapes,
          viewerCanPan,
          isSkyroom: isSkyroomColumnLayout(),
          isSkyroomMobile: isSkyroomColumnLayout() && isSkyroomMobileViewport(),
        }}
      />
    </div>
  );
});

export default Whiteboard;

Whiteboard.propTypes = {
  isPresenter: PropTypes.bool,
  isPhone: PropTypes.bool,
  removeShapes: PropTypes.func.isRequired,
  persistShapeWrapper: PropTypes.func.isRequired,
  notifyNotAllowedChange: PropTypes.func.isRequired,
  shapes: PropTypes.arrayOf(PropTypes.shape).isRequired,
  assets: PropTypes.arrayOf(PropTypes.shape).isRequired,
  currentUser: PropTypes.shape({
    userId: PropTypes.string.isRequired,
  }),
  whiteboardId: PropTypes.string,
  zoomSlide: PropTypes.func.isRequired,
  curPageNum: PropTypes.number.isRequired,
  presentationWidth: PropTypes.number.isRequired,
  presentationHeight: PropTypes.number.isRequired,
  zoomChanger: PropTypes.func.isRequired,
  isRTL: PropTypes.bool.isRequired,
  fitToWidth: PropTypes.bool.isRequired,
  zoomValue: PropTypes.number.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  colorStyle: PropTypes.string.isRequired,
  dashStyle: PropTypes.string.isRequired,
  fillStyle: PropTypes.string.isRequired,
  fontStyle: PropTypes.string.isRequired,
  sizeStyle: PropTypes.string.isRequired,
  presentationAreaHeight: PropTypes.number.isRequired,
  presentationAreaWidth: PropTypes.number.isRequired,
  maxNumberOfAnnotations: PropTypes.number.isRequired,
  pointerDiameter: PropTypes.number,
  setTldrawIsMounting: PropTypes.func.isRequired,
  presentationId: PropTypes.string,
  setTldrawAPI: PropTypes.func.isRequired,
  isMultiUserActive: PropTypes.bool,
  whiteboardToolbarAutoHide: PropTypes.bool,
  toggleToolsAnimations: PropTypes.func.isRequired,
  animations: PropTypes.bool,
  isToolbarVisible: PropTypes.bool,
  isModerator: PropTypes.bool,
  currentPresentationPage: PropTypes.shape(),
  hasWBAccess: PropTypes.bool,
  bgShape: PropTypes.arrayOf(PropTypes.shape).isRequired,
  publishCursorUpdate: PropTypes.func.isRequired,
  skipToSlide: PropTypes.func.isRequired,
  locale: PropTypes.string.isRequired,
  isInfiniteWhiteboard: PropTypes.bool,
};
