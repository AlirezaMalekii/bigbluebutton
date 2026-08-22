export interface MobileWebcamGrid {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  filledArea: number;
  height: number;
  rows: number;
  width: number;
}

const MOBILE_GRID_COLUMNS = 2;
const MOBILE_GRID_VISIBLE_ROWS = 2;
const MOBILE_GRID_PADDING = 4;

export const computeMobileScrollableWebcamGrid = (
  itemCount: number,
  containerWidth: number,
  containerHeight: number,
  gap = 4,
): MobileWebcamGrid | null => {
  if (itemCount < 1 || containerWidth < 1 || containerHeight < 1) return null;

  const columns = itemCount === 1 ? 1 : MOBILE_GRID_COLUMNS;
  const rows = Math.ceil(itemCount / columns);
  const visibleRows = itemCount <= 2 ? 1 : MOBILE_GRID_VISIBLE_ROWS;
  const horizontalGaps = Math.max(0, columns - 1) * gap;
  const verticalGaps = Math.max(0, visibleRows - 1) * gap;
  const cellWidth = Math.max(
    1,
    Math.floor(
      (containerWidth - MOBILE_GRID_PADDING - horizontalGaps) / columns,
    ),
  );
  const cellHeight = Math.max(
    1,
    Math.floor(
      (containerHeight - MOBILE_GRID_PADDING - verticalGaps) / visibleRows,
    ),
  );
  const contentHeight = cellHeight * rows + Math.max(0, rows - 1) * gap + MOBILE_GRID_PADDING;

  return {
    cellHeight,
    cellWidth,
    columns,
    filledArea: cellWidth * cellHeight * itemCount,
    height: Math.max(containerHeight, contentHeight),
    rows,
    width: containerWidth,
  };
};
