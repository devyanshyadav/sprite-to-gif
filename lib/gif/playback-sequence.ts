import type { FrameSlice, GifOptions } from '@/lib/types';

export function buildPlaybackSequence(
  activeSlices: FrameSlice[],
  mode: GifOptions['playbackMode']
): FrameSlice[] {
  if (activeSlices.length === 0) return [];
  if (mode === 'forward') return activeSlices;
  if (mode === 'reverse') return [...activeSlices].reverse();
  if (mode === 'ping-pong') {
    if (activeSlices.length <= 2) return activeSlices;
    const middleReverse = activeSlices
      .slice(1, activeSlices.length - 1)
      .reverse();
    return [...activeSlices, ...middleReverse];
  }
  return activeSlices;
}
