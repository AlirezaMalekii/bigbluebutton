export const MOBILE_GRID_COLUMNS: number;
export const MOBILE_GRID_VISIBLE_ROWS: number;
export const MOBILE_GRID_PADDING: number;

export type MobileWebcamGrid = {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  filledArea: number;
  height: number;
  rows: number;
  width: number;
};

export function computeMobileScrollableWebcamGrid(
  itemCount: number,
  containerWidth: number,
  containerHeight: number,
  gap?: number,
): MobileWebcamGrid | null;
