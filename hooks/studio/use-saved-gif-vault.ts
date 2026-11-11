'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SavedGifItem, SavedGifRecord } from '@/lib/types';
import {
  getAllSavedGifs,
  saveGifItem,
  deleteSavedGif,
  clearAllSavedGifs,
  updateSavedGifTitle,
} from '@/lib/vault/storage';
import { createSavedGifId } from '@/lib/vault/saved-gif-id';
import { createPreviewUrl, revokePreviewUrl } from '@/lib/media/preview-url';

export function useSavedGifVault() {
  const [savedGifs, setSavedGifs] = useState<SavedGifItem[]>([]);
  const savedGifsRef = useRef<SavedGifItem[]>([]);

  useEffect(() => {
    savedGifsRef.current = savedGifs;
  }, [savedGifs]);

  useEffect(() => {
    getAllSavedGifs().then(setSavedGifs);
    return () => {
      savedGifsRef.current.forEach((item) =>
        revokePreviewUrl(item.previewUrl)
      );
    };
  }, []);

  const saveToLibrary = useCallback(
    async (item: Omit<SavedGifRecord, 'id' | 'createdAt'>) => {
      const record: SavedGifRecord = {
        ...item,
        id: createSavedGifId(),
        createdAt: Date.now(),
      };
      await saveGifItem(record);
      setSavedGifs((prev) => [
        { ...record, previewUrl: createPreviewUrl(record.gif) },
        ...prev,
      ]);
    },
    []
  );

  const deleteSaved = useCallback(async (id: string) => {
    setSavedGifs((prev) => {
      const target = prev.find((g) => g.id === id);
      revokePreviewUrl(target?.previewUrl);
      return prev.filter((g) => g.id !== id);
    });
    await deleteSavedGif(id);
  }, []);

  const updateTitle = useCallback(async (id: string, newTitle: string) => {
    await updateSavedGifTitle(id, newTitle);
    setSavedGifs((prev) =>
      prev.map((g) => (g.id === id ? { ...g, title: newTitle } : g))
    );
  }, []);

  const clearAll = useCallback(async () => {
    setSavedGifs((prev) => {
      prev.forEach((g) => revokePreviewUrl(g.previewUrl));
      return [];
    });
    await clearAllSavedGifs();
  }, []);

  return {
    savedGifs,
    saveToLibrary,
    deleteSaved,
    updateTitle,
    clearAll,
  };
}
