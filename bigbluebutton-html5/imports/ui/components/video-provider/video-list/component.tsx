import React, { Component } from 'react';
import { createPortal } from 'react-dom';
import { IntlShape, defineMessages, injectIntl } from 'react-intl';
import { UpdatedDataForUserCameraDomElement } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/user-camera/types';
import { throttle } from '/imports/utils/throttle';
import { range } from '/imports/utils/array-utils';
import Styled from './styles';
import VideoListItemContainer from './video-list-item/container';
import OverflowTile from './overflow-tile/component';
import AutoplayOverlay from '/imports/ui/components/media/autoplay-overlay/component';
import logger from '/imports/startup/client/logger';
import playAndRetry from '/imports/utils/mediaElementPlayRetry';
import VideoService from '/imports/ui/components/video-provider/service';
import { ACTIONS } from '/imports/ui/components/layout/enums';
import { Output } from '/imports/ui/components/layout/layoutTypes';
import { VideoItem } from '/imports/ui/components/video-provider/types';
import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';
import { VideoPlaybackState } from '/imports/ui/components/video-provider/video-playback-utils';
import { computeMobileScrollableWebcamGrid } from '/imports/ui/components/video-provider/mobile-webcam-grid-utils';
import { UserCameraHelperAreas } from '../../plugins-engine/extensible-areas/components/user-camera-helper/types';
import {
  getSkyroomWebcamLayout,
  isSkyroomWebcamLayoutActive,
} from '/imports/ui/components/skyroom-layout/webcam-bounds-store';
import {
  getSkyroomStreamKey,
  getSkyroomStreamPrivilegeKey,
  partitionSkyroomStreams,
  computeSkyroomStripGrid,
  computeSkyroomSidebarGrid,
  expandSkyroomScrollableGrid,
  buildSkyroomFixedGridStyle,
  SKYROOM_SIDEBAR_WEBCAM_H,
  SKYROOM_STAGE_WEBCAM_GUTTER,
  SKYROOM_WEBCAM_TILE_W,
  SKYROOM_WEBCAM_TILE_H,
  SKYROOM_HIGH_CAMERA_LOAD_THRESHOLD,
  SKYROOM_DENSE_WEBCAM_THRESHOLD,
  SKYROOM_DESKTOP_VISIBLE_WEBCAM_BUDGET,
} from '/imports/ui/components/skyroom-layout/camera-placement';
import SkyroomWebcamDragLayer from '/imports/ui/components/skyroom-layout/webcam-zone-drag/SkyroomWebcamDragLayer';
import SkyroomWebcamDropZones from '/imports/ui/components/skyroom-layout/webcam-zone-drag/SkyroomWebcamDropZones';
import SkyroomWebcamZoneDrag from '/imports/ui/components/skyroom-layout/webcam-zone-drag/SkyroomWebcamZoneDrag';
import {
  getSkyroomWebcamDragPreview,
  subscribeSkyroomWebcamZones,
  SKYROOM_WEBCAM_ZONES,
} from '/imports/ui/components/skyroom-layout/webcam-zone-store';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  isSkyroomTheme,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

const intlMessages = defineMessages({
  autoplayBlockedDesc: {
    id: 'app.videoDock.autoplayBlockedDesc',
  },
  autoplayAllowLabel: {
    id: 'app.videoDock.autoplayAllowLabel',
  },
  nextPageLabel: {
    id: 'app.video.pagination.nextPage',
  },
  prevPageLabel: {
    id: 'app.video.pagination.prevPage',
  },
});

declare global {
  interface WindowEventMap {
    'videoPlayFailed': CustomEvent<{ mediaElement: HTMLVideoElement }>;
  }
}

const findOptimalGrid = (
  canvasWidth: number,
  canvasHeight: number,
  gutter: number,
  aspectRatio: number,
  numItems: number,
  columns = 1,
) => {
  const rows = Math.ceil(numItems / columns);
  const gutterTotalWidth = (columns - 1) * gutter;
  const gutterTotalHeight = (rows - 1) * gutter;
  const usableWidth = canvasWidth - gutterTotalWidth;
  const usableHeight = canvasHeight - gutterTotalHeight;
  let cellWidth = Math.floor(usableWidth / columns);
  let cellHeight = Math.ceil(cellWidth / aspectRatio);
  if ((cellHeight * rows) > usableHeight) {
    cellHeight = Math.floor(usableHeight / rows);
    cellWidth = Math.ceil(cellHeight * aspectRatio);
  }
  return {
    columns,
    rows,
    width: (cellWidth * columns) + gutterTotalWidth,
    height: (cellHeight * rows) + gutterTotalHeight,
    cellWidth,
    cellHeight,
    filledArea: (cellWidth * cellHeight) * numItems,
  };
};

const ASPECT_RATIO = 4 / 3;
// const ACTION_NAME_BACKGROUND = 'blurBackground';

const getSkyroomViewportLayoutKey = () => {
  const layout = getSkyroomWebcamLayout();
  if (!layout) return 'none';

  const boundsKey = (bounds: {
    top?: number;
    left?: number;
    right?: number;
    width?: number;
    height?: number;
  } | null | undefined) => (
    bounds
      ? [bounds.top, bounds.left, bounds.right, bounds.width, bounds.height].join(':')
      : '-'
  );

  return [
    layout.stageMediaOpen ? 1 : 0,
    layout.centerDropEnabled ? 1 : 0,
    layout.sidebarStackVisible === false ? 0 : 1,
    boundsKey(layout.sidebar),
    boundsKey(layout.stage),
    boundsKey(layout.center),
  ].join('|');
};

interface VideoListProps {
  pluginUserCameraHelperPerPosition: UserCameraHelperAreas;
  userCameraDomElementIds: string[];
  webcamsVisible: boolean;
  layoutType: string;
  layoutContextDispatch: (...args: unknown[]) => void;
  numberOfPages: number;
  currentVideoPageIndex: number;
  cameraDock: Output['cameraDock'];
  focusedId: string;
  handleVideoFocus: (id: string) => void;
  isGridEnabled: boolean;
  overflowCount: number;
  streams: VideoItem[];
  intl: IntlShape;
  setUserCamerasRequestedFromPlugin: React.Dispatch<React.SetStateAction<UpdatedDataForUserCameraDomElement[]>>;
  onVideoItemMount: (stream: string, video: HTMLVideoElement) => void;
  onVideoItemUnmount: (stream: string, video: HTMLVideoElement) => void;
  onVideoPlaybackStateChange: (stream: string, state: VideoPlaybackState) => void;
  onVideoVisibilityChange?: (changes: { stream: string; visible: boolean }[]) => void;
  onVirtualBgDrop: (stream: string, type: string, name: string, data: string) => Promise<unknown>;
}

interface VideoListState {
  optimalGrid: {
    rows: number,
    filledArea: number,
    width: number;
    height: number;
    columns: number;
    cellWidth?: number;
    cellHeight?: number;
  },
  sidebarGrid: {
    rows: number,
    filledArea: number,
    width: number;
    height: number;
    columns: number;
    cellWidth?: number;
    cellHeight?: number;
  },
  centerGrid: {
    rows: number,
    filledArea: number,
    width: number;
    height: number;
    columns: number;
    cellWidth?: number;
    cellHeight?: number;
  },
  autoplayBlocked: boolean,
  skyroomZoneRevision: number,
}

class VideoList extends Component<VideoListProps, VideoListState> {
  private ticking: boolean;

  private grid: HTMLDivElement | null;

  private canvas: HTMLDivElement | null;

  private sidebarGrid: HTMLDivElement | null;

  private centerGrid: HTMLDivElement | null;

  private stageGrid: HTMLDivElement | null;

  private viewportObservers: Map<Element | null, IntersectionObserver>;

  private viewportTargetObservers: Map<Element, IntersectionObserver>;

  private viewportTargets: Map<Element, string>;

  private visibleViewportTargets: Set<Element>;

  private reportedStreamVisibility: Map<string, boolean>;

  private pendingViewportStreams: Set<string>;

  private viewportReportFrame: number | null;

  private viewportSyncFrame: number | null;

  private skyroomViewportLayoutKey: string;

  private unsubscribeSkyroomZones: (() => void) | null;

  private failedMediaElements: unknown[];

  private autoplayWasHandled: boolean;

  constructor(props: VideoListProps) {
    super(props);

    this.state = {
      optimalGrid: {
        rows: 1,
        filledArea: 0,
        columns: 1,
        height: SKYROOM_WEBCAM_TILE_H,
        width: SKYROOM_WEBCAM_TILE_W,
        cellWidth: SKYROOM_WEBCAM_TILE_W,
        cellHeight: SKYROOM_WEBCAM_TILE_H,
      },
      sidebarGrid: {
        rows: 1,
        filledArea: 0,
        columns: 1,
        height: SKYROOM_WEBCAM_TILE_H,
        width: SKYROOM_WEBCAM_TILE_W,
        cellWidth: SKYROOM_WEBCAM_TILE_W,
        cellHeight: SKYROOM_WEBCAM_TILE_H,
      },
      centerGrid: {
        rows: 1,
        filledArea: 0,
        columns: 0,
        height: 0,
        width: 0,
      },
      autoplayBlocked: false,
      skyroomZoneRevision: 0,
    };

    this.ticking = false;
    this.grid = null;
    this.canvas = null;
    this.sidebarGrid = null;
    this.centerGrid = null;
    this.stageGrid = null;
    this.viewportObservers = new Map();
    this.viewportTargetObservers = new Map();
    this.viewportTargets = new Map();
    this.visibleViewportTargets = new Set();
    this.reportedStreamVisibility = new Map();
    this.pendingViewportStreams = new Set();
    this.viewportReportFrame = null;
    this.viewportSyncFrame = null;
    this.skyroomViewportLayoutKey = getSkyroomViewportLayoutKey();
    this.unsubscribeSkyroomZones = null;
    this.failedMediaElements = [];
    this.handleCanvasResize = throttle(this.handleCanvasResize.bind(this), 66,
      {
        leading: true,
        trailing: true,
      });
    this.setOptimalGrid = this.setOptimalGrid.bind(this);
    this.handleAllowAutoplay = this.handleAllowAutoplay.bind(this);
    this.handlePlayElementFailed = this.handlePlayElementFailed.bind(this);
    this.handleViewportIntersections = this.handleViewportIntersections.bind(this);
    this.syncViewportTargets = this.syncViewportTargets.bind(this);
    this.scheduleViewportTargetSync = this.scheduleViewportTargetSync.bind(this);
    this.handlePageLifecycleChange = this.handlePageLifecycleChange.bind(this);
    this.autoplayWasHandled = false;
  }

  componentDidMount() {
    this.handleCanvasResize();
    window.addEventListener('resize', this.handleCanvasResize, false);
    window.addEventListener('videoPlayFailed', this.handlePlayElementFailed);
    document.addEventListener('visibilitychange', this.handlePageLifecycleChange);
    window.addEventListener('focus', this.handlePageLifecycleChange);
    window.addEventListener('pageshow', this.handlePageLifecycleChange);
    this.unsubscribeSkyroomZones = subscribeSkyroomWebcamZones(() => {
      this.setState(
        (prev) => ({ skyroomZoneRevision: prev.skyroomZoneRevision + 1 }),
        () => this.handleCanvasResize(),
      );
    });
    this.skyroomViewportLayoutKey = getSkyroomViewportLayoutKey();
    this.scheduleViewportTargetSync();
  }

  componentDidUpdate(prevProps: VideoListProps, prevState: VideoListState) {
    const {
      layoutType, cameraDock, streams, focusedId, onVideoVisibilityChange, webcamsVisible,
    } = this.props;
    const { skyroomZoneRevision } = this.state;
    const { width: cameraDockWidth, height: cameraDockHeight } = cameraDock;
    const {
      layoutType: prevLayoutType,
      cameraDock: prevCameraDock,
      streams: prevStreams,
      focusedId: prevFocusedId,
      webcamsVisible: prevWebcamsVisible,
    } = prevProps;
    const { width: prevCameraDockWidth, height: prevCameraDockHeight } = prevCameraDock;

    const layoutKey = (list: VideoItem[]) => list
      .map((s) => {
        const id = getSkyroomStreamKey(s);
        const render = s.type === VIDEO_TYPES.GRID || !('render' in s) || s.render !== false;
        return `${id}:${s.type}:${render ? 1 : 0}:${getSkyroomStreamPrivilegeKey(s)}`;
      })
      .join('|');
    const nextLayoutKey = layoutKey(streams);
    const previousLayoutKey = layoutKey(prevStreams);
    const nextSkyroomViewportLayoutKey = getSkyroomViewportLayoutKey();
    const skyroomViewportLayoutChanged = nextSkyroomViewportLayoutKey
      !== this.skyroomViewportLayoutKey;
    this.skyroomViewportLayoutKey = nextSkyroomViewportLayoutKey;

    if (layoutType !== prevLayoutType
      || focusedId !== prevFocusedId
      || cameraDockWidth !== prevCameraDockWidth
      || cameraDockHeight !== prevCameraDockHeight
      || streams.length !== prevStreams.length
      || nextLayoutKey !== previousLayoutKey
      || skyroomViewportLayoutChanged) {
      this.handleCanvasResize();
    }

    if (layoutType !== prevLayoutType
      || nextLayoutKey !== previousLayoutKey
      || skyroomZoneRevision !== prevState.skyroomZoneRevision
      || webcamsVisible !== prevWebcamsVisible
      || onVideoVisibilityChange !== prevProps.onVideoVisibilityChange
      || skyroomViewportLayoutChanged) {
      this.scheduleViewportTargetSync();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleCanvasResize, false);
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
    document.removeEventListener('visibilitychange', this.handlePageLifecycleChange);
    window.removeEventListener('focus', this.handlePageLifecycleChange);
    window.removeEventListener('pageshow', this.handlePageLifecycleChange);
    this.unsubscribeSkyroomZones?.();
    this.viewportObservers.forEach((observer) => observer.disconnect());
    this.viewportObservers.clear();
    this.viewportTargetObservers.clear();
    this.viewportTargets.clear();
    this.visibleViewportTargets.clear();
    this.reportedStreamVisibility.clear();
    this.pendingViewportStreams.clear();
    if (this.viewportReportFrame !== null) cancelAnimationFrame(this.viewportReportFrame);
    this.viewportReportFrame = null;
    if (this.viewportSyncFrame !== null) cancelAnimationFrame(this.viewportSyncFrame);
    this.viewportSyncFrame = null;
  }

  scheduleViewportTargetSync() {
    if (this.viewportSyncFrame !== null) return;
    this.viewportSyncFrame = requestAnimationFrame(() => {
      this.viewportSyncFrame = null;
      this.syncViewportTargets();
    });
  }

  handlePageLifecycleChange() {
    // A hidden browser tab must keep its last visibility snapshot. Chromium can
    // emit all-false IntersectionObserver entries while backgrounded; applying
    // them disconnects every subscriber with no guaranteed entry on return.
    if (document.visibilityState === 'hidden') return;
    this.scheduleViewportTargetSync();
  }

  static getViewportObserverRoot(target: Element) {
    return target.closest([
      '#skyroom-stage-webcam-dock',
      '#skyroom-sidebar-webcam-dock',
      '#skyroom-center-webcam-dock',
      '#cameraDock',
    ].join(', '));
  }

  getViewportObserver(root: Element | null) {
    const existing = this.viewportObservers.get(root);
    if (existing) return existing;

    const {
      overscanPixels = 24,
    } = window.meetingClientSettings.public.kurento.viewportSubscription || {};
    const safeOverscan = Math.max(0, Number(overscanPixels) || 0);
    const observer = new IntersectionObserver(this.handleViewportIntersections, {
      root,
      rootMargin: `${safeOverscan}px`,
      threshold: 0.01,
    });
    this.viewportObservers.set(root, observer);
    return observer;
  }

  isViewportTargetVisible(target: Element) {
    const { webcamsVisible } = this.props;
    if (!webcamsVisible) return false;

    const element = target as HTMLElement;
    const styles = window.getComputedStyle(element);
    if (element.offsetParent === null
      || styles.visibility === 'hidden'
      || styles.display === 'none') return false;

    const {
      overscanPixels = 24,
    } = window.meetingClientSettings.public.kurento.viewportSubscription || {};
    const overscan = Math.max(0, Number(overscanPixels) || 0);
    const targetRect = element.getBoundingClientRect();
    const root = VideoList.getViewportObserverRoot(target);
    const rootRect = root?.getBoundingClientRect() || {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0,
    };

    return targetRect.width > 0
      && targetRect.height > 0
      && targetRect.bottom >= rootRect.top - overscan
      && targetRect.top <= rootRect.bottom + overscan
      && targetRect.right >= rootRect.left - overscan
      && targetRect.left <= rootRect.right + overscan;
  }

  reportViewportVisibility(streams: Set<string>) {
    const { onVideoVisibilityChange } = this.props;
    const changes: { stream: string; visible: boolean }[] = [];
    const streamsWithTargets = new Set<string>();
    const visibleStreams = new Set<string>();

    this.viewportTargets.forEach((stream, target) => {
      streamsWithTargets.add(stream);
      if (this.visibleViewportTargets.has(target)) visibleStreams.add(stream);
    });

    streams.forEach((stream) => {
      const hasTarget = streamsWithTargets.has(stream);
      const visible = hasTarget && visibleStreams.has(stream);
      if (this.reportedStreamVisibility.get(stream) === visible) return;
      if (hasTarget) {
        this.reportedStreamVisibility.set(stream, visible);
      } else {
        this.reportedStreamVisibility.delete(stream);
      }
      changes.push({ stream, visible });
    });

    if (changes.length > 0) onVideoVisibilityChange?.(changes);
  }

  queueViewportVisibilityReport(streams: Set<string>) {
    streams.forEach((stream) => this.pendingViewportStreams.add(stream));
    if (this.viewportReportFrame !== null || this.pendingViewportStreams.size === 0) return;

    this.viewportReportFrame = requestAnimationFrame(() => {
      this.viewportReportFrame = null;
      const pending = new Set(this.pendingViewportStreams);
      this.pendingViewportStreams.clear();
      this.reportViewportVisibility(pending);
    });
  }

  handleViewportIntersections(entries: IntersectionObserverEntry[]) {
    if (document.visibilityState === 'hidden') return;
    const affectedStreams = new Set<string>();

    entries.forEach((entry) => {
      const stream = this.viewportTargets.get(entry.target);
      if (!stream) return;

      const visible = entry.isIntersecting
        && entry.intersectionRatio > 0
        && this.isViewportTargetVisible(entry.target);

      if (visible) {
        this.visibleViewportTargets.add(entry.target);
      } else {
        this.visibleViewportTargets.delete(entry.target);
      }
      VideoList.setViewportTargetPlayback(entry.target, visible);
      affectedStreams.add(stream);
    });

    this.queueViewportVisibilityReport(affectedStreams);
  }

  syncViewportTargets() {
    const { onVideoVisibilityChange } = this.props;
    if (!isSkyroomTheme() || !onVideoVisibilityChange) return;
    if (document.visibilityState === 'hidden') return;

    const {
      enabled = true,
    } = window.meetingClientSettings.public.kurento.viewportSubscription || {};
    if (!enabled) return;

    const nextTargets = new Set(Array.from(document.querySelectorAll(
      '[data-skyroom-viewport-stream]',
    )));
    const removedStreams = new Set<string>();

    this.viewportTargets.forEach((stream, target) => {
      if (nextTargets.has(target)) return;
      this.viewportTargetObservers.get(target)?.unobserve(target);
      this.viewportTargetObservers.delete(target);
      VideoList.setViewportTargetPlayback(target, false);
      this.viewportTargets.delete(target);
      this.visibleViewportTargets.delete(target);
      removedStreams.add(stream);
    });

    if (typeof IntersectionObserver !== 'function') {
      const fallbackChanges: { stream: string; visible: boolean }[] = [];
      const currentStreams = new Set<string>();
      nextTargets.forEach((target) => {
        const stream = target.getAttribute('data-skyroom-viewport-stream');
        if (stream) currentStreams.add(stream);
        const visible = Boolean(stream) && this.isViewportTargetVisible(target);
        VideoList.setViewportTargetPlayback(target, visible);
        if (!stream || this.reportedStreamVisibility.get(stream) === visible) return;
        this.reportedStreamVisibility.set(stream, visible);
        fallbackChanges.push({ stream, visible });
      });
      this.reportedStreamVisibility.forEach((visible, stream) => {
        if (!visible || currentStreams.has(stream)) return;
        this.reportedStreamVisibility.set(stream, false);
        fallbackChanges.push({ stream, visible: false });
      });
      if (fallbackChanges.length > 0) onVideoVisibilityChange(fallbackChanges);
      return;
    }

    nextTargets.forEach((target) => {
      const stream = target.getAttribute('data-skyroom-viewport-stream');
      if (!stream) return;
      const observer = this.getViewportObserver(VideoList.getViewportObserverRoot(target));
      const previousStream = this.viewportTargets.get(target);
      const previousObserver = this.viewportTargetObservers.get(target);

      if (previousStream === stream && previousObserver === observer) return;
      if (previousObserver) previousObserver.unobserve(target);
      if (previousStream && previousStream !== stream) {
        this.visibleViewportTargets.delete(target);
        removedStreams.add(previousStream);
      }
      this.viewportTargets.set(target, stream);
      this.viewportTargetObservers.set(target, observer);
      observer.observe(target);
    });

    const activeObservers = new Set(this.viewportTargetObservers.values());
    this.viewportObservers.forEach((observer, root) => {
      if (activeObservers.has(observer)) return;
      observer.disconnect();
      this.viewportObservers.delete(root);
    });

    // IntersectionObserver does not guarantee a new entry when only an
    // ancestor's CSS visibility changes (mobile tab/zone switches). Refresh
    // the current geometry on those bounded layout updates so hidden docks do
    // not keep decoding every retained camera.
    const layoutAffectedStreams = new Set(removedStreams);
    nextTargets.forEach((target) => {
      const stream = this.viewportTargets.get(target);
      if (!stream) return;
      if (this.isViewportTargetVisible(target)) {
        this.visibleViewportTargets.add(target);
        VideoList.setViewportTargetPlayback(target, true);
      } else {
        this.visibleViewportTargets.delete(target);
        VideoList.setViewportTargetPlayback(target, false);
      }
      layoutAffectedStreams.add(stream);
    });

    this.queueViewportVisibilityReport(layoutAffectedStreams);
  }

  static setViewportTargetPlayback(target: Element, shouldPlay: boolean) {
    const videoElement = target.querySelector('video');
    if (!(videoElement instanceof HTMLVideoElement)) return;

    if (!shouldPlay) {
      if (!videoElement.paused) videoElement.pause();
      return;
    }

    if (!videoElement.srcObject || !videoElement.paused) return;
    videoElement.play().catch((error) => {
      if (error.name === 'NotAllowedError') {
        const tagFailedEvent = new CustomEvent('videoPlayFailed', {
          detail: { mediaElement: videoElement },
        });
        window.dispatchEvent(tagFailedEvent);
      }
    });
  }

  getSkyroomPartition() {
    const { streams } = this.props;
    const skyroomLayout = getSkyroomWebcamLayout();
    return partitionSkyroomStreams(streams, {
      centerDropEnabled: skyroomLayout?.centerDropEnabled,
      stageMediaOpen: skyroomLayout?.stageMediaOpen,
      sidebarStackVisible: skyroomLayout?.sidebarStackVisible ?? true,
    });
  }

  handleAllowAutoplay() {
    const { autoplayBlocked } = this.state;

    logger.info({
      logCode: 'video_provider_autoplay_allowed',
    }, 'Video media autoplay allowed by the user');

    this.autoplayWasHandled = true;
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
    while (this.failedMediaElements.length) {
      const mediaElement = this.failedMediaElements.shift();
      if (mediaElement) {
        const played = playAndRetry(mediaElement);
        if (!played) {
          logger.error({
            logCode: 'video_provider_autoplay_handling_failed',
          }, 'Video autoplay handling failed to play media');
        } else {
          logger.info({
            logCode: 'video_provider_media_play_success',
          }, 'Video media played successfully');
        }
      }
    }
    if (autoplayBlocked) { this.setState({ autoplayBlocked: false }); }
  }

  handlePlayElementFailed(e: CustomEvent<{ mediaElement: HTMLVideoElement }>) {
    const { mediaElement } = e.detail;
    const { autoplayBlocked } = this.state;

    e.stopPropagation();
    this.failedMediaElements.push(mediaElement);
    if (!autoplayBlocked && !this.autoplayWasHandled) {
      logger.info({
        logCode: 'video_provider_autoplay_prompt',
      }, 'Prompting user for action to play video media');
      this.setState({ autoplayBlocked: true });
    }
  }

  handleCanvasResize() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.ticking = false;
        this.setOptimalGrid();
      });
    }
    this.ticking = true;
  }

  static computeOptimalGrid(
    visibleStreams: VideoItem[],
    canvasWidth: number,
    canvasHeight: number,
    gridGutter: number,
    focusedId: string,
    maxGridSlots = Number.POSITIVE_INFINITY,
  ) {
    let numItems = visibleStreams.length;
    if (numItems < 1) {
      return null;
    }

    const hasFocusedItem = visibleStreams.filter(
      (s) => s.type !== VIDEO_TYPES.GRID && s.stream === focusedId,
    ).length && numItems > 2;

    if (hasFocusedItem) {
      numItems += 3;
    }

    return range(1, numItems + 1)
      .reduce((currentGrid, col) => {
        const testGrid = findOptimalGrid(
          canvasWidth, canvasHeight, gridGutter,
          ASPECT_RATIO, numItems, col,
        );
        const focusedConstraint = hasFocusedItem ? testGrid.rows > 1 && testGrid.columns > 1 : true;
        const withinSlotBudget = (testGrid.rows * testGrid.columns) <= maxGridSlots;
        const betterThanCurrent = testGrid.filledArea > currentGrid.filledArea;
        return focusedConstraint && withinSlotBudget && betterThanCurrent ? testGrid : currentGrid;
      }, { filledArea: 0 } as {
        columns: number;
        rows: number;
        width: number;
        height: number;
        filledArea: number;
      });
  }

  setOptimalGrid() {
    const {
      streams,
      cameraDock,
      layoutContextDispatch,
      focusedId,
    } = this.props;
    const skyroomLayout = getSkyroomWebcamLayout();

    if (isSkyroomWebcamLayoutActive()) {
      const { sidebar, stage, center } = this.getSkyroomPartition();
      const dockStreams = stage;
      const visibleCameraCount = streams.filter(
        (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
      ).length;
      const useDenseDesktopGrid = !isSkyroomMobileViewport()
        && visibleCameraCount >= SKYROOM_DENSE_WEBCAM_THRESHOLD;
      const mainViewportBudget = Math.max(
        4,
        SKYROOM_DESKTOP_VISIBLE_WEBCAM_BUDGET - (sidebar.length > 0 ? 2 : 0),
      );
      const sidebarBounds = skyroomLayout.sidebar;
      const centerBounds = skyroomLayout.center;
      let { sidebarGrid, centerGrid } = this.state;

      if (sidebar.length > 0 && sidebarBounds && this.sidebarGrid) {
        const sidebarGutter = parseInt(window.getComputedStyle(this.sidebarGrid)
          .getPropertyValue('grid-row-gap'), 10) || 2;
        const computedSidebarGrid = computeSkyroomSidebarGrid(
          sidebar.length,
          sidebarBounds.width,
          sidebarBounds.height,
          sidebarGutter,
        );
        if (computedSidebarGrid) {
          sidebarGrid = computedSidebarGrid;
        }
      }

      let { optimalGrid } = this.state;
      const visibleStage = dockStreams.filter(
        (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
      );

      const stageGridEl = this.stageGrid ?? this.grid;
      if (visibleStage.length > 0 && stageGridEl) {
        const gridGutter = parseInt(window.getComputedStyle(stageGridEl)
          .getPropertyValue('grid-row-gap'), 10) || SKYROOM_STAGE_WEBCAM_GUTTER;
        const stageBoundsWidth = skyroomLayout.stage?.width ?? cameraDock?.width ?? 0;
        const stageBoundsHeight = skyroomLayout.stage?.height
          ?? cameraDock?.height
          ?? SKYROOM_SIDEBAR_WEBCAM_H;
        const computedStageGrid = isSkyroomColumnLayout() && isSkyroomMobileViewport()
          ? computeMobileScrollableWebcamGrid(
            visibleStage.length,
            stageBoundsWidth,
            stageBoundsHeight,
            gridGutter,
          )
          : computeSkyroomStripGrid(
            visibleStage.length,
            stageBoundsWidth,
            stageBoundsHeight,
            gridGutter,
            useDenseDesktopGrid ? mainViewportBudget : Number.POSITIVE_INFINITY,
          );
        if (computedStageGrid) {
          optimalGrid = computedStageGrid;
        }
      }

      const visibleCenter = center.filter(
        (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
      );

      if (visibleCenter.length > 0 && centerBounds && this.centerGrid) {
        const centerGutter = parseInt(window.getComputedStyle(this.centerGrid)
          .getPropertyValue('grid-row-gap'), 10) || 2;
        const focusedStream = visibleCenter.find(
          (item) => item.type !== VIDEO_TYPES.GRID && item.stream === focusedId,
        );
        const focusExtraSlots = focusedStream && visibleCenter.length > 2 ? 3 : 0;
        const viewportStreamCount = useDenseDesktopGrid
          ? Math.max(1, mainViewportBudget - focusExtraSlots)
          : visibleCenter.length;
        const viewportStreams = visibleCenter.slice(0, viewportStreamCount);
        if (focusedStream && !viewportStreams.includes(focusedStream)) {
          viewportStreams[Math.max(0, viewportStreams.length - 1)] = focusedStream;
        }
        const viewportGrid = VideoList.computeOptimalGrid(
          viewportStreams,
          centerBounds.width,
          centerBounds.height,
          centerGutter,
          focusedId,
          useDenseDesktopGrid ? mainViewportBudget : Number.POSITIVE_INFINITY,
        );
        const computedCenterGrid = useDenseDesktopGrid
          ? expandSkyroomScrollableGrid(
            viewportGrid,
            visibleCenter.length,
            centerGutter,
            focusExtraSlots,
          )
          : viewportGrid;
        if (computedCenterGrid) {
          centerGrid = computedCenterGrid;
        }
      }

      this.setState({ optimalGrid, sidebarGrid, centerGrid });
      return;
    }

    const visibleStreams = streams.filter(
      (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
    );

    if (visibleStreams.length < 1 || !this.canvas || !this.grid) {
      return;
    }

    const gridGutter = parseInt(window.getComputedStyle(this.grid)
      .getPropertyValue('grid-row-gap'), 10);
    let optimalGrid: VideoListState['optimalGrid'] | null = VideoList.computeOptimalGrid(
      visibleStreams,
      cameraDock?.width,
      cameraDock?.height,
      gridGutter,
      focusedId,
    );

    if (
      isSkyroomColumnLayout()
      && isSkyroomMobileViewport()
      && cameraDock?.width > 0
      && cameraDock?.height > 0
      && visibleStreams.length > 0
    ) {
      const gutter = Number.isFinite(gridGutter) ? gridGutter : 0;
      const count = visibleStreams.length;

      if (count === 1) {
        // One cam: fill the entire webcam box.
        optimalGrid = {
          columns: 1,
          rows: 1,
          width: cameraDock.width,
          height: cameraDock.height,
          filledArea: cameraDock.width * cameraDock.height,
        };
      } else if (count === 2) {
        // Two cams: side-by-side, each column fills the full dock height.
        // Match responsive.css gap/padding so tiles stay inside the box.
        const chrome = 4; // list padding 2px × 2
        const cellWidth = Math.max(
          1,
          Math.floor((cameraDock.width - chrome - gutter) / 2),
        );
        const cellHeight = Math.max(1, cameraDock.height - chrome);
        optimalGrid = {
          columns: 2,
          rows: 1,
          width: cameraDock.width,
          height: cameraDock.height,
          cellWidth,
          cellHeight,
          filledArea: cellWidth * cellHeight * 2,
        };
      } else {
        // 3+: 2-column grid sized so two rows fill the dock (2×2 viewport);
        // further rows overflow and the dock scrolls.
        const mobileColumns = 2;
        const rows = Math.ceil(count / mobileColumns);
        const chrome = 4; // list padding 2px × 2
        const cellWidth = Math.max(
          1,
          Math.floor((cameraDock.width - chrome - gutter) / mobileColumns),
        );
        const cellHeight = Math.max(
          1,
          Math.floor((cameraDock.height - chrome - gutter) / 2),
        );
        optimalGrid = {
          columns: mobileColumns,
          rows,
          width: cameraDock.width,
          height: (cellHeight * rows) + ((rows - 1) * gutter),
          cellWidth,
          cellHeight,
          filledArea: cellWidth * cellHeight * count,
        };
      }
    }

    if (!optimalGrid) return;

    layoutContextDispatch({
      type: ACTIONS.SET_CAMERA_DOCK_OPTIMAL_GRID_SIZE,
      value: {
        width: optimalGrid.width,
        height: optimalGrid.height,
      },
    });
    this.setState({
      optimalGrid,
    });
  }

  displayPageButtons() {
    const { numberOfPages, cameraDock } = this.props;
    const { width: cameraDockWidth } = cameraDock;

    if (!VideoService.isPaginationEnabled() || numberOfPages <= 1 || cameraDockWidth === 0) {
      return false;
    }

    return true;
  }

  renderNextPageButton() {
    const {
      intl,
      numberOfPages,
      currentVideoPageIndex,
      cameraDock,
    } = this.props;
    const { position } = cameraDock;

    if (!this.displayPageButtons()) return null;

    const currentPage = currentVideoPageIndex + 1;
    const nextPageLabel = intl.formatMessage(intlMessages.nextPageLabel);
    const nextPageDetailedLabel = `${nextPageLabel} (${currentPage}/${numberOfPages})`;

    return (
      <Styled.NextPageButton
        role="button"
        aria-label={nextPageLabel}
        color="primary"
        icon="right_arrow"
        size="md"
        onClick={VideoService.getNextVideoPage}
        label={nextPageDetailedLabel}
        hideLabel
        position={position}
        data-test="nextPageVideoPaginationBtn"
      />
    );
  }

  renderPreviousPageButton() {
    const {
      intl,
      currentVideoPageIndex,
      numberOfPages,
      cameraDock,
    } = this.props;
    const { position } = cameraDock;

    if (!this.displayPageButtons()) return null;

    const currentPage = currentVideoPageIndex + 1;
    const prevPageLabel = intl.formatMessage(intlMessages.prevPageLabel);
    const prevPageDetailedLabel = `${prevPageLabel} (${currentPage}/${numberOfPages})`;

    return (
      <Styled.PreviousPageButton
        role="button"
        aria-label={prevPageLabel}
        color="primary"
        icon="left_arrow"
        size="md"
        onClick={VideoService.getPreviousVideoPage}
        label={prevPageDetailedLabel}
        hideLabel
        position={position}
        data-test="previousPageVideoPaginationBtn"
      />
    );
  }

  renderVideoList(
    streamsToRender?: VideoItem[],
    enableSkyroomZoneDrag = false,
    sourceZone?: string,
  ) {
    const {
      streams,
      onVirtualBgDrop,
      onVideoItemMount,
      onVideoItemUnmount,
      onVideoPlaybackStateChange,
      handleVideoFocus,
      setUserCamerasRequestedFromPlugin,
      focusedId,
      pluginUserCameraHelperPerPosition,
      userCameraDomElementIds,
      isGridEnabled,
      overflowCount,
    } = this.props;
    const dragPreview = getSkyroomWebcamDragPreview();
    const listStreams = (streamsToRender ?? streams).filter((item) => {
      if (!dragPreview?.streamKey) return true;
      return getSkyroomStreamKey(item) !== dragPreview.streamKey;
    });
    const numOfStreams = listStreams.filter(
      (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
    ).length;

    const shouldShowOverflowTile = isGridEnabled && overflowCount > 0;

    let visibleStreams = listStreams;
    if (shouldShowOverflowTile) {
      const lastGridUserIndex = listStreams.map((s, idx) => ({ s, idx }))
        .reverse()
        .find(({ s }) => s.type === VIDEO_TYPES.GRID)?.idx;

      if (lastGridUserIndex !== undefined) {
        // remove the last grid user to replace it with the overflow tile
        visibleStreams = listStreams.filter((_, idx) => idx !== lastGridUserIndex);
      }
    }

    const videoItems = visibleStreams.map((item) => {
      const { userId, name } = item;
      const isStream = item.type !== VIDEO_TYPES.GRID;
      const stream = isStream ? item.stream : null;
      const key = isStream ? stream : userId;
      const isFocused = isStream && focusedId === stream && numOfStreams > 2;
      const shouldRender = item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false;

      if (!shouldRender) return null;

      const tile = (
        <Styled.VideoListItem
          $focused={isFocused}
          data-test="webcamVideoItem"
          data-skyroom-viewport-stream={isStream ? stream : undefined}
        >
          <VideoListItemContainer
            pluginUserCameraHelperPerPosition={pluginUserCameraHelperPerPosition}
            userCameraDomElementRequested={Boolean(stream && userCameraDomElementIds.includes(stream))}
            numOfStreams={numOfStreams}
            cameraId={stream}
            userId={userId}
            name={name}
            focused={isFocused}
            isStream={isStream}
            setUserCamerasRequestedFromPlugin={setUserCamerasRequestedFromPlugin}
            onHandleVideoFocus={isStream ? handleVideoFocus : null}
            onVideoItemMount={(videoRef) => {
              this.handleCanvasResize();
              if (isStream) onVideoItemMount(item.stream, videoRef);
            }}
            stream={item}
            onVideoItemUnmount={onVideoItemUnmount}
            onVideoPlaybackStateChange={(state) => {
              if (isStream) onVideoPlaybackStateChange(item.stream, state);
            }}
            onVirtualBgDrop={
              (type, name, data) => {
                return isStream ? onVirtualBgDrop(item.stream, type, name, data) : Promise.resolve(null);
              }
            }
          />
        </Styled.VideoListItem>
      );

      if (!enableSkyroomZoneDrag || !sourceZone) {
        return React.cloneElement(tile, { key });
      }

      return (
        <SkyroomWebcamZoneDrag
          key={key}
          streamKey={getSkyroomStreamKey(item)}
          sourceZone={sourceZone}
          enabled={enableSkyroomZoneDrag}
        >
          {tile}
        </SkyroomWebcamZoneDrag>
      );
    });

    if (shouldShowOverflowTile) {
      videoItems.push(
        <Styled.VideoListItem
          key="overflow-tile"
          $focused={false}
          data-test="overflowTile"
        >
          <OverflowTile overflowCount={overflowCount} />
        </Styled.VideoListItem>,
      );
    }

    return videoItems;
  }

  renderFloatingWebcamTile(streamKey: string) {
    const { streams } = this.props;
    const item = streams.find((stream) => getSkyroomStreamKey(stream) === streamKey);
    if (!item) return null;
    return this.renderVideoList([item], false)[0];
  }

  renderSkyroomLayout() {
    const {
      intl,
      cameraDock,
      isGridEnabled,
      streams,
    } = this.props;
    const {
      optimalGrid, sidebarGrid, centerGrid, autoplayBlocked,
    } = this.state;
    const skyroomLayout = getSkyroomWebcamLayout();
    const { sidebar, stage, center } = this.getSkyroomPartition();
    const dockStreams = stage;
    const sidebarBounds = skyroomLayout?.sidebar;
    const stageBounds = skyroomLayout?.stage;
    const centerBounds = skyroomLayout?.center;
    const { position } = cameraDock;
    const stageInPortal = dockStreams.length > 0 && Boolean(stageBounds);
    const visibleCameraCount = streams.filter(
      (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
    ).length;
    const webcamLoad = visibleCameraCount >= SKYROOM_HIGH_CAMERA_LOAD_THRESHOLD
      ? 'high'
      : 'normal';
    const useDenseDesktopGrid = !isSkyroomMobileViewport()
      && visibleCameraCount >= SKYROOM_DENSE_WEBCAM_THRESHOLD;
    const centerGridStyle = useDenseDesktopGrid
      ? buildSkyroomFixedGridStyle(centerGrid)
      : {
        width: '100%',
        height: '100%',
        gridTemplateColumns: `repeat(${centerGrid.columns}, 1fr)`,
        gridTemplateRows: `repeat(${centerGrid.rows}, 1fr)`,
      };

    const sidebarDockStyle: React.CSSProperties = sidebarBounds ? {
      position: 'fixed',
      top: sidebarBounds.top,
      left: sidebarBounds.left ?? undefined,
      right: sidebarBounds.right ?? undefined,
      width: sidebarBounds.width,
      height: sidebarBounds.height,
      zIndex: sidebarBounds.zIndex ?? 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      margin: 0,
      overflow: 'hidden',
    } : {};

    const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;

    const sidebarDock = sidebar.length > 0 && sidebarBounds ? (
      <div
        id="skyroom-sidebar-webcam-dock"
        data-test="skyroomSidebarWebcamDock"
        data-skyroom-webcam-load={webcamLoad}
        style={sidebarDockStyle}
      >
        <Styled.VideoList
          ref={(ref) => {
            this.sidebarGrid = ref;
          }}
          className="video-provider_list skyroom-sidebar-webcam-list"
          style={buildSkyroomFixedGridStyle(sidebarGrid) ?? undefined}
        >
          {this.renderVideoList(sidebar, true, SKYROOM_WEBCAM_ZONES.SIDEBAR)}
        </Styled.VideoList>
      </div>
    ) : null;

    const stageDockStyle: React.CSSProperties = stageBounds ? {
      position: 'fixed',
      top: stageBounds.top,
      left: stageBounds.left ?? undefined,
      right: stageBounds.right ?? undefined,
      width: stageBounds.width,
      height: stageBounds.height,
      zIndex: stageBounds.zIndex ?? 8,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      pointerEvents: 'auto',
      margin: 0,
      overflowX: 'hidden',
      overflowY: 'auto',
    } : {};

    const stageDock = stageInPortal ? (
      <div
        id="skyroom-stage-webcam-dock"
        data-test="skyroomStageWebcamDock"
        data-skyroom-webcam-load={webcamLoad}
        data-skyroom-webcam-density={useDenseDesktopGrid ? 'dense' : 'standard'}
        style={stageDockStyle}
      >
        <Styled.VideoList
          ref={(ref) => {
            this.stageGrid = ref;
          }}
          className="video-provider_list skyroom-stage-webcam-list"
          style={buildSkyroomFixedGridStyle(optimalGrid) ?? undefined}
        >
          {this.renderVideoList(dockStreams, true, SKYROOM_WEBCAM_ZONES.STAGE)}
        </Styled.VideoList>
      </div>
    ) : null;

    const centerDock = center.length > 0 && centerBounds ? (
      <div
        id="skyroom-center-webcam-dock"
        data-test="skyroomCenterWebcamDock"
        data-skyroom-webcam-load={webcamLoad}
        data-skyroom-webcam-density={useDenseDesktopGrid ? 'dense' : 'standard'}
        style={{
          position: 'fixed',
          top: centerBounds.top,
          left: centerBounds.left ?? undefined,
          right: centerBounds.right ?? undefined,
          width: centerBounds.width,
          height: centerBounds.height,
          zIndex: centerBounds.zIndex ?? 7,
          display: 'flex',
          alignItems: useDenseDesktopGrid ? 'flex-start' : 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          margin: 0,
          overflowX: 'hidden',
          overflowY: useDenseDesktopGrid ? 'auto' : 'hidden',
        }}
      >
        <Styled.VideoList
          ref={(ref) => {
            this.centerGrid = ref;
          }}
          className="video-provider_list skyroom-center-webcam-list"
          style={centerGridStyle ?? undefined}
        >
          {this.renderVideoList(center, true, SKYROOM_WEBCAM_ZONES.CENTER)}
        </Styled.VideoList>
      </div>
    ) : null;

    return (
      <>
        <SkyroomWebcamDropZones />
        <SkyroomWebcamDragLayer
          renderFloatingTile={(streamKey) => this.renderFloatingWebcamTile(streamKey)}
        />
        {layoutEl && sidebarDock
          ? createPortal(sidebarDock, layoutEl)
          : sidebarDock}
        {layoutEl && stageDock
          ? createPortal(stageDock, layoutEl)
          : stageDock}
        {layoutEl && centerDock
          ? createPortal(centerDock, layoutEl)
          : centerDock}
        <Styled.VideoCanvas
          $position={position}
          data-skyroom-webcam-load={webcamLoad}
          ref={(ref) => {
            this.canvas = ref;
          }}
          style={{
            minHeight: 'inherit',
            visibility: (!stageInPortal && dockStreams.length > 0) || isGridEnabled ? 'visible' : 'hidden',
          }}
        >
          {this.renderPreviousPageButton()}

          {!stageInPortal && dockStreams.length > 0 && !isGridEnabled ? (
            <Styled.VideoList
              ref={(ref) => {
                this.grid = ref;
              }}
              style={buildSkyroomFixedGridStyle(optimalGrid) ?? undefined}
              className="video-provider_list skyroom-stage-webcam-list"
            >
              {this.renderVideoList(dockStreams, true, SKYROOM_WEBCAM_ZONES.STAGE)}
            </Styled.VideoList>
          ) : null}
          {!autoplayBlocked ? null : (
            <AutoplayOverlay
              autoplayBlockedDesc={intl.formatMessage(intlMessages.autoplayBlockedDesc)}
              autoplayAllowLabel={intl.formatMessage(intlMessages.autoplayAllowLabel)}
              handleAllowAutoplay={this.handleAllowAutoplay}
            />
          )}

          {
            (position === 'contentRight' || position === 'contentLeft')
            && <Styled.Break />
          }

          {this.renderNextPageButton()}
        </Styled.VideoCanvas>
      </>
    );
  }

  render() {
    const {
      streams,
      intl,
      cameraDock,
      isGridEnabled,
    } = this.props;

    if (isSkyroomWebcamLayoutActive()) {
      return this.renderSkyroomLayout();
    }

    const { optimalGrid, autoplayBlocked } = this.state;
    const { position } = cameraDock;
    const fillMobileDock = isSkyroomColumnLayout() && isSkyroomMobileViewport();
    const visibleCount = streams.filter(
      (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
    ).length;
    // Prefer explicit cellHeight from mobile setOptimalGrid; fall back so a stale
    // grid without cell metrics still scrolls instead of fitting everything in-dock.
    const dockH = Math.max(1, cameraDock?.height || 0);
    const dockW = Math.max(1, cameraDock?.width || 0);
    const mobileColumns = 2;
    const mobileRows = Math.max(1, Math.ceil(visibleCount / mobileColumns));
    const mobileChrome = 4;
    const mobileGutter = 4;
    const fallbackCellHeight = Math.max(
      1,
      Math.floor((dockH - mobileChrome - mobileGutter) / 2),
    );
    const scrollCellHeight = optimalGrid.cellHeight || fallbackCellHeight;
    const scrollListHeight = (scrollCellHeight * mobileRows)
      + ((mobileRows - 1) * mobileGutter);
    // 2 cams fill the dock; 3+ use fixed row tracks so extra rows scroll inside the dock.
    const mobilePairFill = fillMobileDock && visibleCount === 2;
    const mobileScrollGrid = fillMobileDock && visibleCount > 2 && dockH > 0 && dockW > 0;

    let listWidth = `${optimalGrid.width}px`;
    let listHeight = `${optimalGrid.height}px`;
    let listGridRows = `repeat(${optimalGrid.rows}, 1fr)`;
    if (mobileScrollGrid) {
      listWidth = '100%';
      listHeight = `${scrollListHeight}px`;
      listGridRows = `repeat(${mobileRows}, ${scrollCellHeight}px)`;
    } else if (mobilePairFill) {
      listWidth = '100%';
      listHeight = '100%';
      listGridRows = `${optimalGrid.cellHeight || (dockH - mobileChrome)}px`;
    } else if (fillMobileDock) {
      listWidth = '100%';
      listHeight = '100%';
    }

    // Pair fills the dock; 3+ grows so the dock (not the canvas) scrolls.
    let canvasHeight;
    let canvasMaxHeight;
    if (mobileScrollGrid) {
      canvasHeight = 'max-content';
      canvasMaxHeight = 'none';
    } else if (fillMobileDock) {
      canvasHeight = '100%';
      canvasMaxHeight = '100%';
    }

    return (
      <Styled.VideoCanvas
        $position={position}
        ref={(ref) => {
          this.canvas = ref;
        }}
        style={{
          minHeight: fillMobileDock ? 0 : undefined,
          alignItems: fillMobileDock ? 'stretch' : undefined,
          justifyContent: fillMobileDock ? 'stretch' : undefined,
          height: canvasHeight,
          maxHeight: canvasMaxHeight,
        }}
      >
        {this.renderPreviousPageButton()}

        {!streams.length && !isGridEnabled ? null : (
          <Styled.VideoList
            ref={(ref) => {
              this.grid = ref;
            }}
            style={{
              width: listWidth,
              height: listHeight,
              gridTemplateColumns: mobileScrollGrid
                ? `repeat(${mobileColumns}, 1fr)`
                : `repeat(${optimalGrid.columns}, 1fr)`,
              gridTemplateRows: listGridRows,
            }}
            className="video-provider_list"
            data-skyroom-mobile-webcam-grid={mobileScrollGrid ? 'scroll' : undefined}
          >
            {this.renderVideoList()}
          </Styled.VideoList>
        )}
        {!autoplayBlocked ? null : (
          <AutoplayOverlay
            autoplayBlockedDesc={intl.formatMessage(intlMessages.autoplayBlockedDesc)}
            autoplayAllowLabel={intl.formatMessage(intlMessages.autoplayAllowLabel)}
            handleAllowAutoplay={this.handleAllowAutoplay}
          />
        )}

        {
          (position === 'contentRight' || position === 'contentLeft')
          && <Styled.Break />
        }

        {this.renderNextPageButton()}
      </Styled.VideoCanvas>
    );
  }
}

export default injectIntl(VideoList);
