import { describe, expect, it } from 'vitest';
import { formatFileSize } from '@/lib/media/format-file-size';

describe('formatFileSize', () => {
  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });

  it('handles zero', () => {
    expect(formatFileSize(0)).toBe('0 KB');
  });
});
