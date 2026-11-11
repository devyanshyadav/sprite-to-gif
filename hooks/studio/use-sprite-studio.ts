'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useDeferredValue,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import type {
  GridConfig,
  GifOptions,
  ImageMeta,
  ContainerDetectionDiagnostics,
  FrameSlice,
} from '@/lib/types';
import {
  autoDetectGridStructure,
  calculateFrameSlicesWithCV,
  applyAutoDetectToGrid,
} from '@/lib/gif';
import {
  DEFAULT_GRID_CONFIG,
  DEFAULT_GIF_OPTIONS,
  DEFAULT_SAMPLE,
} from '@/lib/constants';
import {
  fetchImageAsDataUrl,
  loadHtmlImage,
  readFileAsDataUrl,
} from '@/lib/media/image-loading';
import { useSavedGifVault } from '@/hooks/studio/use-saved-gif-vault';
import type {
  StudioHeaderProps,
  StudioWorkspaceProps,
} from '@/hooks/studio/view-models';

export function useSpriteStudio() {
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG);
  const [gifOptions, setGifOptions] =
    useState<GifOptions>(DEFAULT_GIF_OPTIONS);
  const [disabledIndices, setDisabledIndices] = useState<Set<number>>(
    () => new Set()
  );
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<
    number | undefined
  >(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [activeSamplePath, setActiveSamplePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [promptSheetOpen, setPromptSheetOpen] = useState(false);

  const vault = useSavedGifVault();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gridConfigRef = useRef(gridConfig);
  const deferredGridConfig = useDeferredValue(gridConfig);
  const isSlicingPending = deferredGridConfig !== gridConfig;

  useEffect(() => {
    gridConfigRef.current = gridConfig;
  }, [gridConfig]);

  const installImage = useCallback(async (src: string, name: string) => {
    const { image, meta } = await loadHtmlImage(src, name);
    setImageElement(image);
    setImageMeta(meta);
    setDisabledIndices(new Set());
    const detected = autoDetectGridStructure(
      image,
      gridConfigRef.current.sensitivity
    );
    setGridConfig((prev) => applyAutoDetectToGrid(prev, detected));
  }, []);

  useEffect(() => {
    let active = true;
    fetchImageAsDataUrl(DEFAULT_SAMPLE.path)
      .then((dataUrl) => {
        if (!active) return;
        return installImage(dataUrl, DEFAULT_SAMPLE.label).then(() => {
          setActiveSamplePath(DEFAULT_SAMPLE.path);
        });
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [installImage]);

  const computedSlicing = useMemo(() => {
    if (!imageElement) {
      return {
        slices: [] as FrameSlice[],
        diagnostics: null as ContainerDetectionDiagnostics | null,
      };
    }
    return calculateFrameSlicesWithCV(imageElement, deferredGridConfig);
  }, [imageElement, deferredGridConfig]);

  const slices = useMemo(
    () =>
      computedSlicing.slices.map((slice) => ({
        ...slice,
        enabled: !disabledIndices.has(slice.index),
      })),
    [computedSlicing.slices, disabledIndices]
  );

  const diagnostics = computedSlicing.diagnostics;

  const mergeGifOptions = useCallback((opts: Partial<GifOptions>) => {
    setGifOptions((prev) => ({ ...prev, ...opts }));
  }, []);

  const runAutoDetect = useCallback(() => {
    if (!imageElement) return;
    const detected = autoDetectGridStructure(
      imageElement,
      gridConfig.sensitivity
    );
    setDisabledIndices(new Set());
    setGridConfig((prev) => applyAutoDetectToGrid(prev, detected));
  }, [imageElement, gridConfig.sensitivity]);

  const processFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await installImage(dataUrl, file.name);
        setActiveSamplePath(null);
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [installImage]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith('image/')) void processFile(file);
    },
    [processFile]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            void processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const loadSampleImage = useCallback(
    async (samplePath: string, label: string) => {
      try {
        setIsLoadingSample(true);
        const dataUrl = await fetchImageAsDataUrl(samplePath);
        await installImage(dataUrl, label);
        setActiveSamplePath(samplePath);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingSample(false);
      }
    },
    [installImage]
  );

  const toggleFrame = useCallback((index: number) => {
    setDisabledIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectPromptGrid = useCallback((cols: number, rows: number) => {
    setGridConfig((prev) => ({
      ...prev,
      columns: cols,
      rows,
      totalFrames: cols * rows,
    }));
  }, []);

  const openPromptSheet = useCallback(() => setPromptSheetOpen(true), []);

  const headerProps: StudioHeaderProps = {
    savedGifs: vault.savedGifs,
    isLoadingSample,
    activeSamplePath,
    loadSampleImage,
    deleteSaved: vault.deleteSaved,
    updateTitle: vault.updateTitle,
    clearAllSaved: vault.clearAll,
  };

  const workspaceProps: StudioWorkspaceProps = {
    imageMeta,
    imageElement,
    gridConfig,
    setGridConfig,
    gifOptions,
    mergeGifOptions,
    slices,
    diagnostics,
    isSlicingPending,
    selectedFrameIndex,
    setSelectedFrameIndex,
    isDragOver,
    fileInputRef,
    handleFileChange,
    openFilePicker,
    isUploading,
    openPromptSheet,
    promptSheetOpen,
    setPromptSheetOpen,
    selectPromptGrid,
    toggleFrame,
    runAutoDetect,
    saveToLibrary: vault.saveToLibrary,
    fileName: imageMeta?.name ?? 'animation',
  };

  return {
    headerProps,
    workspaceProps,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
