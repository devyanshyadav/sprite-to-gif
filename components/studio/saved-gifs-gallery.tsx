'use client';

import { useState } from 'react';
import type { SavedGifItem } from '@/lib/types';
import {
  PiDownloadSimpleBold,
  PiTrashSimpleBold,
  PiPencilSimpleBold,
  PiCheckBold,
} from 'react-icons/pi';
import { BevelButton } from '@/components/library/bevel-button';
import { FieldInput } from '@/components/library/field-input';
import {
  NoticeAlert,
  NoticeAlertIcon,
  NoticeAlertContent,
  NoticeAlertTitle,
  NoticeAlertDescription,
} from '@/components/library/notice-alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatFileSize } from '@/lib/media/format-file-size';
import { downloadBlob } from '@/lib/media/download-blob';
import { toSafeDownloadName } from '@/lib/media/export-filename';
import { IconTooltip } from '@/components/library/icon-tooltip';
import { STUDIO_COPY } from '@/lib/studio-copy';

interface SavedGifsGalleryProps {
  savedGifs: SavedGifItem[];
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onClearAll: () => void;
}

export function SavedGifsGallery({
  savedGifs,
  onDelete,
  onUpdateTitle,
  onClearAll,
}: SavedGifsGalleryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const startEditing = (gif: SavedGifItem) => {
    setEditingId(gif.id);
    setEditTitleText(gif.title);
  };

  const saveTitle = (id: string) => {
    if (editTitleText.trim()) {
      onUpdateTitle(id, editTitleText.trim());
    }
    setEditingId(null);
  };

  const handleDownload = (gif: SavedGifItem) => {
    downloadBlob(gif.gif, toSafeDownloadName(gif.title, '.gif'));
  };

  if (savedGifs.length === 0) {
    return (
      <div className="py-6">
        <NoticeAlert tone="neutral" variant="soft" size="sm">
          <NoticeAlertIcon />
          <NoticeAlertContent>
            <NoticeAlertTitle>{STUDIO_COPY.savedVault.emptyTitle}</NoticeAlertTitle>
            <NoticeAlertDescription>
              {STUDIO_COPY.savedVault.emptyDescription}
            </NoticeAlertDescription>
          </NoticeAlertContent>
        </NoticeAlert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {STUDIO_COPY.savedVault.countLabel(savedGifs.length)}
        </span>
        <BevelButton
          variant="destructive"
          size="xs"
          onClick={() => {
            if (confirm('Delete all saved GIFs?')) {
              onClearAll();
            }
          }}
        >
          <PiTrashSimpleBold />
          {STUDIO_COPY.savedVault.clearAll}
        </BevelButton>
      </div>

      <div className="flex flex-col gap-3">
        {savedGifs.map((gif) => (
          <Card key={gif.id} size="sm" className="gap-2.5 overflow-hidden p-3">
            <div className="relative flex h-40 w-full items-center justify-center rounded-md bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gif.previewUrl}
                alt={gif.title}
                className="max-h-full max-w-full rounded object-contain"
              />
              <Badge variant="secondary" className="absolute bottom-2 left-2">
                {gif.width}×{gif.height} · {gif.frameCount}f · {gif.fps}fps
              </Badge>
              <Badge variant="secondary" className="absolute right-2 top-2 font-mono">
                {formatFileSize(gif.sizeBytes)}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2">
              {editingId === gif.id ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <FieldInput
                    type="text"
                    size="sm"
                    value={editTitleText}
                    onChange={(e) => setEditTitleText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle(gif.id)}
                    autoFocus
                    className="h-8 py-1 text-xs"
                    containerProps={{ className: 'flex-1' }}
                  />
                  <IconTooltip label="Save title">
                    <BevelButton
                      size="icon-xs"
                      onClick={() => saveTitle(gif.id)}
                    >
                      <PiCheckBold />
                    </BevelButton>
                  </IconTooltip>
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <span
                    className="truncate text-xs font-medium text-foreground"
                    title={gif.title}
                  >
                    {gif.title}
                  </span>
                  <IconTooltip label="Rename">
                    <BevelButton
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEditing(gif)}
                    >
                      <PiPencilSimpleBold />
                    </BevelButton>
                  </IconTooltip>
                </div>
              )}

              <div className="flex items-center gap-1">
                <BevelButton
                  size="xs"
                  onClick={() => handleDownload(gif)}
                >
                  <PiDownloadSimpleBold />
                  Download
                </BevelButton>
                <IconTooltip label="Delete">
                  <BevelButton
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      if (confirm(`Delete "${gif.title}"?`)) {
                        onDelete(gif.id);
                      }
                    }}
                  >
                    <PiTrashSimpleBold />
                  </BevelButton>
                </IconTooltip>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
