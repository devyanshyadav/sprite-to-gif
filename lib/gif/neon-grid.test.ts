import { describe, expect, it } from 'vitest';
import {
  neonSeparatorBonus,
  scoreNeonGreenPixel,
} from '@/lib/gif/neon-grid';

describe('scoreNeonGreenPixel', () => {
  it('scores #39FF14 highly and rejects yellow, cyan, and dim foliage', () => {
    expect(scoreNeonGreenPixel(0x39, 0xff, 0x14, 255)).toBeGreaterThan(0.85);
    expect(scoreNeonGreenPixel(70, 230, 40, 255)).toBeGreaterThan(0.55);
    expect(scoreNeonGreenPixel(230, 240, 40, 255)).toBe(0);
    expect(scoreNeonGreenPixel(40, 90, 40, 255)).toBe(0);
    expect(scoreNeonGreenPixel(0x39, 0xff, 0x14, 0)).toBe(0);
  });
});

describe('neonSeparatorBonus', () => {
  it('rewards an isolated neon line and ignores a generally green field', () => {
    expect(neonSeparatorBonus(0.9, 0.8, 0.05, 4)).toBeGreaterThan(70);
    expect(neonSeparatorBonus(0.2, 0.3, 0.28, 8)).toBe(0);
    expect(neonSeparatorBonus(0.5, 0.4, 0.38, 6)).toBe(0);
  });
});
