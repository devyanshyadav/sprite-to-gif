'use client';

import { cn } from '@/lib/utils';

type SampleFrameThumbProps = {
  path: string;
  columns: number;
  rows: number;
  className?: string;
};

/** Zoom the sprite sheet so the top-left cell fills the thumb (uniform grid). */
export function SampleFrameThumb({
  path,
  columns,
  rows,
  className,
}: SampleFrameThumbProps) {
  const safeColumns = Math.max(1, columns);
  const safeRows = Math.max(1, rows);

  return (
    <span
      className={cn(
        'relative size-[3.25rem] shrink-0 overflow-hidden rounded-md border border-border/80 bg-muted shadow-sm',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public spritesheet thumbs */}
      <img
        src={path}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute start-0 top-0 max-w-none"
        style={{
          width: `${safeColumns * 100}%`,
          height: `${safeRows * 100}%`,
        }}
      />
    </span>
  );
}
