export const MOBILE_GRID_COLUMNS = 2;
export const MOBILE_GRID_VISIBLE_ROWS = 2;
export const MOBILE_GRID_PADDING = 4;

// 1 cam fills the dock. 2+ cams use the same square cell (sized for a 2×2
// viewport). Two cams therefore stay on one square row; leftover dock
// height stays empty. Five cams need three rows and must scroll.

export const computeMobileScrollableWebcamGrid = (
  itemCount,
  containerWidth,
  containerHeight,
  gap = 4,
) => {
  if (itemCount < 1 || containerWidth < 1 || containerHeight < 1) return null;

  if (itemCount === 1) {
    return {
      cellHeight: Math.max(1, containerHeight - MOBILE_GRID_PADDING),
      cellWidth: Math.max(1, containerWidth - MOBILE_GRID_PADDING),
      columns: 1,
      filledArea: containerWidth * containerHeight,
      height: containerHeight,
      rows: 1,
      width: containerWidth,
    };
  }

  const columns = MOBILE_GRID_COLUMNS;
  const rows = Math.ceil(itemCount / columns);
  const horizontalGaps = (columns - 1) * gap;
  const viewportVerticalGaps = (MOBILE_GRID_VISIBLE_ROWS - 1) * gap;
  const maxCellWidth = Math.max(
    1,
    Math.floor((containerWidth - MOBILE_GRID_PADDING - horizontalGaps) / columns),
  );
  const maxCellHeight = Math.max(
    1,
    Math.floor(
      (containerHeight - MOBILE_GRID_PADDING - viewportVerticalGaps)
        / MOBILE_GRID_VISIBLE_ROWS,
    ),
  );
  const cell = Math.max(1, Math.min(maxCellWidth, maxCellHeight));
  const contentHeight = cell * rows + Math.max(0, rows - 1) * gap + MOBILE_GRID_PADDING;

  return {
    cellHeight: cell,
    cellWidth: cell,
    columns,
    filledArea: cell * cell * itemCount,
    height: contentHeight,
    rows,
    width: containerWidth,
  };
};
