export type SlicingMode = 'smart-cv' | 'uniform-grid';

export interface GridConfig {
  slicingMode: SlicingMode;
  columns: number;
  rows: number;
  totalFrames: number;
  cropOffsetX: number; // Left outer margin in px (used in uniform-grid or as manual override)
  cropOffsetY: number; // Top outer margin in px
  cropMarginRight: number; // Right outer margin in px
  cropMarginBottom: number; // Bottom outer margin in px
  gapX: number; // Horizontal gap between frames
  gapY: number; // Vertical gap between frames
  cellInset: number; // Extra inner safety trim (px) inside each detected container
  sensitivity: number; // Edge detection sensitivity (1-100, default 50)
  perCellRefine: boolean; // Refine each individual container's 4 walls locally
  order: 'row-major' | 'column-major';
}

export interface ContainerDetectionDiagnostics {
  mode: SlicingMode;
  detectedColumns: number;
  detectedRows: number;
  confidenceScore: number;
  outerPadding: { left: number; right: number; top: number; bottom: number };
  xGutters: Array<{ start: number; end: number }>;
  yGutters: Array<{ start: number; end: number }>;
  xIntervals: Array<{ start: number; end: number }>;
  yIntervals: Array<{ start: number; end: number }>;
  medianWidth: number;
  medianHeight: number;
}

export interface FrameSlice {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
}

export interface GifOptions {
  fps: number;
  loop: number; // 0 = infinite
  playbackMode: 'forward' | 'reverse' | 'ping-pong';
}

/** Row stored in IndexedDB (durable). */
export interface SavedGifRecord {
  id: string;
  title: string;
  createdAt: number;
  gif: Blob;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  sizeBytes: number;
}

/** Hydrated for UI with a session object URL. */
export interface SavedGifItem extends SavedGifRecord {
  previewUrl: string;
}

export interface ImageMeta {
  name: string;
  naturalWidth: number;
  naturalHeight: number;
}
