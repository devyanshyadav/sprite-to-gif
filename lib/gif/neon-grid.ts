/** Prompt-builder grid ink: neon green #39FF14, including JPEG-softened variants. */

const TARGET_R = 0x39;
const TARGET_G = 0xff;
const TARGET_B = 0x14;

/** 0–1 score. Rejects yellow, cyan, and dim foliage that is not grid ink. */
export function scoreNeonGreenPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  if (a < 32) return 0;
  const rival = Math.max(r, b);
  const lead = g - rival;
  if (g < 120 || lead < 22) return 0;

  const dist =
    Math.abs(r - TARGET_R) + Math.abs(g - TARGET_G) + Math.abs(b - TARGET_B);
  if (dist > 240 && lead < 48) return 0;

  const distScore = Math.max(0, 1 - dist / 240);
  const leadScore = Math.min(1, lead / 80);
  const greenShare = g / (r + g + b + 1);
  const shareScore = Math.min(1, Math.max(0, (greenShare - 0.42) / 0.28));
  return distScore * 0.46 + leadScore * 0.28 + shareScore * 0.26;
}

export const NEON_HIT_SCORE = 0.4;

/**
 * Bonus added to a separator column/row when it is a real neon grid line:
 * most pixels match, and the line is greener than the cells beside it.
 * Returns 0 when the sheet is just generally green.
 */
export function neonSeparatorBonus(
  coverage: number,
  affinity: number,
  neighborAffinity: number,
  colStd: number,
): number {
  const isolated = affinity - neighborAffinity;
  const solidLine = coverage >= 0.72 && affinity >= 0.22;
  const distinctLine =
    coverage >= 0.48 && affinity >= 0.2 && isolated >= 0.07;
  if (!solidLine && !distinctLine) return 0;

  const uniformity = 0.6 + 0.4 * (1 - Math.min(1, colStd / 42));
  const isolation = solidLine ? 1 : Math.min(1.35, 0.75 + isolated * 2.2);
  return (42 + 64 * affinity * Math.min(1, coverage)) * uniformity * isolation;
}
