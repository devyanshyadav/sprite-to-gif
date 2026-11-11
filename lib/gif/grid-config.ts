import type { GridConfig } from '@/lib/types';

export function applyAutoDetectToGrid(
  prev: GridConfig,
  detected: Pick<GridConfig, 'columns' | 'rows' | 'totalFrames'>
): GridConfig {
  return {
    ...prev,
    slicingMode: 'smart-cv',
    columns: detected.columns,
    rows: detected.rows,
    totalFrames: detected.totalFrames,
    cropOffsetX: 0,
    cropOffsetY: 0,
    cropMarginRight: 0,
    cropMarginBottom: 0,
  };
}
