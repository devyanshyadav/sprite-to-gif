import { describe, expect, it } from 'vitest';
import { applyAutoDetectToGrid } from '@/lib/gif/grid-config';
import { DEFAULT_GRID_CONFIG } from '@/lib/constants';

describe('applyAutoDetectToGrid', () => {
  it('merges detection into grid and resets crop margins', () => {
    const next = applyAutoDetectToGrid(
      {
        ...DEFAULT_GRID_CONFIG,
        slicingMode: 'uniform-grid',
        columns: 4,
        rows: 2,
        cropOffsetX: 5,
        cropMarginRight: 3,
      },
      { columns: 9, rows: 3, totalFrames: 27 }
    );

    expect(next.slicingMode).toBe('smart-cv');
    expect(next.columns).toBe(9);
    expect(next.rows).toBe(3);
    expect(next.totalFrames).toBe(27);
    expect(next.cropOffsetX).toBe(0);
    expect(next.cropMarginRight).toBe(0);
    expect(next.sensitivity).toBe(DEFAULT_GRID_CONFIG.sensitivity);
  });
});
