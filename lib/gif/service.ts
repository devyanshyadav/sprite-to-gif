import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { GIF_ENCODE_MAX_COLORS, GIF_ENCODE_SCALE } from '@/lib/constants';
import { enhanceFrameRgba } from '@/lib/gif/clarity-pass';
import { buildPlaybackSequence } from '@/lib/gif/playback-sequence';
import {
  NEON_HIT_SCORE,
  neonSeparatorBonus,
  scoreNeonGreenPixel,
} from '@/lib/gif/neon-grid';
import { createPreviewUrl } from '@/lib/media/preview-url';
import type {
  FrameSlice,
  GridConfig,
  GifOptions,
  ContainerDetectionDiagnostics,
} from '@/lib/types';

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMAD(values: number[], median?: number): number {
  if (values.length === 0) return 0;
  const med = median ?? getMedian(values);
  const absDevs = values.map((v) => Math.abs(v - med));
  return getMedian(absDevs);
}

interface BackgroundSignature {
  r: number;
  g: number;
  b: number;
  a: number;
  isTransparent: boolean;
}

/**
 * Samples the outer perimeter and corners of the image to determine the dominant
 * background/gutter color or transparency state.
 */
function sampleBackgroundSignature(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): BackgroundSignature {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const as: number[] = [];

  const stepX = Math.max(1, Math.floor(width / 64));
  const stepY = Math.max(1, Math.floor(height / 64));

  const pushPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    rs.push(rgba[idx]);
    gs.push(rgba[idx + 1]);
    bs.push(rgba[idx + 2]);
    as.push(rgba[idx + 3]);
  };

  for (let x = 0; x < width; x += stepX) {
    pushPixel(x, 0);
    pushPixel(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    pushPixel(0, y);
    pushPixel(width - 1, y);
  }

  const medA = getMedian(as);
  return {
    r: getMedian(rs),
    g: getMedian(gs),
    b: getMedian(bs),
    a: medA,
    isTransparent: medA < 32,
  };
}

interface AxisProfile {
  grad: Float64Array;
  longDiff: Float64Array;
  colStd: Float64Array;
  bgAffinity: Float64Array;
  neonAffinity: Float64Array;
  neonCoverage: Float64Array;
  sepSignal: Float64Array;
  meanR: Float64Array;
  meanG: Float64Array;
  meanB: Float64Array;
  meanA: Float64Array;
  isTransparentBg: boolean;
  length: number;
}

function profileColorDist(
  profile: AxisProfile,
  i: number,
  j: number
): number {
  return (
    (Math.abs(profile.meanR[i] - profile.meanR[j]) +
      Math.abs(profile.meanG[i] - profile.meanG[j]) +
      Math.abs(profile.meanB[i] - profile.meanB[j]) +
      Math.abs(profile.meanA[i] - profile.meanA[j]) * 0.5) /
    3
  );
}

/**
 * Computes multi-channel 1D profiles along X (columns) or Y (rows):
 * - Perceptual + Alpha transverse gradient
 * - Longitudinal continuity (smoothness along the divider line)
 * - Color + Alpha standard deviation
 * - Background color/transparency affinity
 */
function computeAxisProfile(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  axis: 'x' | 'y',
  bgSig: BackgroundSignature,
  crossStart?: number,
  crossEnd?: number
): AxisProfile {
  const length = axis === 'x' ? width : height;
  const fullCross = axis === 'x' ? height : width;
  const cStart =
    crossStart !== undefined
      ? Math.max(0, Math.min(fullCross - 1, crossStart))
      : 0;
  const cEnd =
    crossEnd !== undefined
      ? Math.max(cStart + 1, Math.min(fullCross, crossEnd + 1))
      : fullCross;
  const cross = Math.max(1, cEnd - cStart);

  const grad = new Float64Array(length);
  const longDiff = new Float64Array(length);
  const colStd = new Float64Array(length);
  const bgAffinity = new Float64Array(length);
  const neonAffinity = new Float64Array(length);
  const neonCoverage = new Float64Array(length);
  const sepSignal = new Float64Array(length);
  const meanRArr = new Float64Array(length);
  const meanGArr = new Float64Array(length);
  const meanBArr = new Float64Array(length);
  const meanAArr = new Float64Array(length);

  // 1. Transverse gradient |I(p) - I(p-1)| with perceptual + alpha weighting
  for (let p = 1; p < length; p++) {
    let diffSum = 0;
    for (let c = cStart; c < cEnd; c++) {
      const idx1 = axis === 'x' ? (c * width + p) * 4 : (p * width + c) * 4;
      const idx0 =
        axis === 'x' ? (c * width + (p - 1)) * 4 : ((p - 1) * width + c) * 4;

      const dR = Math.abs(rgba[idx1] - rgba[idx0]);
      const dG = Math.abs(rgba[idx1 + 1] - rgba[idx0 + 1]);
      const dB = Math.abs(rgba[idx1 + 2] - rgba[idx0 + 2]);
      const dA = Math.abs(rgba[idx1 + 3] - rgba[idx0 + 3]);

      // Weight green/luma and alpha edges strongly
      diffSum += 0.299 * dR + 0.587 * dG + 0.114 * dB + dA * 0.65;
    }
    grad[p] = diffSum / cross;
  }

  // 2. Longitudinal smoothness, color+alpha std, and background affinity
  for (let p = 0; p < length; p++) {
    let lDiffSum = 0;
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumA = 0;
    let sumSqR = 0,
      sumSqG = 0,
      sumSqB = 0,
      sumSqA = 0;
    let bgMatchCount = 0;
    let neonSum = 0;
    let neonHits = 0;

    for (let c = cStart; c < cEnd; c++) {
      const idx = axis === 'x' ? (c * width + p) * 4 : (p * width + c) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];

      sumR += r;
      sumG += g;
      sumB += b;
      sumA += a;
      sumSqR += r * r;
      sumSqG += g * g;
      sumSqB += b * b;
      sumSqA += a * a;

      if (bgSig.isTransparent) {
        if (a < 28) bgMatchCount++;
      } else {
        const dist =
          (Math.abs(r - bgSig.r) +
            Math.abs(g - bgSig.g) +
            Math.abs(b - bgSig.b)) /
          3;
        if (dist < 14 && Math.abs(a - bgSig.a) < 20) bgMatchCount++;
      }

      const neonScore = scoreNeonGreenPixel(r, g, b, a);
      neonSum += neonScore;
      if (neonScore >= NEON_HIT_SCORE) neonHits += 1;

      if (c > cStart) {
        const prevIdx =
          axis === 'x' ? ((c - 1) * width + p) * 4 : (p * width + (c - 1)) * 4;
        lDiffSum +=
          (Math.abs(r - rgba[prevIdx]) +
            Math.abs(g - rgba[prevIdx + 1]) +
            Math.abs(b - rgba[prevIdx + 2]) +
            Math.abs(a - rgba[prevIdx + 3])) /
          4;
      }
    }

    longDiff[p] = cross > 1 ? lDiffSum / (cross - 1) : 0;
    bgAffinity[p] = bgMatchCount / cross;
    neonAffinity[p] = neonSum / cross;
    neonCoverage[p] = neonHits / cross;

    const meanR = sumR / cross;
    const meanG = sumG / cross;
    const meanB = sumB / cross;
    const meanA = sumA / cross;
    meanRArr[p] = meanR;
    meanGArr[p] = meanG;
    meanBArr[p] = meanB;
    meanAArr[p] = meanA;

    const stdR = Math.sqrt(Math.max(0, sumSqR / cross - meanR * meanR));
    const stdG = Math.sqrt(Math.max(0, sumSqG / cross - meanG * meanG));
    const stdB = Math.sqrt(Math.max(0, sumSqB / cross - meanB * meanB));
    const stdA = Math.sqrt(Math.max(0, sumSqA / cross - meanA * meanA));

    // If mostly transparent line, std is near zero
    colStd[p] = meanA < 12 ? stdA * 0.25 : (stdR + stdG + stdB + stdA * 0.5) / 3.5;
  }

  // 3. Combined separator signal: sharp transverse edge OR localized contrasting gutter channel
  for (let p = 1; p < length - 1; p++) {
    let minSmooth = Infinity;
    let minStd = Infinity;
    let maxBg = 0;

    for (let d = Math.max(0, p - 2); d <= Math.min(length - 1, p + 2); d++) {
      if (longDiff[d] < minSmooth) minSmooth = longDiff[d];
      if (colStd[d] < minStd) minStd = colStd[d];
      if (bgAffinity[d] > maxBg) maxBg = bgAffinity[d];
    }

    const localGrad = Math.max(grad[p], (grad[p - 1] + grad[p + 1]) * 0.5);
    const stdBoost = minStd < 12 ? 1.45 : minStd < 22 ? 1.2 : 1.0;
    const bgBoost = bgSig.isTransparent ? 1.0 + 0.65 * Math.pow(maxBg, 2) : 1.0;

    // Measure color contrast against surrounding cell interior (±10px away) so flat studio
    // backgrounds inside cells never trigger a false gutter bonus
    const refL = Math.max(0, p - 10);
    const refR = Math.min(length - 1, p + 10);
    const contrastL =
      (Math.abs(meanRArr[p] - meanRArr[refL]) +
        Math.abs(meanGArr[p] - meanGArr[refL]) +
        Math.abs(meanBArr[p] - meanBArr[refL])) /
      3;
    const contrastR =
      (Math.abs(meanRArr[p] - meanRArr[refR]) +
        Math.abs(meanGArr[p] - meanGArr[refR]) +
        Math.abs(meanBArr[p] - meanBArr[refR])) /
      3;
    const localLineContrast = Math.max(contrastL, contrastR);
    const neighborAffinity = Math.max(
      neonAffinity[refL],
      neonAffinity[refR],
    );
    const neonLineBonus = neonSeparatorBonus(
      neonCoverage[p],
      neonAffinity[p],
      neighborAffinity,
      colStd[p],
    );

    const flatGutterBonus =
      neonLineBonus > 0
        ? neonLineBonus
        : bgSig.isTransparent && bgAffinity[p] > 0.85 && colStd[p] < 9.0
          ? 22.0 * bgAffinity[p]
          : longDiff[p] < 3.5 && colStd[p] < 9.5 && localLineContrast >= 6.0
            ? Math.min(20.0, localLineContrast * 1.1) * (1.0 - colStd[p] / 10.5)
            : 0;

    sepSignal[p] =
      localGrad / (1.0 + 0.11 * minSmooth) * stdBoost * bgBoost +
      flatGutterBonus;
  }

  let strongNeonLines = 0;
  for (let p = 0; p < length; p++) {
    if (neonCoverage[p] >= 0.55 && neonAffinity[p] >= 0.22) strongNeonLines += 1;
  }
  if (strongNeonLines >= 3) {
    for (let p = 1; p < length - 1; p++) {
      if (neonCoverage[p] < 0.32) sepSignal[p] *= 0.28;
    }
  }

  return {
    grad,
    longDiff,
    colStd,
    bgAffinity,
    neonAffinity,
    neonCoverage,
    sepSignal,
    meanR: meanRArr,
    meanG: meanGArr,
    meanB: meanBArr,
    meanA: meanAArr,
    isTransparentBg: bgSig.isTransparent,
    length,
  };
}

/**
 * Uses 1D normalized autocorrelation on the separator signal to discover the
 * dominant repeating period (pitch) along an axis.
 */
function estimateFundamentalPitch(
  sepSignal: Float64Array,
  leftBound: number,
  rightBound: number,
  minCells = 2,
  maxCells = 20
): { estimatedCount: number; confidence: number } {
  const span = rightBound - leftBound;
  if (span < 32) return { estimatedCount: 1, confidence: 0 };

  const minLag = Math.max(16, Math.floor(span / maxCells));
  const maxLag = Math.floor(span / minCells);

  // Mean-center and clamp extreme spikes for clean autocorrelation
  const subLen = span + 1;
  const centered = new Float64Array(subLen);
  let mean = 0;
  for (let i = 0; i < subLen; i++) {
    mean += sepSignal[leftBound + i];
  }
  mean /= subLen;

  let energy = 0;
  for (let i = 0; i < subLen; i++) {
    const v = Math.max(0, sepSignal[leftBound + i] - mean);
    centered[i] = v;
    energy += v * v;
  }

  if (energy < 1e-3) return { estimatedCount: 1, confidence: 0 };

  let bestLag = minLag;
  let bestCorr = -1;

  const corrProfile = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const count = subLen - lag;
    for (let i = 0; i < count; i++) {
      sum += centered[i] * centered[i + lag];
    }
    // Harmonic comb verification: check multiples of lag (2*lag, 3*lag)
    const normCorr = (sum / count) / (energy / subLen);
    corrProfile[lag] = normCorr;
  }

  for (let lag = minLag; lag <= maxLag; lag++) {
    let harmonicScore = corrProfile[lag];
    let harmonics = 1;
    if (lag * 2 <= maxLag) {
      harmonicScore += 0.5 * corrProfile[lag * 2];
      harmonics += 0.5;
    }
    if (lag * 3 <= maxLag) {
      harmonicScore += 0.25 * corrProfile[lag * 3];
      harmonics += 0.25;
    }
    const finalScore = harmonicScore / harmonics;
    if (finalScore > bestCorr) {
      bestCorr = finalScore;
      bestLag = lag;
    }
  }

  const estimatedCount = Math.max(1, Math.round(span / bestLag));
  return {
    estimatedCount,
    confidence: Math.min(1, Math.max(0, bestCorr)),
  };
}

/**
 * Detects outer background padding (up to 16% of image dimension) AND steps inward
 * past any multi-pixel outer border outline frame or transparent margin.
 * Never strips opaque studio background when cells extend directly to the canvas edge.
 */
function detectOuterBounds(
  profile: AxisProfile,
  edgeThresh: number
): { leftBound: number; rightBound: number } {
  const { grad, longDiff, colStd, bgAffinity, isTransparentBg, length } = profile;
  const maxMargin = Math.max(8, Math.floor(length * 0.16));

  let leftBound = 0;
  // 1. Strip pure transparent outer margin
  if (isTransparentBg) {
    while (
      leftBound < maxMargin &&
      bgAffinity[leftBound] > 0.92 &&
      colStd[leftBound] < 7.5
    ) {
      leftBound++;
    }
  }

  // 2. Check for an explicit outer frame border line or solid outer margin within maxMargin
  for (let x = Math.max(1, leftBound); x < maxMargin; x++) {
    const outerStds: number[] = [];
    for (let k = 0; k < x; k++) outerStds.push(colStd[k]);
    const isOuterFlat = x <= 5 || getMedian(outerStds) < 9.0;
    const isStraightEdge =
      grad[x] >= edgeThresh && (longDiff[x] < 6.5 || longDiff[x - 1] < 6.5);
    const refIn = Math.min(length - 1, x + 6);
    const outerColorDiff = profileColorDist(profile, Math.max(0, x - 1), refIn);
    if (isOuterFlat && isStraightEdge && (outerColorDiff >= 12 || isTransparentBg)) {
      leftBound = x;
    }
  }

  // Step through contiguous high-gradient border outline pixels right at leftBound (max 4px)
  if (leftBound > 0) {
    for (let s = 0; s < 4; s++) {
      const refIn = Math.min(length - 1, leftBound + 6);
      if (
        leftBound < maxMargin &&
        grad[leftBound] >= edgeThresh &&
        profileColorDist(profile, leftBound, refIn) >= 12
      ) {
        leftBound++;
      } else {
        break;
      }
    }
  }

  let rightBound = length - 1;
  if (isTransparentBg) {
    while (
      rightBound > length - maxMargin &&
      bgAffinity[rightBound] > 0.92 &&
      colStd[rightBound] < 7.5
    ) {
      rightBound--;
    }
  }

  for (let x = rightBound; x > length - maxMargin; x--) {
    const outerStds: number[] = [];
    for (let k = x; k < length; k++) outerStds.push(colStd[k]);
    const isOuterFlat = length - x <= 5 || getMedian(outerStds) < 9.0;
    const isStraightEdge =
      grad[x] >= edgeThresh &&
      (longDiff[x] < 6.5 || longDiff[Math.max(0, x - 1)] < 6.5);
    const refIn = Math.max(0, x - 7);
    const outerColorDiff = profileColorDist(profile, x, refIn);
    if (isOuterFlat && isStraightEdge && (outerColorDiff >= 12 || isTransparentBg)) {
      rightBound = x - 1;
    }
  }

  if (rightBound < length - 1) {
    for (let s = 0; s < 4; s++) {
      const refIn = Math.max(0, rightBound - 6);
      if (
        rightBound > length - maxMargin &&
        rightBound + 1 < length &&
        grad[rightBound + 1] >= edgeThresh &&
        profileColorDist(profile, rightBound, refIn) >= 12
      ) {
        rightBound--;
      } else {
        break;
      }
    }
  }

  return { leftBound, rightBound };
}

/**
 * Expands around a detected separator peak to capture ONLY the actual divider line
 * (or gutter + tight 1-3px border outline), stopping immediately at the cell interior
 * so uniform studio backgrounds inside frames are never eaten.
 */
function findGutterAndOutlineBand(
  profile: AxisProfile,
  peakIdx: number,
  sMin: number,
  sMax: number,
  edgeThresh: number,
  stdThresh: number,
  maxRadius = 14
): { start: number; end: number } {
  const {
    grad,
    longDiff,
    colStd,
    bgAffinity,
    neonAffinity,
    neonCoverage,
    isTransparentBg,
    length,
  } = profile;

  const refDist = Math.min(14, Math.max(6, maxRadius));
  const leftRef = Math.max(0, peakIdx - refDist);
  const rightRef = Math.min(length - 1, peakIdx + refDist);

  // 1. Locate the exact divider core pixel within [peakIdx - 3 .. peakIdx + 3]
  let coreIdx = peakIdx;
  let bestCoreScore = -1e9;
  const cMin = Math.max(sMin, peakIdx - 5);
  const cMax = Math.min(sMax, peakIdx + 5);
  for (let k = cMin; k <= cMax; k++) {
    const contrastL = profileColorDist(profile, k, leftRef);
    const contrastR = profileColorDist(profile, k, rightRef);
    const score =
      (contrastL + contrastR) * 0.5 -
      colStd[k] * 0.8 -
      longDiff[k] * 1.2 +
      neonCoverage[k] * 70 +
      neonAffinity[k] * 24;
    if (score > bestCoreScore) {
      bestCoreScore = score;
      coreIdx = k;
    }
  }

  let gLeft = coreIdx;
  let gRight = coreIdx;

  const neonCore = neonCoverage[coreIdx] >= 0.45 || neonAffinity[coreIdx] >= 0.34;

  const scanLeftLimit = Math.max(sMin, coreIdx - maxRadius);
  for (let x = coreIdx - 1; x >= scanLeftLimit; x--) {
    if (neonCore && (neonCoverage[x] >= 0.28 || neonAffinity[x] >= 0.22)) {
      gLeft = x;
      continue;
    }
    if (isTransparentBg && bgAffinity[coreIdx] > 0.85) {
      if (bgAffinity[x] > 0.85 && colStd[x] < stdThresh) {
        gLeft = x;
        continue;
      }
      break;
    }
    const dCore = profileColorDist(profile, x, coreIdx);
    const dRef = profileColorDist(profile, x, leftRef);
    if (
      colStd[x] < stdThresh &&
      longDiff[x] < 8.0 &&
      dCore <= 15 &&
      (dCore + 3 < dRef || colStd[leftRef] > 18)
    ) {
      gLeft = x;
    } else {
      break;
    }
  }

  const scanRightLimit = Math.min(sMax, coreIdx + maxRadius);
  for (let x = coreIdx + 1; x <= scanRightLimit; x++) {
    if (neonCore && (neonCoverage[x] >= 0.28 || neonAffinity[x] >= 0.22)) {
      gRight = x;
      continue;
    }
    if (isTransparentBg && bgAffinity[coreIdx] > 0.85) {
      if (bgAffinity[x] > 0.85 && colStd[x] < stdThresh) {
        gRight = x;
        continue;
      }
      break;
    }
    const dCore = profileColorDist(profile, x, coreIdx);
    const dRef = profileColorDist(profile, x, rightRef);
    if (
      colStd[x] < stdThresh &&
      longDiff[x] < 8.0 &&
      dCore <= 15 &&
      (dCore + 3 < dRef || colStd[rightRef] > 18)
    ) {
      gRight = x;
    } else {
      break;
    }
  }

  // 3. Optional tight (1-3px) secondary border outline ring immediately adjacent to the gutter
  // (only if its color contrasts sharply with the cell interior and has a sharp outer edge)
  const baseLeft = gLeft;
  for (let x = baseLeft - 1; x >= Math.max(sMin, baseLeft - 3); x--) {
    const dRef = profileColorDist(profile, x, leftRef);
    const hasOuterEdge =
      grad[x] >= edgeThresh * 0.85 ||
      (x > 0 && grad[x - 1] >= edgeThresh * 0.85);
    if (
      colStd[x] < 10.5 &&
      longDiff[x] < 5.5 &&
      dRef > 22 &&
      hasOuterEdge
    ) {
      gLeft = x;
    } else {
      break;
    }
  }

  const baseRight = gRight;
  for (let x = baseRight + 1; x <= Math.min(sMax, baseRight + 3); x++) {
    const dRef = profileColorDist(profile, x, rightRef);
    const hasOuterEdge =
      grad[x] >= edgeThresh * 0.85 ||
      (x + 1 < length && grad[x + 1] >= edgeThresh * 0.85);
    if (
      colStd[x] < 10.5 &&
      longDiff[x] < 5.5 &&
      dRef > 22 &&
      hasOuterEdge
    ) {
      gRight = x;
    } else {
      break;
    }
  }

  return { start: gLeft, end: gRight };
}

/**
 * Viterbi Dynamic Programming solver: selects the globally optimal chain of n-1
 * separator bands with elastic L1/Huber pitch regularization.
 */
function viterbiGutters(
  profile: AxisProfile,
  left: number,
  right: number,
  n: number,
  edgeThresh: number,
  stdThresh: number
): { gutters: Array<{ start: number; end: number }>; scores: number[] } {
  const { sepSignal: sep } = profile;
  const ideal = (right - left) / n;
  const minStep = Math.max(16, Math.floor(ideal * 0.45));
  const maxStep = Math.floor(ideal * 1.58);
  const maxBandRad = Math.min(16, Math.max(6, Math.floor(ideal * 0.12)));

  const band = (x: number) =>
    findGutterAndOutlineBand(
      profile,
      x,
      Math.max(left, x - maxBandRad),
      Math.min(right, x + maxBandRad),
      edgeThresh,
      stdThresh,
      maxBandRad
    );

  // Huber-style elastic penalty: quadratic for small deviations, linear for larger ones
  const reg = (w: number) => {
    const rel = Math.abs(w - ideal) / Math.max(1, ideal);
    return rel <= 0.15
      ? 20 * rel * rel
      : 20 * (0.3 * rel - 0.0225);
  };

  const set = new Set<number>();
  for (let x = left + minStep; x <= right - minStep; x++) {
    if (sep[x] >= sep[x - 1] && sep[x] >= sep[x + 1] && sep[x] > 4.5) {
      set.add(x);
    }
  }
  for (let k = 1; k < n; k++) set.add(Math.round(left + k * ideal));

  const cands = Array.from(set).sort((a, b) => a - b);
  const bands = cands.map(band);
  const M = cands.length;
  const D = n - 1;
  const NEG = -1e9;
  const dp = Array.from({ length: D }, () => new Array<number>(M).fill(NEG));
  const par = Array.from({ length: D }, () => new Array<number>(M).fill(-1));

  for (let i = 0; i < M; i++) {
    const w = bands[i].start - left;
    if (w >= minStep && w <= maxStep) dp[0][i] = sep[cands[i]] - reg(w);
  }
  for (let k = 1; k < D; k++) {
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < i; j++) {
        if (dp[k - 1][j] <= -1e8) continue;
        const w = bands[i].start - bands[j].end;
        if (w < minStep || w > maxStep) continue;
        const sc = dp[k - 1][j] + sep[cands[i]] - reg(w);
        if (sc > dp[k][i]) {
          dp[k][i] = sc;
          par[k][i] = j;
        }
      }
    }
  }

  let last = -1;
  let best = NEG;
  for (let i = 0; i < M; i++) {
    if (dp[D - 1][i] <= -1e8) continue;
    const w = right - bands[i].end;
    if (w < minStep || w > maxStep) continue;
    const sc = dp[D - 1][i] - reg(w);
    if (sc > best) {
      best = sc;
      last = i;
    }
  }

  if (last === -1) {
    const xs = Array.from({ length: D }, (_, k) =>
      Math.round(left + (k + 1) * ideal)
    );
    return { gutters: xs.map(band), scores: xs.map((x) => sep[x] || 0) };
  }

  const idx = new Array<number>(D);
  for (let k = D - 1, c = last; k >= 0; k--) {
    idx[k] = c;
    c = par[k][c];
  }
  return {
    gutters: idx.map((i) => bands[i]),
    scores: idx.map((i) => sep[cands[i]]),
  };
}

/**
 * Elastic Dynamic-Programming + Autocorrelation solver that detects outer margins,
 * variable gutter + outline bands, and container intervals along an axis.
 */
function detectAxisIntervals(
  profile: AxisProfile,
  axis: 'x' | 'y',
  targetCount?: number,
  sensitivity = 50
): {
  count: number;
  score: number;
  outerStart: number;
  outerEnd: number;
  gutters: Array<{ start: number; end: number }>;
  intervals: Array<{ start: number; end: number }>;
} {
  const { sepSignal, length } = profile;

  const sensFactor = 1.0 - ((sensitivity - 50) / 100) * 0.45;
  const edgeThresh = Math.max(9.0, 15.5 * sensFactor);
  const stdThresh = Math.max(13.0, 21.0 / sensFactor);

  const { leftBound, rightBound } = detectOuterBounds(profile, edgeThresh);

  // Estimate periodic fundamental pitch using autocorrelation
  const pitchEst = estimateFundamentalPitch(
    sepSignal,
    leftBound,
    rightBound,
    1,
    axis === 'x' ? 20 : 12
  );

  const candidates: number[] = [];
  if (targetCount && targetCount >= 1) {
    candidates.push(targetCount);
  } else {
    const minN = axis === 'x' ? 2 : 1;
    const maxN = axis === 'x' ? 16 : 10;
    for (let n = minN; n <= maxN; n++) candidates.push(n);
    if (
      pitchEst.estimatedCount >= minN &&
      !candidates.includes(pitchEst.estimatedCount)
    ) {
      candidates.push(pitchEst.estimatedCount);
    }
  }

  const sepValues = Array.from(sepSignal);
  const medSep = getMedian(sepValues);
  const madSep = getMAD(sepValues, medSep);
  const strongSepThresh = Math.max(14.0, medSep + 4.2 * Math.max(2.5, madSep));
  const flatStdThresh = Math.min(stdThresh, 9.5);

  const rawPeaks: number[] = [];
  for (let x = leftBound + 12; x <= rightBound - 12; x++) {
    if (
      sepSignal[x] >= sepSignal[x - 1] &&
      sepSignal[x] >= sepSignal[x + 1] &&
      sepSignal[x] > Math.max(26.0, strongSepThresh * 1.05)
    ) {
      if (rawPeaks.length > 0 && x - rawPeaks[rawPeaks.length - 1] <= 12) {
        if (sepSignal[x] > sepSignal[rawPeaks[rawPeaks.length - 1]]) {
          rawPeaks[rawPeaks.length - 1] = x;
        }
      } else {
        rawPeaks.push(x);
      }
    }
  }

  if (targetCount && targetCount > 2 && !candidates.includes(targetCount - 1)) {
    candidates.push(targetCount - 1);
  }

  let bestN = candidates[0] || 1;
  let bestScore = -1e9;
  let bestOuterStart = leftBound;
  let bestOuterEnd = rightBound;
  let bestGutters: Array<{ start: number; end: number }> = [];
  let bestIntervals: Array<{ start: number; end: number }> = [
    { start: leftBound, end: rightBound },
  ];

  for (const n of candidates) {
    if (n === 1) {
      // Single-row/column candidate: penalize if strong internal periodic separators exist
      let internalPenalty = 0;
      for (const p of rawPeaks) {
        internalPenalty += sepSignal[p] * 0.4;
      }
      const singleScore = 12.0 - internalPenalty;
      if (singleScore > bestScore) {
        bestN = 1;
        bestScore = singleScore;
        bestOuterStart = leftBound;
        bestOuterEnd = rightBound;
        bestGutters = [];
        bestIntervals = [{ start: leftBound, end: rightBound }];
      }
      continue;
    }

    const isTrimFallback = Boolean(targetCount && n === targetCount - 1);
    const approxStep = (rightBound - leftBound) / n;
    const maxFrag = Math.floor(approxStep * 0.62);

    const leftOpts: Array<{ lb: number; pLeft: number | null }> = [
      { lb: leftBound, pLeft: null },
    ];
    const rightOpts: Array<{ rb: number; pRight: number | null }> = [
      { rb: rightBound, pRight: null },
    ];

    for (const p of rawPeaks) {
      if (p - leftBound >= 14 && p - leftBound <= maxFrag) {
        const band = findGutterAndOutlineBand(
          profile,
          p,
          Math.max(1, p - 14),
          Math.min(length - 2, p + 14),
          edgeThresh,
          flatStdThresh
        );
        leftOpts.push({ lb: band.end + 1, pLeft: p });
      }
      if (rightBound - p >= 14 && rightBound - p <= maxFrag) {
        const band = findGutterAndOutlineBand(
          profile,
          p,
          Math.max(1, p - 14),
          Math.min(length - 2, p + 14),
          edgeThresh,
          flatStdThresh
        );
        rightOpts.push({ rb: band.start - 1, pRight: p });
      }
    }

    for (const { lb, pLeft } of leftOpts) {
      for (const { rb, pRight } of rightOpts) {
        if (isTrimFallback && pLeft === null && pRight === null) continue;
        if (rb - lb < n * 20) continue;

        const vit = viterbiGutters(
          profile,
          lb,
          rb,
          n,
          edgeThresh,
          flatStdThresh
        );
        const gutters = vit.gutters;
        const divScores = vit.scores;

        if (gutters.length !== n - 1) continue;

        const intervals: Array<{ start: number; end: number }> = [];
        let prev = lb;
        for (const g of gutters) {
          intervals.push({ start: prev, end: Math.max(prev, g.start - 1) });
          prev = g.end + 1;
        }
        intervals.push({ start: prev, end: Math.max(prev, rb) });

        const widths = intervals.map((iv) => iv.end - iv.start + 1);
        const medW = getMedian(widths);
        const medDiv = getMedian(divScores);

        if (pLeft !== null) {
          const fragW = lb - leftBound;
          if (
            sepSignal[pLeft] < Math.max(28.0, medDiv * 0.5) ||
            fragW >= medW * 0.6 ||
            Math.abs(widths[0] - medW) / Math.max(1, medW) > 0.22
          ) {
            continue;
          }
        }
        if (pRight !== null) {
          const fragW = rightBound - rb;
          if (
            sepSignal[pRight] < Math.max(28.0, medDiv * 0.5) ||
            fragW >= medW * 0.6 ||
            Math.abs(widths[widths.length - 1] - medW) / Math.max(1, medW) > 0.22
          ) {
            continue;
          }
        }

        let missedPenalty = 0;
        for (const iv of intervals) {
          if (iv.end - iv.start > 20) {
            for (let x = iv.start + 8; x <= iv.end - 8; x++) {
              if (sepSignal[x] > strongSepThresh) {
                missedPenalty += sepSignal[x] * 0.5;
              }
            }
          }
        }

        let inconsistentPen = 0;
        for (const w of widths) {
          if (w < medW * 0.58 || w > medW * 1.48) {
            inconsistentPen += 120.0;
          }
        }

        const minDiv = Math.min(...divScores);
        const avgDiv = divScores.reduce((a, b) => a + b, 0) / divScores.length;
        const ideal = (rb - lb) / n;
        const varPen =
          intervals.reduce(
            (a, iv) =>
              a + 18 * Math.pow((iv.end - iv.start + 1 - ideal) / ideal, 2),
            0
          ) / intervals.length;

        // Autocorrelation harmonic agreement bonus
        const pitchBonus =
          !targetCount && Math.abs(n - pitchEst.estimatedCount) === 0
            ? 14.0 * pitchEst.confidence
            : 0;

        const score =
          avgDiv +
          0.45 * minDiv +
          pitchBonus -
          varPen -
          missedPenalty / n -
          inconsistentPen;

        if (score > bestScore) {
          bestScore = score;
          bestN = n;
          bestOuterStart = lb;
          bestOuterEnd = rb;
          bestGutters = gutters;
          bestIntervals = intervals;
        }
      }
    }
  }

  return {
    count: bestN,
    score: Math.round(bestScore * 10) / 10,
    outerStart: bestOuterStart,
    outerEnd: bestOuterEnd,
    gutters: bestGutters,
    intervals: bestIntervals,
  };
}

/**
 * 2D Per-Cell Residual Outline Stripper:
 * Strips ONLY residual 1-5px frame border lines right at the cell edge whose color
 * differs from the cell interior background. Never strips the cell's own studio background.
 */
function refineCellLocally(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  edgeThresh: number
): { x0: number; x1: number; y0: number; y1: number } {
  let rx0 = Math.max(0, Math.min(width - 1, x0));
  let rx1 = Math.max(0, Math.min(width - 1, x1));
  let ry0 = Math.max(0, Math.min(height - 1, y0));
  let ry1 = Math.max(0, Math.min(height - 1, y1));

  if (rx1 - rx0 < 24 || ry1 - ry0 < 24) {
    return { x0: rx0, x1: rx1, y0: ry0, y1: ry1 };
  }

  interface LineStat {
    std: number;
    grad: number;
    mR: number;
    mG: number;
    mB: number;
  }

  const rowStats = (
    y: number,
    prevY: number,
    ix0: number,
    ix1: number
  ): LineStat => {
    const n = Math.max(1, ix1 - ix0 + 1);
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumA = 0;
    let sqR = 0,
      sqG = 0,
      sqB = 0,
      sqA = 0;
    let gradSum = 0;
    for (let x = ix0; x <= ix1; x++) {
      const i = (y * width + x) * 4;
      const ip = (prevY * width + x) * 4;
      const r = rgba[i],
        g = rgba[i + 1],
        b = rgba[i + 2],
        a = rgba[i + 3];
      sumR += r;
      sumG += g;
      sumB += b;
      sumA += a;
      sqR += r * r;
      sqG += g * g;
      sqB += b * b;
      sqA += a * a;
      gradSum +=
        (Math.abs(r - rgba[ip]) +
          Math.abs(g - rgba[ip + 1]) +
          Math.abs(b - rgba[ip + 2]) +
          Math.abs(a - rgba[ip + 3])) /
        4;
    }
    const mR = sumR / n,
      mG = sumG / n,
      mB = sumB / n,
      mA = sumA / n;
    const std =
      mA < 12
        ? Math.sqrt(Math.max(0, sqA / n - mA * mA)) * 0.25
        : (Math.sqrt(Math.max(0, sqR / n - mR * mR)) +
          Math.sqrt(Math.max(0, sqG / n - mG * mG)) +
          Math.sqrt(Math.max(0, sqB / n - mB * mB))) /
        3;
    return { std, grad: gradSum / n, mR, mG, mB };
  };

  const colStats = (
    x: number,
    prevX: number,
    iy0: number,
    iy1: number
  ): LineStat => {
    const n = Math.max(1, iy1 - iy0 + 1);
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumA = 0;
    let sqR = 0,
      sqG = 0,
      sqB = 0,
      sqA = 0;
    let gradSum = 0;
    for (let y = iy0; y <= iy1; y++) {
      const i = (y * width + x) * 4;
      const ip = (y * width + prevX) * 4;
      const r = rgba[i],
        g = rgba[i + 1],
        b = rgba[i + 2],
        a = rgba[i + 3];
      sumR += r;
      sumG += g;
      sumB += b;
      sumA += a;
      sqR += r * r;
      sqG += g * g;
      sqB += b * b;
      sqA += a * a;
      gradSum +=
        (Math.abs(r - rgba[ip]) +
          Math.abs(g - rgba[ip + 1]) +
          Math.abs(b - rgba[ip + 2]) +
          Math.abs(a - rgba[ip + 3])) /
        4;
    }
    const mR = sumR / n,
      mG = sumG / n,
      mB = sumB / n,
      mA = sumA / n;
    const std =
      mA < 12
        ? Math.sqrt(Math.max(0, sqA / n - mA * mA)) * 0.25
        : (Math.sqrt(Math.max(0, sqR / n - mR * mR)) +
          Math.sqrt(Math.max(0, sqG / n - mG * mG)) +
          Math.sqrt(Math.max(0, sqB / n - mB * mB))) /
        3;
    return { std, grad: gradSum / n, mR, mG, mB };
  };

  const findWallTrim = (stats: LineStat[], maxTrim: number): number => {
    let bestD = 0;
    const targetEdge = Math.max(16.0, edgeThresh * 1.15);
    const refStats = stats.slice(maxTrim, stats.length);
    const refR = getMedian(refStats.map((s) => s.mR));
    const refG = getMedian(refStats.map((s) => s.mG));
    const refB = getMedian(refStats.map((s) => s.mB));

    for (let d = 1; d < maxTrim; d++) {
      if (stats[d].grad >= targetEdge) {
        let ok = true;
        for (let k = 0; k < d; k++) {
          const colorDiff =
            (Math.abs(stats[k].mR - refR) +
              Math.abs(stats[k].mG - refG) +
              Math.abs(stats[k].mB - refB)) /
            3;
          const isBorderLine =
            stats[k].std < 10.5 && colorDiff >= 14.0;
          if (!isBorderLine) {
            ok = false;
            break;
          }
        }
        if (ok) bestD = d;
      }
    }
    return bestD;
  };

  const maxTrim = 5;
  const totalDepth = 10;

  // 1. Top wall (ry0 inward, max 4px border trim)
  const ixPad = Math.max(2, Math.floor((rx1 - rx0) * 0.1));
  const ix0 = rx0 + ixPad;
  const ix1 = rx1 - ixPad;
  if (ix1 > ix0 + 4 && ry1 - ry0 > totalDepth * 2) {
    const stats: LineStat[] = [];
    for (let d = 0; d < totalDepth; d++) {
      const y = ry0 + d;
      const st = rowStats(y, d === 0 ? y : y - 1, ix0, ix1);
      stats.push({ ...st, grad: d === 0 ? 0 : st.grad });
    }
    ry0 += findWallTrim(stats, maxTrim);
  }

  // 2. Bottom wall (ry1 inward, max 4px border trim)
  if (ix1 > ix0 + 4 && ry1 - ry0 > totalDepth * 2) {
    const stats: LineStat[] = [];
    for (let d = 0; d < totalDepth; d++) {
      const y = ry1 - d;
      const st = rowStats(y, d === 0 ? y : y + 1, ix0, ix1);
      stats.push({ ...st, grad: d === 0 ? 0 : st.grad });
    }
    ry1 -= findWallTrim(stats, maxTrim);
  }

  // 3. Left wall (rx0 inward, max 4px border trim)
  const iyPad = Math.max(2, Math.floor((ry1 - ry0) * 0.1));
  const iy0 = ry0 + iyPad;
  const iy1 = ry1 - iyPad;
  if (iy1 > iy0 + 4 && rx1 - rx0 > totalDepth * 2) {
    const stats: LineStat[] = [];
    for (let d = 0; d < totalDepth; d++) {
      const x = rx0 + d;
      const st = colStats(x, d === 0 ? x : x - 1, iy0, iy1);
      stats.push({ ...st, grad: d === 0 ? 0 : st.grad });
    }
    rx0 += findWallTrim(stats, maxTrim);
  }

  // 4. Right wall (rx1 inward, max 4px border trim)
  if (iy1 > iy0 + 4 && rx1 - rx0 > totalDepth * 2) {
    const stats: LineStat[] = [];
    for (let d = 0; d < totalDepth; d++) {
      const x = rx1 - d;
      const st = colStats(x, d === 0 ? x : x + 1, iy0, iy1);
      stats.push({ ...st, grad: d === 0 ? 0 : st.grad });
    }
    rx1 -= findWallTrim(stats, maxTrim);
  }

  return { x0: rx0, x1: rx1, y0: ry0, y1: ry1 };
}

/**
 * Two-Stage Frame Normalization:
 * - Stage 1 (Primary — Uniform Frame Boundary Lock): When the detected frame boundaries
 *   are consistent across the sheet (width/height variation <= 5.5%), lock directly onto
 *   the detected frame borders without running object/subject saliency cropping.
 * - Stage 2 (Fallback — Dynamic Subject-Aware Alignment): Only when frame dimensions
 *   differ significantly across the sheet (> 5.5% variation), dynamically position the
 *   targetW × targetH window (Left/Center/Right, Top/Center/Bottom) on the oversized frames
 *   using 2D subject saliency.
 */
function alignAndStabilizeSlices(
  rgba: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  slices: FrameSlice[],
  bgSig: BackgroundSignature
): FrameSlice[] {
  if (slices.length <= 1) return slices;

  const widths = slices.map((s) => s.width);
  const heights = slices.map((s) => s.height);

  // Consistent output dimensions that fit 100% strictly inside every valid container without crossing borders
  const targetW = Math.max(4, Math.min(...widths));
  const targetH = Math.max(4, Math.min(...heights));
  const maxW = Math.max(...widths);
  const maxH = Math.max(...heights);
  const medW = getMedian(widths);
  const medH = getMedian(heights);

  const significantSlackX = Math.max(6, Math.round(medW * 0.055));
  const significantSlackY = Math.max(6, Math.round(medH * 0.055));

  const widthDiffersSignificantly = maxW - targetW > significantSlackX;
  const heightDiffersSignificantly = maxH - targetH > significantSlackY;

  // Stage 1 Fast Path: All frame boundaries are consistent in width and height.
  // Do NOT run object detection — preserve the exact detected frame boundaries!
  if (!widthDiffersSignificantly && !heightDiffersSignificantly) {
    return slices.map((s) => {
      const dx = Math.round((s.width - targetW) * 0.5);
      const dy = Math.round((s.height - targetH) * 0.5);
      return {
        ...s,
        x: Math.max(0, Math.min(imageWidth - targetW, s.x + dx)),
        y: Math.max(0, Math.min(imageHeight - targetH, s.y + dy)),
        width: targetW,
        height: targetH,
      };
    });
  }

  // Stage 2 Fallback: Frame dimensions differ significantly across the sheet.
  // Precompute center-focused Hanning window weights for oversized frames.
  const bellX = new Float64Array(targetW);
  for (let k = 0; k < targetW; k++) {
    const h =
      targetW > 1 ? 0.5 * (1 - Math.cos((2 * Math.PI * k) / (targetW - 1))) : 1;
    bellX[k] = 0.15 + 0.85 * h;
  }

  const bellY = new Float64Array(targetH);
  for (let k = 0; k < targetH; k++) {
    const h =
      targetH > 1 ? 0.5 * (1 - Math.cos((2 * Math.PI * k) / (targetH - 1))) : 1;
    bellY[k] = 0.15 + 0.85 * h;
  }

  const rawUx: number[] = [];
  const rawUy: number[] = [];
  const slacksX: number[] = [];
  const slacksY: number[] = [];

  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const w = s.width;
    const h = s.height;
    const sx = Math.max(0, w - targetW);
    const sy = Math.max(0, h - targetH);
    slacksX.push(sx);
    slacksY.push(sy);

    const useObjectX = widthDiffersSignificantly && sx > significantSlackX;
    const useObjectY = heightDiffersSignificantly && sy > significantSlackY;

    if (!useObjectX && !useObjectY) {
      rawUx.push(0.5);
      rawUy.push(0.5);
      continue;
    }

    // 1. Estimate local cell background color from perimeter pixels + global bgSig
    const bgRs: number[] = [bgSig.r];
    const bgGs: number[] = [bgSig.g];
    const bgBs: number[] = [bgSig.b];
    const stepX = Math.max(1, Math.floor(w / 16));
    const stepY = Math.max(1, Math.floor(h / 16));
    for (let dx = 0; dx < w; dx += stepX) {
      const iTop = (s.y * imageWidth + (s.x + dx)) * 4;
      const iBot = ((s.y + h - 1) * imageWidth + (s.x + dx)) * 4;
      bgRs.push(rgba[iTop], rgba[iBot]);
      bgGs.push(rgba[iTop + 1], rgba[iBot + 1]);
      bgBs.push(rgba[iTop + 2], rgba[iBot + 2]);
    }
    for (let dy = 0; dy < h; dy += stepY) {
      const iLeft = ((s.y + dy) * imageWidth + s.x) * 4;
      const iRight = ((s.y + dy) * imageWidth + (s.x + w - 1)) * 4;
      bgRs.push(rgba[iLeft], rgba[iRight]);
      bgGs.push(rgba[iLeft + 1], rgba[iRight + 1]);
      bgBs.push(rgba[iLeft + 2], rgba[iRight + 2]);
    }
    const cellBgR = getMedian(bgRs);
    const cellBgG = getMedian(bgGs);
    const cellBgB = getMedian(bgBs);

    // 2. Compute 2D subject saliency map (edge density + chromatic saturation + background contrast)
    const pixSal = new Float64Array(w * h);
    const salSample: number[] = [];

    const wallMaskX = new Float64Array(w);
    for (let dx = 0; dx < w; dx++) {
      const mLeft = dx / Math.max(1, w * 0.12);
      const mRight = (w - 1 - dx) / Math.max(1, w * 0.06);
      wallMaskX[dx] = Math.max(0.08, Math.min(1.0, Math.min(mLeft, mRight)));
    }

    const wallMaskY = new Float64Array(h);
    for (let dy = 0; dy < h; dy++) {
      const mTop = dy / Math.max(1, h * 0.08);
      const mBot = (h - 1 - dy) / Math.max(1, h * 0.08);
      wallMaskY[dy] = Math.max(0.2, Math.min(1.0, Math.min(mTop, mBot)));
    }

    for (let dy = 0; dy < h; dy++) {
      const wy = wallMaskY[dy];
      const yImg = s.y + dy;
      const yPrev = s.y + Math.max(0, dy - 1);

      for (let dx = 0; dx < w; dx++) {
        const xImg = s.x + dx;
        const xPrev = s.x + Math.max(0, dx - 1);

        const idx = (yImg * imageWidth + xImg) * 4;
        const idxL = (yImg * imageWidth + xPrev) * 4;
        const idxU = (yPrev * imageWidth + xImg) * 4;

        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        const a = rgba[idx + 3];

        if (bgSig.isTransparent && a < 20) {
          pixSal[dy * w + dx] = 0;
          continue;
        }

        const gx =
          (Math.abs(r - rgba[idxL]) +
            Math.abs(g - rgba[idxL + 1]) +
            Math.abs(b - rgba[idxL + 2]) +
            Math.abs(a - rgba[idxL + 3])) /
          3;
        const gy =
          (Math.abs(r - rgba[idxU]) +
            Math.abs(g - rgba[idxU + 1]) +
            Math.abs(b - rgba[idxU + 2]) +
            Math.abs(a - rgba[idxU + 3])) /
          3;

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC - minC;

        const cdist =
          bgSig.isTransparent
            ? a * 0.8
            : (Math.abs(r - cellBgR) +
              Math.abs(g - cellBgG) +
              Math.abs(b - cellBgB)) /
            3;

        const val =
          ((gx + gy) * 1.4 + sat * 0.65 + cdist * 0.45) *
          wallMaskX[dx] *
          wy;

        pixSal[dy * w + dx] = val;
        if ((dx + dy) % 3 === 0) salSample.push(val);
      }
    }

    const activeThresh = Math.max(4.0, getMedian(salSample) * 1.35);

    // 3. Project 1D column & row subject profiles weighted by cross-axis coverage
    if (useObjectX) {
      const colSal = new Float64Array(w);
      let sumColSal = 0;
      let sumWeightedX = 0;

      for (let dx = 0; dx < w; dx++) {
        let sum = 0;
        let activeCount = 0;
        for (let dy = 0; dy < h; dy++) {
          const v = pixSal[dy * w + dx];
          sum += v;
          if (v > activeThresh) activeCount++;
        }
        const cov = activeCount / Math.max(1, h);
        const weighted = (sum / Math.max(1, h)) * Math.pow(cov, 1.2);
        colSal[dx] = weighted;
        sumColSal += weighted;
        sumWeightedX += dx * weighted;
      }

      if (sumColSal > 1e-3) {
        let bestDx = Math.round(sx / 2);
        let bestEnergy = -1;
        for (let dx = 0; dx <= sx; dx++) {
          let e = 0;
          for (let k = 0; k < targetW; k++) {
            e += colSal[dx + k] * bellX[k];
          }
          if (e > bestEnergy) {
            bestEnergy = e;
            bestDx = dx;
          }
        }
        const comX = sumWeightedX / sumColSal;
        const dxCom = Math.max(0, Math.min(sx, comX - targetW / 2));
        rawUx.push((0.7 * bestDx + 0.3 * dxCom) / sx);
      } else {
        rawUx.push(0.5);
      }
    } else {
      rawUx.push(0.5);
    }

    if (useObjectY) {
      const rowSal = new Float64Array(h);
      let sumRowSal = 0;
      let sumWeightedY = 0;

      for (let dy = 0; dy < h; dy++) {
        let sum = 0;
        let activeCount = 0;
        const rowOff = dy * w;
        for (let dx = 0; dx < w; dx++) {
          const v = pixSal[rowOff + dx];
          sum += v;
          if (v > activeThresh) activeCount++;
        }
        const cov = activeCount / Math.max(1, w);
        const weighted = (sum / Math.max(1, w)) * Math.pow(cov, 1.2);
        rowSal[dy] = weighted;
        sumRowSal += weighted;
        sumWeightedY += dy * weighted;
      }

      if (sumRowSal > 1e-3) {
        let bestDy = Math.round(sy / 2);
        let bestEnergy = -1;
        for (let dy = 0; dy <= sy; dy++) {
          let e = 0;
          for (let k = 0; k < targetH; k++) {
            e += rowSal[dy + k] * bellY[k];
          }
          if (e > bestEnergy) {
            bestEnergy = e;
            bestDy = dy;
          }
        }
        const comY = sumWeightedY / sumRowSal;
        const dyCom = Math.max(0, Math.min(sy, comY - targetH / 2));
        rawUy.push((0.7 * bestDy + 0.3 * dyCom) / sy);
      } else {
        rawUy.push(0.5);
      }
    } else {
      rawUy.push(0.5);
    }
  }

  // 4. Temporal 3-frame trajectory smoothing to eliminate single-frame jitter while preserving subject motion
  return slices.map((s, i) => {
    const prevUx = i > 0 ? rawUx[i - 1] : rawUx[i];
    const nextUx = i + 1 < slices.length ? rawUx[i + 1] : rawUx[i];
    const medUx = getMedian([prevUx, rawUx[i], nextUx]);
    const ux = widthDiffersSignificantly ? 0.6 * rawUx[i] + 0.4 * medUx : 0.5;

    const prevUy = i > 0 ? rawUy[i - 1] : rawUy[i];
    const nextUy = i + 1 < slices.length ? rawUy[i + 1] : rawUy[i];
    const medUy = getMedian([prevUy, rawUy[i], nextUy]);
    const uy = heightDiffersSignificantly ? 0.6 * rawUy[i] + 0.4 * medUy : 0.5;

    const dx = Math.round(ux * slacksX[i]);
    const dy = Math.round(uy * slacksY[i]);

    const clampedX = Math.max(0, Math.min(imageWidth - targetW, s.x + dx));
    const clampedY = Math.max(0, Math.min(imageHeight - targetH, s.y + dy));

    return {
      ...s,
      x: clampedX,
      y: clampedY,
      width: targetW,
      height: targetH,
    };
  });
}

/**
 * Extracts raw RGBA pixel buffer from an HTMLImageElement.
 */
function getImageRgba(image: HTMLImageElement): Uint8ClampedArray | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

/**
 * Automatically detects the optimal (columns, rows) grid structure and container boundaries
 * using the Multi-Stage Computer Vision Container Detection Algorithm.
 */
export function autoDetectGridStructure(
  image: HTMLImageElement,
  sensitivity = 50
): {
  columns: number;
  rows: number;
  totalFrames: number;
  diagnostics: ContainerDetectionDiagnostics;
} {
  const W = image.naturalWidth;
  const H = image.naturalHeight;
  const rgba = getImageRgba(image);

  if (!rgba) {
    return {
      columns: 10,
      rows: 3,
      totalFrames: 30,
      diagnostics: {
        mode: 'smart-cv',
        detectedColumns: 10,
        detectedRows: 3,
        confidenceScore: 0,
        outerPadding: { left: 0, right: 0, top: 0, bottom: 0 },
        xGutters: [],
        yGutters: [],
        xIntervals: [],
        yIntervals: [],
        medianWidth: Math.round(W / 10),
        medianHeight: Math.round(H / 3),
      },
    };
  }

  const bgSig = sampleBackgroundSignature(rgba, W, H);
  const profileX = computeAxisProfile(rgba, W, H, 'x', bgSig);
  const profileY = computeAxisProfile(rgba, W, H, 'y', bgSig);

  const resX = detectAxisIntervals(profileX, 'x', undefined, sensitivity);
  const resY = detectAxisIntervals(profileY, 'y', undefined, sensitivity);

  const widths = resX.intervals.map((iv) => iv.end - iv.start + 1);
  const heights = resY.intervals.map((iv) => iv.end - iv.start + 1);

  const confidence = Math.min(
    99,
    Math.max(50, Math.round((resX.score + resY.score) / 3))
  );

  return {
    columns: resX.count,
    rows: resY.count,
    totalFrames: resX.count * resY.count,
    diagnostics: {
      mode: 'smart-cv',
      detectedColumns: resX.count,
      detectedRows: resY.count,
      confidenceScore: confidence,
      outerPadding: {
        left: resX.outerStart,
        right: Math.max(0, W - 1 - resX.outerEnd),
        top: resY.outerStart,
        bottom: Math.max(0, H - 1 - resY.outerEnd),
      },
      xGutters: resX.gutters,
      yGutters: resY.gutters,
      xIntervals: resX.intervals,
      yIntervals: resY.intervals,
      medianWidth: Math.round(getMedian(widths)),
      medianHeight: Math.round(getMedian(heights)),
    },
  };
}

/**
 * Helper to locally adapt 1D gutters within a cross-axis slice (used for both
 * per-row X-gutter adaptation and per-column Y-gutter adaptation).
 */
function adaptIntervalsAlongCrossSpan(
  rgba: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  axis: 'x' | 'y',
  bgSig: BackgroundSignature,
  crossStart: number,
  crossEnd: number,
  globalRes: ReturnType<typeof detectAxisIntervals>,
  edgeThresh: number
): Array<{ start: number; end: number }> {
  const axisLen = axis === 'x' ? imageWidth : imageHeight;
  if (crossEnd - crossStart < 20 || globalRes.gutters.length === 0) {
    return globalRes.intervals;
  }

  const localProf = computeAxisProfile(
    rgba,
    imageWidth,
    imageHeight,
    axis,
    bgSig,
    crossStart,
    crossEnd
  );

  const adaptedGutters: Array<{ start: number; end: number }> = [];
  for (const g of globalRes.gutters) {
    const gc = Math.round((g.start + g.end) / 2);
    // Prefer tight ±4px neighborhood around the global divider line so subject edges inside
    // the cell never hijack a straight grid divider
    const tightMin = Math.max(1, gc - 4);
    const tightMax = Math.min(axisLen - 2, gc + 4);
    let localPeak = gc;
    let maxSig = -1;
    for (let p = tightMin; p <= tightMax; p++) {
      if (localProf.sepSignal[p] > maxSig) {
        maxSig = localProf.sepSignal[p];
        localPeak = p;
      }
    }

    if (maxSig < 12.0) {
      const wideMin = Math.max(1, gc - 12);
      const wideMax = Math.min(axisLen - 2, gc + 12);
      for (let p = wideMin; p <= wideMax; p++) {
        if (localProf.sepSignal[p] > maxSig) {
          maxSig = localProf.sepSignal[p];
          localPeak = p;
        }
      }
    }

    const chosenPeak = maxSig >= 14.0 ? localPeak : gc;
    adaptedGutters.push(
      findGutterAndOutlineBand(
        localProf,
        chosenPeak,
        Math.max(1, chosenPeak - 10),
        Math.min(axisLen - 2, chosenPeak + 10),
        edgeThresh,
        9.5,
        10
      )
    );
  }

  let localOuterStart = globalRes.outerStart;
  if (globalRes.outerStart > 14) {
    const sMin = Math.max(1, globalRes.outerStart - 10);
    const sMax = Math.min(axisLen - 2, globalRes.outerStart + 10);
    let localPeak = globalRes.outerStart - 2;
    let maxSig = -1;
    for (let p = sMin; p <= sMax; p++) {
      if (localProf.sepSignal[p] > maxSig) {
        maxSig = localProf.sepSignal[p];
        localPeak = p;
      }
    }
    if (maxSig >= 20.0) {
      const band = findGutterAndOutlineBand(
        localProf,
        localPeak,
        Math.max(1, localPeak - 10),
        Math.min(axisLen - 2, localPeak + 10),
        edgeThresh,
        9.5,
        10
      );
      localOuterStart = band.end + 1;
    }
  }

  let localOuterEnd = globalRes.outerEnd;
  if (globalRes.outerEnd < axisLen - 15) {
    const sMin = Math.max(1, globalRes.outerEnd - 10);
    const sMax = Math.min(axisLen - 2, globalRes.outerEnd + 10);
    let localPeak = globalRes.outerEnd + 2;
    let maxSig = -1;
    for (let p = sMin; p <= sMax; p++) {
      if (localProf.sepSignal[p] > maxSig) {
        maxSig = localProf.sepSignal[p];
        localPeak = p;
      }
    }
    if (maxSig >= 20.0) {
      const band = findGutterAndOutlineBand(
        localProf,
        localPeak,
        Math.max(1, localPeak - 10),
        Math.min(axisLen - 2, localPeak + 10),
        edgeThresh,
        9.5,
        10
      );
      localOuterEnd = band.start - 1;
    }
  }

  const localIvs: Array<{ start: number; end: number }> = [];
  let prev = localOuterStart;
  for (const ag of adaptedGutters) {
    localIvs.push({ start: prev, end: Math.max(prev, ag.start - 1) });
    prev = ag.end + 1;
  }
  localIvs.push({ start: prev, end: Math.max(prev, localOuterEnd) });
  return localIvs;
}

/**
 * Computes frame slicing coordinates using either:
 * 1. 'smart-cv': Multi-Stage Computer Vision Container Detection (handles variable padding,
 *    thick/thin container outlines, transparent sprites, and non-uniform widths/heights), OR
 * 2. 'uniform-grid': Classic mathematical division with manual margins and gaps.
 */
export function calculateFrameSlicesWithCV(
  image: HTMLImageElement,
  config: GridConfig
): { slices: FrameSlice[]; diagnostics: ContainerDetectionDiagnostics } {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;
  const {
    slicingMode = 'smart-cv',
    columns,
    rows,
    totalFrames,
    cropOffsetX = 0,
    cropOffsetY = 0,
    cropMarginRight = 0,
    cropMarginBottom = 0,
    cellInset = 2,
    sensitivity = 50,
    perCellRefine = true,
    order = 'row-major',
  } = config;

  const validCols = Math.max(1, columns);
  const validRows = Math.max(1, rows);

  if (slicingMode === 'smart-cv') {
    const rgba = getImageRgba(image);
    if (rgba) {
      const bgSig = sampleBackgroundSignature(rgba, imageWidth, imageHeight);
      const profileX = computeAxisProfile(rgba, imageWidth, imageHeight, 'x', bgSig);
      const profileY = computeAxisProfile(rgba, imageWidth, imageHeight, 'y', bgSig);

      const resX = detectAxisIntervals(profileX, 'x', validCols, sensitivity);
      const resY = detectAxisIntervals(profileY, 'y', validRows, sensitivity);

      const actualCols = Math.max(1, resX.intervals.length);
      const actualRows = Math.max(1, resY.intervals.length);
      const actualMaxPossible = actualCols * actualRows;
      const actualEffectiveTotal = Math.min(
        totalFrames > 0 ? totalFrames : actualMaxPossible,
        actualMaxPossible
      );

      const sensFactor = 1.0 - ((sensitivity - 50) / 100) * 0.45;
      const edgeThresh = Math.max(9.0, 15.5 * sensFactor);

      // Bidirectional 2D Mesh Adaptation:
      // 1. Adapt X-intervals locally per row
      const rowXIntervals: Array<Array<{ start: number; end: number }>> = [];
      for (let r = 0; r < actualRows; r++) {
        const yIv = resY.intervals[r];
        if (!perCellRefine || !yIv) {
          rowXIntervals.push(resX.intervals);
        } else {
          rowXIntervals.push(
            adaptIntervalsAlongCrossSpan(
              rgba,
              imageWidth,
              imageHeight,
              'x',
              bgSig,
              yIv.start,
              yIv.end,
              resX,
              edgeThresh
            )
          );
        }
      }

      // 2. Adapt Y-intervals locally per column
      const colYIntervals: Array<Array<{ start: number; end: number }>> = [];
      for (let c = 0; c < actualCols; c++) {
        const xIv = resX.intervals[c];
        if (!perCellRefine || !xIv) {
          colYIntervals.push(resY.intervals);
        } else {
          colYIntervals.push(
            adaptIntervalsAlongCrossSpan(
              rgba,
              imageWidth,
              imageHeight,
              'y',
              bgSig,
              xIv.start,
              xIv.end,
              resY,
              edgeThresh
            )
          );
        }
      }

      const rawSlices: FrameSlice[] = [];
      const addCell = (r: number, c: number, index: number) => {
        const xIv = (rowXIntervals[r] && rowXIntervals[r][c]) ||
          resX.intervals[c] || {
          start: Math.round((c * imageWidth) / actualCols),
          end: Math.round(((c + 1) * imageWidth) / actualCols) - 1,
        };
        const yIv = (colYIntervals[c] && colYIntervals[c][r]) ||
          resY.intervals[r] || {
          start: Math.round((r * imageHeight) / actualRows),
          end: Math.round(((r + 1) * imageHeight) / actualRows) - 1,
        };

        let { x0, x1, y0, y1 } = {
          x0: xIv.start,
          x1: xIv.end,
          y0: yIv.start,
          y1: yIv.end,
        };

        if (perCellRefine) {
          const refined = refineCellLocally(
            rgba,
            imageWidth,
            imageHeight,
            x0,
            x1,
            y0,
            y1,
            edgeThresh
          );
          x0 = refined.x0;
          x1 = refined.x1;
          y0 = refined.y0;
          y1 = refined.y1;
        }

        const inset = Math.max(0, cellInset);
        const finalX = Math.min(
          imageWidth - 2,
          Math.max(0, x0 + inset + cropOffsetX)
        );
        const finalY = Math.min(
          imageHeight - 2,
          Math.max(0, y0 + inset + cropOffsetY)
        );
        const finalW = Math.max(
          4,
          Math.min(
            imageWidth - finalX,
            x1 - x0 + 1 - inset * 2 - cropMarginRight
          )
        );
        const finalH = Math.max(
          4,
          Math.min(
            imageHeight - finalY,
            y1 - y0 + 1 - inset * 2 - cropMarginBottom
          )
        );

        rawSlices.push({
          index,
          row: r,
          col: c,
          x: Math.round(finalX),
          y: Math.round(finalY),
          width: Math.round(finalW),
          height: Math.round(finalH),
          enabled: true,
        });
      };

      let idx = 0;
      if (order === 'row-major') {
        for (let r = 0; r < actualRows && idx < actualEffectiveTotal; r++) {
          for (let c = 0; c < actualCols && idx < actualEffectiveTotal; c++) {
            addCell(r, c, idx++);
          }
        }
      } else {
        for (let c = 0; c < actualCols && idx < actualEffectiveTotal; c++) {
          for (let r = 0; r < actualRows && idx < actualEffectiveTotal; r++) {
            addCell(r, c, idx++);
          }
        }
      }

      // Discard incomplete fragments (< 58% of median frame dimension)
      const medSliceW = getMedian(rawSlices.map((s) => s.width));
      const medSliceH = getMedian(rawSlices.map((s) => s.height));
      const filteredSlices = rawSlices.filter(
        (s) => s.width >= medSliceW * 0.58 && s.height >= medSliceH * 0.58
      );
      const indexedSlices = (
        filteredSlices.length > 0 ? filteredSlices : rawSlices
      ).map((s, i) => ({
        ...s,
        index: i,
      }));

      const slices = perCellRefine
        ? alignAndStabilizeSlices(rgba, imageWidth, imageHeight, indexedSlices, bgSig)
        : indexedSlices;

      const widths = slices.map((s) => s.width);
      const heights = slices.map((s) => s.height);
      const confidence = Math.min(
        99,
        Math.max(55, Math.round((resX.score + resY.score) / 3))
      );

      const minCellX =
        indexedSlices.length > 0
          ? Math.min(...indexedSlices.map((s) => s.x))
          : resX.outerStart;
      const maxCellX =
        indexedSlices.length > 0
          ? Math.max(...indexedSlices.map((s) => s.x + s.width - 1))
          : resX.outerEnd;
      const minCellY =
        indexedSlices.length > 0
          ? Math.min(...indexedSlices.map((s) => s.y))
          : resY.outerStart;
      const maxCellY =
        indexedSlices.length > 0
          ? Math.max(...indexedSlices.map((s) => s.y + s.height - 1))
          : resY.outerEnd;

      return {
        slices,
        diagnostics: {
          mode: 'smart-cv',
          detectedColumns: actualCols,
          detectedRows: actualRows,
          confidenceScore: confidence,
          outerPadding: {
            left: minCellX,
            right: Math.max(0, imageWidth - 1 - maxCellX),
            top: minCellY,
            bottom: Math.max(0, imageHeight - 1 - maxCellY),
          },
          xGutters: resX.gutters,
          yGutters: resY.gutters,
          xIntervals: resX.intervals,
          yIntervals: resY.intervals,
          medianWidth: Math.round(getMedian(widths)),
          medianHeight: Math.round(getMedian(heights)),
        },
      };
    }
  }

  const slices = calculateFrameSlices(imageWidth, imageHeight, config);
  const widths = slices.map((s) => s.width);
  const heights = slices.map((s) => s.height);

  return {
    slices,
    diagnostics: {
      mode: 'uniform-grid',
      detectedColumns: validCols,
      detectedRows: validRows,
      confidenceScore: 100,
      outerPadding: {
        left: cropOffsetX,
        right: cropMarginRight,
        top: cropOffsetY,
        bottom: cropMarginBottom,
      },
      xGutters: [],
      yGutters: [],
      xIntervals: [],
      yIntervals: [],
      medianWidth: Math.round(getMedian(widths)),
      medianHeight: Math.round(getMedian(heights)),
    },
  };
}

/**
 * Classic uniform mathematical grid slicing.
 */
function calculateFrameSlices(
  imageWidth: number,
  imageHeight: number,
  config: GridConfig
): FrameSlice[] {
  const {
    columns,
    rows,
    totalFrames,
    cropOffsetX = 0,
    cropOffsetY = 0,
    cropMarginRight = 0,
    cropMarginBottom = 0,
    gapX = 0,
    gapY = 0,
    cellInset = 0,
    order = 'row-major',
  } = config;

  const validCols = Math.max(1, columns);
  const validRows = Math.max(1, rows);

  const availableWidth = Math.max(
    1,
    imageWidth - cropOffsetX - cropMarginRight - (validCols - 1) * gapX
  );
  const availableHeight = Math.max(
    1,
    imageHeight - cropOffsetY - cropMarginBottom - (validRows - 1) * gapY
  );

  const cellWidth = availableWidth / validCols;
  const cellHeight = availableHeight / validRows;

  const slices: FrameSlice[] = [];
  const maxPossible = validCols * validRows;
  const effectiveTotal = Math.min(
    totalFrames > 0 ? totalFrames : maxPossible,
    maxPossible
  );

  const inset = Math.max(0, cellInset);

  if (order === 'row-major') {
    let index = 0;
    for (let r = 0; r < validRows && index < effectiveTotal; r++) {
      for (let c = 0; c < validCols && index < effectiveTotal; c++) {
        const x = cropOffsetX + c * (cellWidth + gapX) + inset;
        const y = cropOffsetY + r * (cellHeight + gapY) + inset;
        slices.push({
          index,
          row: r,
          col: c,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(4, Math.round(cellWidth - inset * 2)),
          height: Math.max(4, Math.round(cellHeight - inset * 2)),
          enabled: true,
        });
        index++;
      }
    }
  } else {
    let index = 0;
    for (let c = 0; c < validCols && index < effectiveTotal; c++) {
      for (let r = 0; r < validRows && index < effectiveTotal; r++) {
        const x = cropOffsetX + c * (cellWidth + gapX) + inset;
        const y = cropOffsetY + r * (cellHeight + gapY) + inset;
        slices.push({
          index,
          row: r,
          col: c,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(4, Math.round(cellWidth - inset * 2)),
          height: Math.max(4, Math.round(cellHeight - inset * 2)),
          enabled: true,
        });
        index++;
      }
    }
  }

  return slices;
}

/**
 * Creates an animated GIF from the sliced frames of an image with
 * aspect-ratio preserving centering, transparency preservation, and temporal palette stability.
 */
export async function createGifFromImage(params: {
  image: HTMLImageElement;
  slices: FrameSlice[];
  options: GifOptions;
  onProgress?: (progress: number, frameCurrent: number, frameTotal: number) => void;
}): Promise<{
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  frameCount: number;
  durationMs: number;
}> {
  const { image, slices, options, onProgress } = params;
  const activeSlices = slices.filter((s) => s.enabled);

  if (activeSlices.length === 0) {
    throw new Error('No frames selected to generate GIF.');
  }

  const sequence = buildPlaybackSequence(activeSlices, options.playbackMode);

  const medW = getMedian(activeSlices.map((s) => s.width));
  const medH = getMedian(activeSlices.map((s) => s.height));
  const targetScale = GIF_ENCODE_SCALE;
  const outWidth = Math.max(2, Math.round(medW * targetScale));
  const outHeight = Math.max(2, Math.round(medH * targetScale));

  const delayMs = Math.max(20, Math.round(1000 / options.fps));

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context');
  }
  ctx.imageSmoothingEnabled = false;

  const gif = GIFEncoder();
  const totalSteps = sequence.length;
  const maxColors = GIF_ENCODE_MAX_COLORS;

  // Pre-render frames to detect transparency and build a temporal master palette sample
  const frameBuffers: Uint8ClampedArray[] = [];
  let hasTransparency = false;

  for (let i = 0; i < sequence.length; i++) {
    const frame = sequence[i];
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(0, 0, outWidth, outHeight);

    // Aspect-preserving centered draw when individual slice dimensions vary slightly
    const scaleFit = Math.min(outWidth / frame.width, outHeight / frame.height);
    const drawW = Math.round(frame.width * scaleFit);
    const drawH = Math.round(frame.height * scaleFit);
    const drawX = Math.round((outWidth - drawW) / 2);
    const drawY = Math.round((outHeight - drawH) / 2);

    ctx.drawImage(
      image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      drawX,
      drawY,
      drawW,
      drawH
    );

    const raw = ctx.getImageData(0, 0, outWidth, outHeight).data;
    const data = enhanceFrameRgba(
      new Uint8ClampedArray(raw),
      outWidth,
      outHeight,
    );
    if (!hasTransparency) {
      for (let p = 3; p < data.length; p += 16) {
        if (data[p] < 128) {
          hasTransparency = true;
          break;
        }
      }
    }
    frameBuffers.push(data);
  }

  const format = hasTransparency ? 'rgba4444' : 'rgb565';

  for (let i = 0; i < frameBuffers.length; i++) {
    const rgba = frameBuffers[i];
    const palette = quantize(rgba, maxColors, {
      format,
      oneBitAlpha: hasTransparency,
    });
    const index = applyPalette(rgba, palette, format);

    let transparentIndex = -1;
    if (hasTransparency) {
      transparentIndex = palette.findIndex((c: number[]) => c[3] === 0);
    }

    gif.writeFrame(index, outWidth, outHeight, {
      palette,
      delay: delayMs,
      repeat: options.loop,
      transparent: transparentIndex !== -1,
      transparentIndex: transparentIndex !== -1 ? transparentIndex : undefined,
      dispose: hasTransparency ? 2 : -1,
    });

    if (onProgress) {
      const pct = Math.round(((i + 1) / totalSteps) * 100);
      onProgress(pct, i + 1, totalSteps);
    }

    if (i % 2 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  gif.finish();
  const buffer = gif.bytes();
  const blob = new Blob([buffer as unknown as BlobPart], { type: 'image/gif' });
  const previewUrl = createPreviewUrl(blob);

  const durationMs = sequence.length * delayMs;

  return {
    blob,
    previewUrl,
    width: outWidth,
    height: outHeight,
    frameCount: sequence.length,
    durationMs,
  };
}