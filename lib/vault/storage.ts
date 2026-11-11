import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SavedGifItem, SavedGifRecord } from '@/lib/types';
import { createPreviewUrl } from '@/lib/media/preview-url';

interface GifAppDB extends DBSchema {
  saved_gifs: {
    key: string;
    value: SavedGifRecord;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'gif-generator-vault';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GifAppDB>> | null = null;

function getDb(): Promise<IDBPDatabase<GifAppDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('IndexedDB is only available in browser environment')
    );
  }

  if (!dbPromise) {
    dbPromise = openDB<GifAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2 && db.objectStoreNames.contains('saved_gifs')) {
          db.deleteObjectStore('saved_gifs');
        }
        if (!db.objectStoreNames.contains('saved_gifs')) {
          const store = db.createObjectStore('saved_gifs', { keyPath: 'id' });
          store.createIndex('by-date', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

function hydrateItem(record: SavedGifRecord): SavedGifItem {
  return {
    ...record,
    previewUrl: createPreviewUrl(record.gif),
  };
}

export async function getAllSavedGifs(): Promise<SavedGifItem[]> {
  try {
    const db = await getDb();
    const items = await db.getAllFromIndex('saved_gifs', 'by-date');
    return items.reverse().map(hydrateItem);
  } catch (err) {
    console.error('Failed to get saved gifs from IndexedDB:', err);
    return [];
  }
}

export async function saveGifItem(item: SavedGifRecord): Promise<void> {
  const db = await getDb();
  await db.put('saved_gifs', item);
}

export async function deleteSavedGif(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('saved_gifs', id);
}

export async function updateSavedGifTitle(
  id: string,
  newTitle: string
): Promise<void> {
  const db = await getDb();
  const existing = await db.get('saved_gifs', id);
  if (existing) {
    existing.title = newTitle;
    await db.put('saved_gifs', existing);
  }
}

export async function clearAllSavedGifs(): Promise<void> {
  const db = await getDb();
  await db.clear('saved_gifs');
}
