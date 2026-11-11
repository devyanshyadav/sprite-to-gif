import {
  GIF_CLARITY_AMOUNT,
  GIF_CLARITY_CLEANUP,
  GIF_LOW_PASS_RADIUS,
} from '@/lib/constants';

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function luma(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/**
 * Mild unsharp mask gated on luminance. Flat areas are copied through so grain
 * is not amplified. `source` and `lowPass` are RGBA buffers of equal length.
 */
export function applyClarityPass(
  source: Uint8ClampedArray,
  lowPass: Uint8ClampedArray,
  amount: number,
  cleanup: number,
): Uint8ClampedArray {
  if (source.length !== lowPass.length || source.length % 4 !== 0) {
    throw new Error('Image pixel buffers must have the same RGBA dimensions.');
  }

  const intensity = Math.min(100, Math.max(0, amount)) / 100;
  const denoise = Math.min(100, Math.max(0, cleanup)) / 100;
  const detailGain = intensity * 0.85;
  const noiseFloor = 6 + denoise * 18;
  const halo = 8 + intensity * 18;
  const result = new Uint8ClampedArray(source);

  for (let index = 0; index < source.length; index += 4) {
    const originalR = source[index];
    const originalG = source[index + 1];
    const originalB = source[index + 2];
    const smoothR = lowPass[index];
    const smoothG = lowPass[index + 1];
    const smoothB = lowPass[index + 2];
    const detail = luma(originalR, originalG, originalB) - luma(smoothR, smoothG, smoothB);
    const absDetail = Math.abs(detail);
    if (absDetail <= noiseFloor) continue;

    const edgeStrength = (absDetail - noiseFloor) / absDetail;
    const gain = detailGain * edgeStrength;
    result[index] = sharpened(originalR, smoothR, gain, halo);
    result[index + 1] = sharpened(originalG, smoothG, gain, halo);
    result[index + 2] = sharpened(originalB, smoothB, gain, halo);
  }

  return result;
}

function sharpened(original: number, smooth: number, gain: number, halo: number): number {
  const delta = Math.max(-halo, Math.min(halo, (original - smooth) * gain));
  return clampByte(original + delta);
}

/**
 * Separable box blur. Horizontal samples are rounded before the vertical pass,
 * matching a byte intermediate so the low-pass stays stable.
 */
function blurChannel(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  channel: number,
  radius: number,
  horizontal: Uint8Array,
  lowPass: Uint8ClampedArray,
  rowScratch: Float64Array,
  colScratch: Float64Array,
): void {
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) {
      const cx = Math.min(width - 1, Math.max(0, x));
      sum += source[(y * width + cx) * 4 + channel];
    }
    rowScratch[0] = sum / span;

    for (let x = 1; x < width; x += 1) {
      sum -= source[(y * width + Math.max(0, x - radius - 1)) * 4 + channel];
      sum += source[(y * width + Math.min(width - 1, x + radius)) * 4 + channel];
      rowScratch[x] = sum / span;
    }

    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      horizontal[row + x] = Math.round(rowScratch[x]);
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      const cy = Math.min(height - 1, Math.max(0, y));
      sum += horizontal[cy * width + x];
    }
    colScratch[0] = sum / span;

    for (let y = 1; y < height; y += 1) {
      sum -= horizontal[Math.max(0, y - radius - 1) * width + x];
      sum += horizontal[Math.min(height - 1, y + radius) * width + x];
      colScratch[y] = sum / span;
    }

    for (let y = 0; y < height; y += 1) {
      lowPass[(y * width + x) * 4 + channel] = Math.round(colScratch[y]);
    }
  }
}

function buildLowPassRgba(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  const safeRadius = Math.max(1, Math.round(radius));
  const lowPass = new Uint8ClampedArray(source);
  const horizontal = new Uint8Array(width * height);
  const rowScratch = new Float64Array(width);
  const colScratch = new Float64Array(height);

  for (let channel = 0; channel < 3; channel += 1) {
    blurChannel(
      source,
      width,
      height,
      channel,
      safeRadius,
      horizontal,
      lowPass,
      rowScratch,
      colScratch,
    );
  }

  return lowPass;
}

/** One luminance-gated unsharp pass at the configured radius. */
export function enhanceFrameRgba(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  amount = GIF_CLARITY_AMOUNT,
  cleanup = GIF_CLARITY_CLEANUP,
): Uint8ClampedArray {
  if (source.length !== width * height * 4) {
    throw new Error('RGBA buffer size does not match width × height.');
  }

  const lowPass = buildLowPassRgba(source, width, height, GIF_LOW_PASS_RADIUS);
  return applyClarityPass(source, lowPass, amount, cleanup);
}
