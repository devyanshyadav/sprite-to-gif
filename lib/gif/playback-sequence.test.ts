import { describe, expect, it } from 'vitest';
import { buildPlaybackSequence } from '@/lib/gif/playback-sequence';
import type { FrameSlice } from '@/lib/types';

const slice = (index: number): FrameSlice => ({
  index,
  row: 0,
  col: index,
  x: index * 10,
  y: 0,
  width: 8,
  height: 8,
  enabled: true,
});

describe('buildPlaybackSequence', () => {
  it('returns empty for no frames', () => {
    expect(buildPlaybackSequence([], 'forward')).toEqual([]);
  });

  it('runs forward in order', () => {
    const frames = [slice(0), slice(1), slice(2)];
    expect(buildPlaybackSequence(frames, 'forward').map((f) => f.index)).toEqual([
      0, 1, 2,
    ]);
  });

  it('runs reverse', () => {
    const frames = [slice(0), slice(1), slice(2)];
    expect(buildPlaybackSequence(frames, 'reverse').map((f) => f.index)).toEqual([
      2, 1, 0,
    ]);
  });

  it('ping-pong mirrors interior frames', () => {
    const frames = [slice(0), slice(1), slice(2), slice(3)];
    expect(buildPlaybackSequence(frames, 'ping-pong').map((f) => f.index)).toEqual(
      [0, 1, 2, 3, 2, 1]
    );
  });

  it('ping-pong with two frames does not duplicate', () => {
    const frames = [slice(0), slice(1)];
    expect(buildPlaybackSequence(frames, 'ping-pong')).toHaveLength(2);
  });
});
