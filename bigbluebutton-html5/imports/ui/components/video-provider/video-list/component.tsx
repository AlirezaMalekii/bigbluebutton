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
  buildSkyroomFixedGridStyle,
  SKYROOM_SIDEBAR_WEBCAM_H,
  SKYROOM_STAGE_WEBCAM_GUTTER,
  SKYROOM_WEBCAM_TILE_W,
  SKYROOM_WEBCAM_TILE_H,
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
    filledArea: (cellWidth * cellHeight) * numItems,
  };
};

const ASPECT_RATIO = 4 / 3;
// const ACTION_NAME_BACKGROUND = 'blurBackground';

interface VideoListProps {
  pluginUserCameraHelperPerPosition: UserCameraHelperAreas;
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
  onVideoItemUnmount: (stream: string) => void;
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
    this.autoplayWasHandled = false;
  }

  componentDidMount() {
    this.handleCanvasResize();
    window.addEventListener('resize', this.handleCanvasResize, false);
    window.addEventListener('videoPlayFailed', this.handlePlayElementFailed);
    this.unsubscribeSkyroomZones = subscribeSkyroomWebcamZones(() => {
      this.setState(
        (prev) => ({ skyroomZoneRevision: prev.skyroomZoneRevision + 1 }),
        () => this.handleCanvasResize(),
      );
    });
  }

  componentDidUpdate(prevProps: VideoListProps) {
    const {
      layoutType, cameraDock, streams, focusedId,
    } = this.props;
    const { width: cameraDockWidth, height: cameraDockHeight } = cameraDock;
    const {
      layoutType: prevLayoutType,
      cameraDock: prevCameraDock,
      streams: prevStreams,
      focusedId: prevFocusedId,
    } = prevProps;
    const { width: prevCameraDockWidth, height: prevCameraDockHeight } = prevCameraDock;

    const privilegeKey = (list: VideoItem[]) => list
      .map((s) => {
        const id = s.type !== VIDEO_TYPES.GRID ? s.stream : s.userId;
        return `${id ?? ''}:${getSkyroomStreamPrivilegeKey(s)}`;
      })
      .join('|');

    if (layoutType !== prevLayoutType
      || focusedId !== prevFocusedId
      || cameraDockWidth !== prevCameraDockWidth
      || cameraDockHeight !== prevCameraDockHeight
      || streams.length !== prevStreams.length
      || privilegeKey(streams) !== privilegeKey(prevStreams)) {
      this.handleCanvasResize();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleCanvasResize, false);
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
    this.unsubscribeSkyroomZones?.();
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
        const betterThanCurrent = testGrid.filledArea > currentGrid.filledArea;
        return focusedConstraint && betterThanCurrent ? testGrid : currentGrid;
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
        const stageBoundsWidth = skyroomLayout.stage?.width ?? cameraDock?.width;
        const stageBoundsHeight = skyroomLayout.stage?.height
          ?? cameraDock?.height
          ?? SKYROOM_SIDEBAR_WEBCAM_H;
        const computedStageGrid = computeSkyroomStripGrid(
          visibleStage.length,
          stageBoundsWidth,
          stageBoundsHeight,
          gridGutter,
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
        const computedCenterGrid = VideoList.computeOptimalGrid(
          visibleCenter,
          centerBounds.width,
          centerBounds.height,
          centerGutter,
          focusedId,
        );
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
      handleVideoFocus,
      setUserCamerasRequestedFromPlugin,
      focusedId,
      pluginUserCameraHelperPerPosition,
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
        >
          <VideoListItemContainer
            pluginUserCameraHelperPerPosition={pluginUserCameraHelperPerPosition}
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
        style={{
          position: 'fixed',
          top: centerBounds.top,
          left: centerBounds.left ?? undefined,
          right: centerBounds.right ?? undefined,
          width: centerBounds.width,
          height: centerBounds.height,
          zIndex: centerBounds.zIndex ?? 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          margin: 0,
        }}
      >
        <Styled.VideoList
          ref={(ref) => {
            this.centerGrid = ref;
          }}
          className="video-provider_list skyroom-center-webcam-list"
          style={{
            width: '100%',
            height: '100%',
            gridTemplateColumns: `repeat(${centerGrid.columns}, 1fr)`,
            gridTemplateRows: `repeat(${centerGrid.rows}, 1fr)`,
          }}
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
    // 2 cams fill the dock; 3+ use fixed row tracks so extra rows scroll inside the dock.
    const mobilePairFill = fillMobileDock && visibleCount === 2 && Boolean(optimalGrid.cellHeight);
    const mobileScrollGrid = fillMobileDock
      && visibleCount > 2
      && Boolean(optimalGrid.cellHeight);

    let listWidth = `${optimalGrid.width}px`;
    let listHeight = `${optimalGrid.height}px`;
    let listGridRows = `repeat(${optimalGrid.rows}, 1fr)`;
    if (mobileScrollGrid) {
      listWidth = '100%';
      listHeight = `${optimalGrid.height}px`;
      listGridRows = `repeat(${optimalGrid.rows}, ${optimalGrid.cellHeight}px)`;
    } else if (mobilePairFill) {
      listWidth = '100%';
      listHeight = '100%';
      listGridRows = `${optimalGrid.cellHeight}px`;
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
              gridTemplateColumns: `repeat(${optimalGrid.columns}, 1fr)`,
              gridTemplateRows: listGridRows,
            }}
            className="video-provider_list"
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
