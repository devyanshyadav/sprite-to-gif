import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import type {
  ContainerDetectionDiagnostics,
  FrameSlice,
  GifOptions,
  GridConfig,
  ImageMeta,
  SavedGifItem,
  SavedGifRecord,
} from '@/lib/types';

export type StudioHeaderProps = {
  savedGifs: SavedGifItem[];
  isLoadingSample: boolean;
  activeSamplePath: string | null;
  loadSampleImage: (path: string, label: string) => Promise<void>;
  deleteSaved: (id: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  clearAllSaved: () => Promise<void>;
};

export type StudioWorkspaceProps = {
  imageMeta: ImageMeta | null;
  imageElement: HTMLImageElement | null;
  gridConfig: GridConfig;
  setGridConfig: Dispatch<SetStateAction<GridConfig>>;
  gifOptions: GifOptions;
  mergeGifOptions: (opts: Partial<GifOptions>) => void;
  slices: FrameSlice[];
  diagnostics: ContainerDetectionDiagnostics | null;
  isSlicingPending: boolean;
  selectedFrameIndex: number | undefined;
  setSelectedFrameIndex: Dispatch<SetStateAction<number | undefined>>;
  isDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  openFilePicker: () => void;
  isUploading: boolean;
  openPromptSheet: () => void;
  promptSheetOpen: boolean;
  setPromptSheetOpen: (open: boolean) => void;
  selectPromptGrid: (cols: number, rows: number) => void;
  toggleFrame: (index: number) => void;
  runAutoDetect: () => void;
  saveToLibrary: (item: Omit<SavedGifRecord, 'id' | 'createdAt'>) => Promise<void>;
  fileName: string;
};
