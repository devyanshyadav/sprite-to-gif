import { describe, expect, it } from 'vitest';
import { applyClarityPass, enhanceFrameRgba } from '@/lib/gif/clarity-pass';

describe('applyClarityPass', () => {
  it('rejects mismatched buffer lengths', () => {
    const a = new Uint8ClampedArray(4);
    const b = new Uint8ClampedArray(8);
    expect(() => applyClarityPass(a, b, 50, 50)).toThrow();
  });

  it('preserves alpha and sharpens RGB', () => {
    const source = new Uint8ClampedArray([
      40, 40, 40, 255, 200, 200, 200, 255,
    ]);
    const lowPass = new Uint8ClampedArray([
      120, 120, 120, 255, 120, 120, 120, 255,
    ]);
    const out = applyClarityPass(source, lowPass, 80, 10);
    expect(out[3]).toBe(255);
    expect(out[7]).toBe(255);
    expect(out[4]).not.toBe(source[4]);
    expect(out[0]).not.toBe(source[0]);
  });
});

describe('enhanceFrameRgba', () => {
  it('sharpens a hard edge and leaves a flat field unchanged', () => {
    const w = 8;
    const h = 2;
    const source = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const tone = x < 4 ? 20 : 220;
        source[i] = tone;
        source[i + 1] = tone;
        source[i + 2] = tone;
        source[i + 3] = 255;
      }
    }
    const enhanced = enhanceFrameRgba(source, w, h);
    expect(enhanced.length).toBe(source.length);
    expect(Array.from(enhanced)).toEqual([
      20, 20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255, 5, 5, 5, 255, 235, 235,
      235, 255, 220, 220, 220, 255, 220, 220, 220, 255, 220, 220, 220, 255, 20,
      20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255, 5, 5, 5, 255, 235, 235, 235,
      255, 220, 220, 220, 255, 220, 220, 220, 255, 220, 220, 220, 255,
    ]);
  });
});
