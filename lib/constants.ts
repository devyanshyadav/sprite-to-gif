import type { GridConfig, GifOptions } from '@/lib/types';

export const DEFAULT_GRID_CONFIG: GridConfig = {
  slicingMode: 'smart-cv',
  columns: 10,
  rows: 3,
  totalFrames: 30,
  cropOffsetX: 0,
  cropOffsetY: 0,
  cropMarginRight: 0,
  cropMarginBottom: 0,
  gapX: 0,
  gapY: 0,
  cellInset: 2,
  sensitivity: 50,
  perCellRefine: true,
  order: 'row-major',
};

export const DEFAULT_GIF_OPTIONS: GifOptions = {
  fps: 12,
  loop: 0,
  playbackMode: 'forward',
};

/** Fixed GIF encode settings (formerly UI toggles). */
export const GIF_ENCODE_SCALE = 1;
export const GIF_ENCODE_MAX_COLORS = 256;

/** Per-frame clarity (0–100). Cleanup gates out grain before any sharpen. */
export const GIF_CLARITY_AMOUNT = 38;
export const GIF_CLARITY_CLEANUP = 72;
export const GIF_LOW_PASS_RADIUS = 1;

/** Bundled demo sheets under `public/` (see `public/samples/`). */
export const SAMPLE_SPRITE_SHEETS = [
  {
    path: '/samples/45aa1be7-5b79-4bf5-a174-001e0e0a8e33.png',
    label: 'Bioluminescent jellyfish · 8×3 (24 frames)',
  },
  {
    path: '/samples/9ebfb405-6f8b-49c9-b6bf-72e9efff6bb9.png',
    label: 'Frog chef wok toss · 8×3 (24 frames)',
  },
  {
    path: '/samples/377e2ac8-f2a0-484c-882d-ca555b472568.png',
    label: 'Luffy vs Kaido · 9×3 (27 frames)',
  },
  {
    path: '/samples/183962a8-6cb7-4db3-9794-c557b0e49eff.png',
    label: 'Origami dragon fire · 9×3 (27 frames)',
  },
  {
    path: '/samples/sample-panda.png',
    label: 'Panda · 9×3 (27 frames)',
  },
  {
    path: '/samples/103dfa63-9e53-49dc-9001-abe7d623375c.png',
    label: 'Mecha beam attack · 8×3 (24 frames)',
  },
  {
    path: '/samples/294ddd17-2d6a-47fa-9d83-e36a675f00a5.png',
    label: 'Ninja apple chop · 9×3 (27 frames)',
  },
  {
    path: '/samples/594c7b66-a943-4101-8b9c-bc520cdd0bd8.png',
    label: 'Ice cream moon eclipse · 7×3 (21 frames)',
  },
  {
    path: '/samples/229c637f-6137-49ec-ae4b-39ef5cd1bffd.png',
    label: 'Katana forging · 8×3 (24 frames)',
  },
  {
    path: '/samples/39b0ffd4-2543-4811-a25f-efce9f0ab7fc.png',
    label: 'Anime crying · 10×3 (30 frames)',
  },
  {
    path: '/samples/4d8385f3-88ee-4b0c-9631-94ef30412e5d.png',
    label: 'Astronaut coffee orbit · 9×3 (27 frames)',
  },
  {
    path: '/samples/7fc5bb80-bec0-479d-9b03-b2149d4dd229.png',
    label: 'Steampunk owl · 9×3 (27 frames)',
  },
 
  {
    path: '/samples/7577c668-6da7-4e94-b71d-bff921999db3.png',
    label: 'Hovercar landing · 8×4 (32 frames)',
  },
  {
    path: '/samples/619f98d4-41eb-4000-a4f8-bec8bb4ea287.png',
    label: 'Teddy bear dance · 9×3 (27 frames)',
  },
  
  {
    path: '/samples/a0c5690e-8748-4fb4-aa53-41df4a409f6f.png',
    label: 'Mechanical lotus bloom · 8×3 (24 frames)',
  },
 
 
  {
    path: '/samples/f9844e9d-4fe0-4e63-b6e1-50264403b559.png',
    label: 'Dove from top hat · 6×3 (18 frames)',
  },
  {
    path: '/samples/b9566c10-6266-428a-aa80-9cad4a2f6608.png',
    label: 'Chameleon color shift · 8×3 (24 frames)',
  },
 
  {
    path: '/samples/PqZyW5kwWpcOiBv5_p1vT_l6gInv7sT3mhzXvkQTkDYc55gNDIV5KrPwTSXBtLypZJB-fwEXLC8zK5m5f4Fvlu6JoYTx6CJ7yR6LnfeIi7hW2gEdKbOK-IubtcUAwWtH3T1w-xH58rGD1aLRKR-5MDbzxz5pA3CL0ql07_qQ5ewoOsuQMVeMHqJytzLGyGn8.jpeg',
    label: 'Chalk butterfly takeoff · 6×4 (24 frames)',
  },
] as const;

export const DEFAULT_SAMPLE = SAMPLE_SPRITE_SHEETS[0];
