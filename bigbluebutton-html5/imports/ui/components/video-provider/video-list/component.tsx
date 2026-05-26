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
import { getSkyroomWebcamLayout } from '/imports/ui/components/skyroom-layout/webcam-bounds-store';
import { partitionSkyroomStreams } from '/imports/ui/components/skyroom-layout/camera-placement';

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
  },
  sidebarGrid: {
    rows: number,
    filledArea: number,
    width: number;
    height: number;
    columns: number;
  },
  autoplayBlocked: boolean,
}

class VideoList extends Component<VideoListProps, VideoListState> {
  private ticking: boolean;

  private grid: HTMLDivElement | null;

  private canvas: HTMLDivElement | null;

  private sidebarGrid: HTMLDivElement | null;

  private failedMediaElements: unknown[];

  private autoplayWasHandled: boolean;

  constructor(props: VideoListProps) {
    super(props);

    this.state = {
      optimalGrid: {
        rows: 1,
        filledArea: 0,
        columns: 0,
        height: 0,
        width: 0,
      },
      sidebarGrid: {
        rows: 1,
        filledArea: 0,
        columns: 0,
        height: 0,
        width: 0,
      },
      autoplayBlocked: false,
    };

    this.ticking = false;
    this.grid = null;
    this.canvas = null;
    this.sidebarGrid = null;
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

    if (layoutType !== prevLayoutType
      || focusedId !== prevFocusedId
      || cameraDockWidth !== prevCameraDockWidth
      || cameraDockHeight !== prevCameraDockHeight
      || streams.length !== prevStreams.length) {
      this.handleCanvasResize();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleCanvasResize, false);
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
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

    if (skyroomLayout?.split) {
      const { sidebar, stage } = partitionSkyroomStreams(streams);
      const sidebarBounds = skyroomLayout.sidebar;
      let { sidebarGrid } = this.state;

      if (sidebar.length > 0 && sidebarBounds && this.sidebarGrid) {
        const sidebarGutter = parseInt(window.getComputedStyle(this.sidebarGrid)
          .getPropertyValue('grid-row-gap'), 10) || 2;
        const computedSidebarGrid = VideoList.computeOptimalGrid(
          sidebar,
          sidebarBounds.width,
          sidebarBounds.height,
          sidebarGutter,
          '',
        );
        if (computedSidebarGrid) {
          sidebarGrid = computedSidebarGrid;
        }
      }

      let { optimalGrid } = this.state;
      const visibleStage = stage.filter(
        (item) => item.type === VIDEO_TYPES.GRID || !('render' in item) || item.render !== false,
      );

      if (visibleStage.length > 0 && this.canvas && this.grid) {
        const gridGutter = parseInt(window.getComputedStyle(this.grid)
          .getPropertyValue('grid-row-gap'), 10);
        const computedStageGrid = VideoList.computeOptimalGrid(
          visibleStage,
          cameraDock?.width,
          cameraDock?.height,
          gridGutter,
          focusedId,
        );
        if (computedStageGrid) {
          optimalGrid = computedStageGrid;
          layoutContextDispatch({
            type: ACTIONS.SET_CAMERA_DOCK_OPTIMAL_GRID_SIZE,
            value: {
              width: optimalGrid.width,
              height: optimalGrid.height,
            },
          });
        }
      }

      this.setState({ optimalGrid, sidebarGrid });
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
    const optimalGrid = VideoList.computeOptimalGrid(
      visibleStreams,
      cameraDock?.width,
      cameraDock?.height,
      gridGutter,
      focusedId,
    );

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

  renderVideoList(streamsToRender?: VideoItem[]) {
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
    const listStreams = streamsToRender ?? streams;
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

      return (
        <Styled.VideoListItem
          key={key}
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

  renderSkyroomSplitLayout() {
    const {
      streams,
      intl,
      cameraDock,
      isGridEnabled,
    } = this.props;
    const { optimalGrid, sidebarGrid, autoplayBlocked } = this.state;
    const skyroomLayout = getSkyroomWebcamLayout();
    const { sidebar, stage } = partitionSkyroomStreams(streams);
    const sidebarBounds = skyroomLayout?.sidebar;
    const { position } = cameraDock;

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
          style={{
            width: `${sidebarGrid.width}px`,
            height: `${sidebarGrid.height}px`,
            gridTemplateColumns: `repeat(${sidebarGrid.columns}, 1fr)`,
            gridTemplateRows: `repeat(${sidebarGrid.rows}, 1fr)`,
          }}
        >
          {this.renderVideoList(sidebar)}
        </Styled.VideoList>
      </div>
    ) : null;

    return (
      <>
        {layoutEl && sidebarDock
          ? createPortal(sidebarDock, layoutEl)
          : sidebarDock}
        <Styled.VideoCanvas
          $position={position}
          ref={(ref) => {
            this.canvas = ref;
          }}
          style={{
            minHeight: 'inherit',
          }}
        >
          {this.renderPreviousPageButton()}

          {!stage.length && !isGridEnabled ? null : (
            <Styled.VideoList
              ref={(ref) => {
                this.grid = ref;
              }}
              style={{
                width: `${optimalGrid.width}px`,
                height: `${optimalGrid.height}px`,
                gridTemplateColumns: `repeat(${optimalGrid.columns}, 1fr)`,
                gridTemplateRows: `repeat(${optimalGrid.rows}, 1fr)`,
              }}
              className="video-provider_list"
            >
              {this.renderVideoList(stage)}
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
    const skyroomLayout = getSkyroomWebcamLayout();

    if (skyroomLayout?.split) {
      return this.renderSkyroomSplitLayout();
    }

    const { optimalGrid, autoplayBlocked } = this.state;
    const { position } = cameraDock;

    return (
      <Styled.VideoCanvas
        $position={position}
        ref={(ref) => {
          this.canvas = ref;
        }}
        style={{
          minHeight: 'inherit',
        }}
      >
        {this.renderPreviousPageButton()}

        {!streams.length && !isGridEnabled ? null : (
          <Styled.VideoList
            ref={(ref) => {
              this.grid = ref;
            }}
            style={{
              width: `${optimalGrid.width}px`,
              height: `${optimalGrid.height}px`,
              gridTemplateColumns: `repeat(${optimalGrid.columns}, 1fr)`,
              gridTemplateRows: `repeat(${optimalGrid.rows}, 1fr)`,
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
