'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  FrameSlice,
  GridConfig,
  ContainerDetectionDiagnostics,
} from '@/lib/types';
interface GridOverlayCanvasProps {
  image: HTMLImageElement | null;
  slices: FrameSlice[];
  config: GridConfig;
  diagnostics?: ContainerDetectionDiagnostics | null;
  selectedFrameIndex?: number;
  onSelectFrame?: (index: number) => void;
  onToggleFrame?: (index: number) => void;
}

export function GridOverlayCanvas({
  image,
  slices,
  config,
  diagnostics,
  selectedFrameIndex,
  onSelectFrame,
  onToggleFrame,
}: GridOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw source image
    ctx.drawImage(image, 0, 0);

    const styles = getComputedStyle(canvas);
    const color = (name: string) =>
      styles.getPropertyValue(name).trim() || 'currentColor';
    const cDestructive = color('--destructive');
    const cChart1 = color('--chart-1');
    const cChart2 = color('--chart-2');
    const cChart3 = color('--chart-3');
    const cChart4 = color('--chart-4');
    const cChart5 = color('--chart-5');
    const cBackground = color('--background');
    const cForeground = color('--foreground');
    const fillAlpha = (c: string, alpha: number, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    };

    // 2. Highlight detected outer margins & separator gutters (smart-cv)
    if (diagnostics?.mode === 'smart-cv') {
      const { outerPadding, xGutters, yGutters } = diagnostics;

      // Outer Padding identified with --chart-1
      if (outerPadding.left > 0) {
        fillAlpha(cChart1, 0.35, 0, 0, outerPadding.left, canvas.height);
      }
      if (outerPadding.right > 0) {
        fillAlpha(cChart1, 0.35, canvas.width - outerPadding.right, 0, outerPadding.right, canvas.height);
      }
      if (outerPadding.top > 0) {
        fillAlpha(cChart1, 0.35, outerPadding.left, 0, canvas.width - outerPadding.left - outerPadding.right, outerPadding.top);
      }
      if (outerPadding.bottom > 0) {
        fillAlpha(cChart1, 0.35, outerPadding.left, canvas.height - outerPadding.bottom, canvas.width - outerPadding.left - outerPadding.right, outerPadding.bottom);
      }

      // Separator Gutters identified with --chart-3
      xGutters.forEach((g) => {
        const gw = Math.max(2, g.end - g.start + 1);
        fillAlpha(cChart3, 0.4, g.start, 0, gw, canvas.height);
      });
      yGutters.forEach((g) => {
        const gh = Math.max(2, g.end - g.start + 1);
        fillAlpha(cChart3, 0.4, 0, g.start, canvas.width, gh);
      });
    } else {
      const { cropOffsetX, cropOffsetY, cropMarginRight, cropMarginBottom } =
        config;
      if (cropOffsetX > 0) fillAlpha(cChart1, 0.35, 0, 0, cropOffsetX, canvas.height);
      if (cropMarginRight > 0)
        fillAlpha(cChart1, 0.35, canvas.width - cropMarginRight, 0, cropMarginRight, canvas.height);
      if (cropOffsetY > 0)
        fillAlpha(cChart1, 0.35, cropOffsetX, 0, canvas.width - cropOffsetX - cropMarginRight, cropOffsetY);
      if (cropMarginBottom > 0)
        fillAlpha(cChart1, 0.35, cropOffsetX, canvas.height - cropMarginBottom, canvas.width - cropOffsetX - cropMarginRight, cropMarginBottom);
    }

    // 3. Draw detected frame container bounding boxes using --chart-2, --chart-4, --chart-5
    slices.forEach((slice) => {
      const isHovered = hoveredIndex === slice.index;
      const isSelected = selectedFrameIndex === slice.index;
      const isEnabled = slice.enabled;

      if (!isEnabled) {
        fillAlpha(cDestructive, 0.35, slice.x, slice.y, slice.width, slice.height);
        ctx.strokeStyle = cDestructive;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
        ctx.setLineDash([]);
      } else {
        ctx.globalAlpha = 1;
        if (isSelected) {
          ctx.strokeStyle = cChart4;
          ctx.lineWidth = 3;
          fillAlpha(cChart4, 0.22, slice.x, slice.y, slice.width, slice.height);
        } else if (isHovered) {
          ctx.strokeStyle = cChart4;
          ctx.lineWidth = 2.5;
          fillAlpha(cChart4, 0.14, slice.x, slice.y, slice.width, slice.height);
        } else {
          ctx.strokeStyle = cChart2;
          ctx.lineWidth = 2;
        }
        ctx.strokeRect(slice.x + 0.5, slice.y + 0.5, slice.width - 1, slice.height - 1);

        // Sub-pixel inner inset guide line using --chart-5 if inset applied
        if (config.cellInset > 0) {
          ctx.save();
          ctx.strokeStyle = cChart5;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.55;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(
            slice.x + config.cellInset + 0.5,
            slice.y + config.cellInset + 0.5,
            Math.max(1, slice.width - config.cellInset * 2 - 1),
            Math.max(1, slice.height - config.cellInset * 2 - 1)
          );
          ctx.restore();
        }
      }

      // Frame badge number with --chart-2 container accent
      const badgeSize = Math.max(18, Math.min(slice.width * 0.18, 32));
      const badgePadding = 6;
      const bx = slice.x + badgePadding;
      const by = slice.y + badgePadding;

      ctx.fillStyle = isEnabled ? (isSelected ? cChart4 : cForeground) : cDestructive;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeSize * 1.4, badgeSize, 4);
      ctx.fill();

      ctx.strokeStyle = isSelected ? cChart4 : cChart2;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isSelected && isEnabled ? cForeground : cBackground;
      ctx.font = `600 ${Math.round(badgeSize * 0.55)}px var(--font-heading), var(--font-sans), system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${slice.index + 1}`, bx + (badgeSize * 1.4) / 2, by + badgeSize / 2);
    });
  }, [
    image,
    slices,
    config,
    diagnostics,
    hoveredIndex,
    selectedFrameIndex,
  ]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const clickedSlice = slices.find(
      (s) =>
        clickX >= s.x &&
        clickX <= s.x + s.width &&
        clickY >= s.y &&
        clickY <= s.y + s.height
    );

    if (clickedSlice) {
      if (e.shiftKey && onToggleFrame) {
        onToggleFrame(clickedSlice.index);
      } else if (onSelectFrame) {
        onSelectFrame(clickedSlice.index);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const match = slices.find(
      (s) =>
        mx >= s.x && mx <= s.x + s.width && my >= s.y && my <= s.y + s.height
    );

    setHoveredIndex(match ? match.index : null);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (!image) return null;

  return (
    <div className="flex min-h-canvas-viewport-min max-h-canvas-viewport-max w-full items-center justify-center overflow-auto rounded-lg border border-border bg-muted/50 p-2">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="mx-auto block h-auto w-full cursor-crosshair rounded"
      />
    </div>
  );
}
