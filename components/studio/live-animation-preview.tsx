'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { FrameSlice, GifOptions } from '@/lib/types';
import { buildPlaybackSequence } from '@/lib/gif';
import {
  drawEnhancedFrameSlice,
  syncCanvasToSlice,
} from '@/lib/media/draw-frame-slice';
import {
  PiPlayFill,
  PiPauseFill,
  PiSkipBackFill,
  PiSkipForwardFill,
} from 'react-icons/pi';
import { BevelButton } from '@/components/library/bevel-button';
import { ControlSlider } from '@/components/library/control-slider';
import {
  SculptedTabs,
  SculptedTabsList,
  SculptedTabsTrigger,
} from '@/components/library/sculpted-tabs';
import { Slider } from '@/components/ui/slider';
import { IconTooltip } from '@/components/library/icon-tooltip';
import { STUDIO_COPY } from '@/lib/studio-copy';

interface LiveAnimationPreviewProps {
  image: HTMLImageElement | null;
  slices: FrameSlice[];
  options: GifOptions;
  onOptionsChange: (newOptions: Partial<GifOptions>) => void;
}

export function LiveAnimationPreview({
  image,
  slices,
  options,
  onOptionsChange,
}: LiveAnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCacheRef = useRef<Map<number, ImageData>>(new Map());
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

  const activeSlices = useMemo(() => slices.filter((s) => s.enabled), [slices]);

  const sequence = useMemo(
    () => buildPlaybackSequence(activeSlices, options.playbackMode),
    [activeSlices, options.playbackMode]
  );

  const safeIndex =
    sequence.length > 0 ? currentSequenceIndex % sequence.length : 0;

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || sequence.length === 0) return;

    const currentSlice = sequence[safeIndex];
    if (!currentSlice) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    syncCanvasToSlice(canvas, currentSlice);
    const cached = frameCacheRef.current.get(currentSlice.index);
    if (
      cached &&
      cached.width === canvas.width &&
      cached.height === canvas.height
    ) {
      ctx.putImageData(cached, 0, 0);
      return;
    }

    drawEnhancedFrameSlice(ctx, image, currentSlice);
    frameCacheRef.current.set(
      currentSlice.index,
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    );
  }, [image, sequence, safeIndex]);

  useEffect(() => {
    frameCacheRef.current.clear();
  }, [image, slices]);

  useEffect(() => {
    drawCurrentFrame();
  }, [drawCurrentFrame]);

  useEffect(() => {
    if (!isPlaying || sequence.length === 0) return;

    const intervalMs = 1000 / options.fps;
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTime;
      if (delta >= intervalMs) {
        lastTime = now - (delta % intervalMs);
        setCurrentSequenceIndex((prev) => (prev + 1) % sequence.length);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, sequence.length, options.fps]);

  const currentFrameObj = sequence[safeIndex];
  const one = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number));

  return (
    <div className="flex flex-col gap-3">
      {/* Video Player Screen */}
      <div
        onClick={() => setIsPlaying(!isPlaying)}
        className="group relative flex h-studio-preview sm:h-studio-preview-lg w-full cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg border border-stage-border bg-stage text-stage-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06),inset_0_12px_24px_rgb(0_0_0/0.45)]"
      >
        {sequence.length > 0 ? (
          <canvas
            ref={canvasRef}
            className="mx-auto block h-full w-auto max-w-full bg-stage object-contain [image-rendering:pixelated]"
          />
        ) : (
          <p className="text-sm text-stage-muted-foreground">
            {STUDIO_COPY.preview.empty}
          </p>
        )}

        {/* Video Bottom Gradient for timecode/meta */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-stage/80 via-stage/20 to-transparent" />

        {/* Top-Right Player Status */}
        <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-md border border-stage-foreground/10 bg-stage/60 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-stage-foreground backdrop-blur-md">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPlaying ? 'animate-pulse bg-chart-2' : 'bg-stage-muted-foreground'
            }`}
          />
          <span>{isPlaying ? 'PLAY' : 'PAUSE'}</span>
        </div>

        {/* Bottom-Left Frame Metadata / Timecode */}
        {currentFrameObj && (
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-md border border-stage-foreground/10 bg-stage/70 px-2.5 py-1 font-mono text-xs text-stage-foreground backdrop-blur-md shadow-sm">
            <span className="font-semibold">#{currentFrameObj.index + 1}</span>
            <span className="text-stage-muted-foreground">·</span>
            <span className="text-stage-foreground/80">
              {currentFrameObj.width}×{currentFrameObj.height}
            </span>
          </div>
        )}

        {/* Center Play Overlay when paused */}
        {!isPlaying && sequence.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stage/20 backdrop-blur-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stage-foreground/20 text-stage-foreground backdrop-blur-md shadow-lg transition-transform group-hover:scale-110">
              <PiPlayFill className="ml-0.5 h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <IconTooltip label="Previous frame">
            <BevelButton
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setIsPlaying(false);
                setCurrentSequenceIndex((prev) =>
                  prev === 0 ? sequence.length - 1 : prev - 1
                );
              }}
            >
              <PiSkipBackFill />
            </BevelButton>
          </IconTooltip>
          <IconTooltip label={isPlaying ? 'Pause' : 'Play'}>
            <BevelButton size="icon-sm" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <PiPauseFill /> : <PiPlayFill />}
            </BevelButton>
          </IconTooltip>
          <IconTooltip label="Next frame">
            <BevelButton
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setIsPlaying(false);
                setCurrentSequenceIndex((prev) => (prev + 1) % sequence.length);
              }}
            >
              <PiSkipForwardFill />
            </BevelButton>
          </IconTooltip>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1 px-0.5">
            {sequence.length > 1 ? (
              <Slider
                min={0}
                max={sequence.length - 1}
                value={[safeIndex]}
                onValueChange={(v) => {
                  setIsPlaying(false);
                  setCurrentSequenceIndex(one(v));
                }}
              />
            ) : (
              <div
                className="h-1.5 w-full rounded-full bg-input ring-1 ring-inset ring-input"
                aria-hidden
              />
            )}
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {sequence.length > 0 ? safeIndex + 1 : 0}/{sequence.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 sm:items-end">
        <ControlSlider
          size="sm"
          label={STUDIO_COPY.preview.speed}
          min={1}
          max={30}
          value={options.fps}
          formatValue={(v) => `${v} FPS`}
          onValueChange={(v) => onOptionsChange({ fps: one(v) })}
        />

        <SculptedTabs
          value={options.playbackMode}
          onValueChange={(v) =>
            onOptionsChange({ playbackMode: v as GifOptions['playbackMode'] })
          }
        >
          <SculptedTabsList size="sm" variant="segmented">
            <SculptedTabsTrigger value="forward">
              {STUDIO_COPY.preview.modeLoop}
            </SculptedTabsTrigger>
            <SculptedTabsTrigger value="ping-pong">
              {STUDIO_COPY.preview.modePingPong}
            </SculptedTabsTrigger>
            <SculptedTabsTrigger value="reverse">
              {STUDIO_COPY.preview.modeReverse}
            </SculptedTabsTrigger>
          </SculptedTabsList>
        </SculptedTabs>
      </div>
    </div>
  );
}
