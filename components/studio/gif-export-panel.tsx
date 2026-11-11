'use client';

import {
  useState,
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from 'react';
import type { FrameSlice, GifOptions, SavedGifRecord } from '@/lib/types';
import { createGifFromImage } from '@/lib/gif';
import { revokePreviewUrl } from '@/lib/media/preview-url';
import { formatFileSize } from '@/lib/media/format-file-size';
import { downloadBlob } from '@/lib/media/download-blob';
import {
  drawFrameSlice,
  syncCanvasToSlice,
} from '@/lib/media/draw-frame-slice';
import { stripFileExtension } from '@/lib/media/export-filename';
import { STUDIO_COPY } from '@/lib/studio-copy';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import {
  PiDownloadSimpleBold,
  PiBookmarkSimpleBold,
  PiCheckCircleFill,
  PiFilmStripBold,
  PiFileZipBold,
  PiEyeBold,
} from 'react-icons/pi';

import { BevelButton } from '@/components/library/bevel-button';
import {
  NoticeAlert,
  NoticeAlertIcon,
  NoticeAlertContent,
  NoticeAlertTitle,
  NoticeAlertDescription,
  NoticeAlertClose,
} from '@/components/library/notice-alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export type GifExportPanelRef = { generate: () => void };

interface GifExportPanelProps {
  image: HTMLImageElement | null;
  slices: FrameSlice[];
  options: GifOptions;
  onSaveToLibrary: (item: Omit<SavedGifRecord, 'id' | 'createdAt'>) => Promise<void>;
  fileName?: string;
  ref?: Ref<GifExportPanelRef>;
}

export function GifExportPanel({
  image,
  slices,
  options,
  onSaveToLibrary,
  fileName = 'animation',
  ref,
}: GifExportPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressDetails, setProgressDetails] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    tone: 'error' | 'success' | 'warning';
    message: string;
  } | null>(null);
  const [generatedGif, setGeneratedGif] = useState<{
    blob: Blob;
    previewUrl: string;
    width: number;
    height: number;
    frameCount: number;
    durationMs: number;
    sizeBytes: number;
  } | null>(null);
  useEffect(() => {
    const url = generatedGif?.previewUrl;
    return () => revokePreviewUrl(url);
  }, [generatedGif?.previewUrl]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeSlices = slices.filter((s) => s.enabled);
  const generatingRef = useRef(false);

  const handleGenerate = async () => {
    if (!image || activeSlices.length === 0 || generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);

    try {
      setProgress(0);
      setIsSaved(false);
      setProgressDetails('Preparing frames & palette...');

      const result = await createGifFromImage({
        image,
        slices: activeSlices,
        options,
        onProgress: (pct, curr, total) => {
          setProgress(pct);
          setProgressDetails(`Processing frame ${curr} of ${total} (${pct}%)`);
        },
      });

      setGeneratedGif({
        ...result,
        sizeBytes: result.blob.size,
      });
      setAlertInfo(null);
      setDialogOpen(true);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: unknown) {
      console.error(err);
      setAlertInfo({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate GIF',
      });
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  };

  useImperativeHandle(ref, () => ({ generate: () => void handleGenerate() }));

  const handleDownloadZip = async () => {
    if (!image || activeSlices.length === 0) return;

    try {
      setIsExportingZip(true);
      const zip = new JSZip();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      for (let i = 0; i < activeSlices.length; i++) {
        const frame = activeSlices[i];
        syncCanvasToSlice(canvas, frame);
        drawFrameSlice(ctx, image, frame);

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const padIndex = String(i + 1).padStart(3, '0');
        zip.file(`frame_${padIndex}.png`, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(
        zipBlob,
        `${stripFileExtension(fileName)}_${activeSlices.length}frames.zip`
      );
    } catch (err) {
      console.error(err);
      setAlertInfo({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to bundle frames as ZIP',
      });
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedGif) return;
    try {
      setIsSaving(true);
      const title = `${stripFileExtension(fileName)}_${generatedGif.frameCount}frames_${options.fps}fps`;
      await onSaveToLibrary({
        title,
        gif: generatedGif.blob,
        width: generatedGif.width,
        height: generatedGif.height,
        frameCount: generatedGif.frameCount,
        fps: options.fps,
        sizeBytes: generatedGif.sizeBytes,
      });
      setIsSaved(true);
      setAlertInfo({
        tone: 'success',
        message: 'Saved animation to your local library vault!',
      });
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error(err);
      setAlertInfo({
        tone: 'error',
        message: 'Failed to save GIF to local library vault',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!generatedGif) return;
    downloadBlob(
      generatedGif.blob,
      `${stripFileExtension(fileName)}_${generatedGif.frameCount}frames.gif`
    );
  };

  const disabled = !image || activeSlices.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <BevelButton
          size="lg"
          className="flex-1"
          loading={isGenerating}
          onClick={handleGenerate}
          disabled={disabled}
        >
          {!isGenerating && <PiFilmStripBold />}
          {isGenerating
            ? STUDIO_COPY.export.creating(progress)
            : STUDIO_COPY.export.create(activeSlices.length)}
        </BevelButton>
        <BevelButton
          size="lg"
          variant="secondary"
          loading={isExportingZip}
          onClick={handleDownloadZip}
          disabled={disabled}
        >
          {!isExportingZip && <PiFileZipBold />}
          {STUDIO_COPY.export.frameZip}
        </BevelButton>
      </div>

      {isGenerating && (
        <div className="flex flex-col gap-1.5">
          <Progress value={progress} />
          <p className="text-center text-xs text-muted-foreground">{progressDetails}</p>
        </div>
      )}

      {alertInfo && (
        <NoticeAlert
          tone={alertInfo.tone}
          variant="soft"
          size="sm"
          onOpenChange={(open) => !open && setAlertInfo(null)}
        >
          <NoticeAlertIcon />
          <NoticeAlertContent>
            <NoticeAlertTitle>
              {alertInfo.tone === 'error'
                ? STUDIO_COPY.export.alertNotice
                : STUDIO_COPY.export.alertSuccess}
            </NoticeAlertTitle>
            <NoticeAlertDescription>{alertInfo.message}</NoticeAlertDescription>
          </NoticeAlertContent>
          <NoticeAlertClose />
        </NoticeAlert>
      )}

      {/* Compact status pill if GIF was created */}
      {generatedGif && !isGenerating && (
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
          <span className="font-mono text-muted-foreground">
            {STUDIO_COPY.export.ready}: {formatFileSize(generatedGif.sizeBytes)} ·{' '}
            {generatedGif.width}×{generatedGif.height}px
          </span>
          <BevelButton
            size="xs"
            variant="ghost"
            onClick={() => setDialogOpen(true)}
          >
            <PiEyeBold />
            {STUDIO_COPY.export.open}
          </BevelButton>
        </div>
      )}

      {/* Modal Dialog for the Generated GIF */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold tracking-tight">
              {STUDIO_COPY.export.dialogTitle}
            </DialogTitle>
            {generatedGif && (
              <DialogDescription className="font-mono text-xs">
                {formatFileSize(generatedGif.sizeBytes)} · {generatedGif.width}×{generatedGif.height}px ·{' '}
                {(generatedGif.durationMs / 1000).toFixed(1)}s ({generatedGif.frameCount} frames @ {options.fps} FPS)
              </DialogDescription>
            )}
          </DialogHeader>

          {generatedGif && (
            <div className="flex flex-col gap-3 py-1">
              <div className="flex min-h-export-preview-min max-h-export-preview-max items-center justify-center overflow-hidden rounded-xl border border-stage-border bg-stage p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedGif.previewUrl}
                  alt="Generated animated GIF"
                  className="max-h-export-image-max max-w-full rounded object-contain shadow-sm [image-rendering:pixelated]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <BevelButton className="flex-1" onClick={handleDownload}>
                  <PiDownloadSimpleBold />
                  {STUDIO_COPY.export.download}
                </BevelButton>
                <BevelButton
                  variant="secondary"
                  className="flex-1"
                  loading={isSaving}
                  onClick={handleSaveToLibrary}
                  disabled={isSaved}
                >
                  {isSaved ? (
                    <>
                      <PiCheckCircleFill />
                      {STUDIO_COPY.export.saved}
                    </>
                  ) : isSaving ? (
                    STUDIO_COPY.export.saving
                  ) : (
                    <>
                      <PiBookmarkSimpleBold />
                      {STUDIO_COPY.export.save}
                    </>
                  )}
                </BevelButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
