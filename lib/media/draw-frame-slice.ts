import { enhanceFrameRgba } from '@/lib/gif/clarity-pass';
import type { FrameSlice } from '@/lib/types';

export function drawFrameSlice(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  slice: FrameSlice
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(
    image,
    slice.x,
    slice.y,
    slice.width,
    slice.height,
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height
  );
}

/** Nearest-neighbor blit, then the same clarity stack used at GIF export. */
export function drawEnhancedFrameSlice(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  slice: FrameSlice
): void {
  drawFrameSlice(ctx, image, slice);
  const { width, height } = ctx.canvas;
  const raw = ctx.getImageData(0, 0, width, height);
  const enhanced = enhanceFrameRgba(raw.data, width, height);
  raw.data.set(enhanced);
  ctx.putImageData(raw, 0, 0);
}

export function syncCanvasToSlice(
  canvas: HTMLCanvasElement,
  slice: FrameSlice
): void {
  canvas.width = slice.width;
  canvas.height = slice.height;
}
