import { Song, Playlist } from '../types';

const DB_NAME = 'MuseDB';
const DB_VERSION = 2; // Incremented version for Playlists
const STORE_SONGS = 'songs';
const STORE_PLAYLISTS = 'playlists';

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };
  });
};

// --- Songs ---

export const saveSongToDB = async (song: Song): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SONGS], 'readwrite');
    const store = transaction.objectStore(STORE_SONGS);
    const songToStore = { ...song };
    // @ts-ignore
    delete songToStore.fileUrl;
    const request = store.put(songToStore);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSongsFromDB = async (): Promise<Song[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SONGS], 'readonly');
    const store = transaction.objectStore(STORE_SONGS);
    const request = store.getAll();

    request.onsuccess = () => {
      const songs = request.result as Song[];
      const hydratedSongs = songs.map(song => {
        if (song.fileBlob) {
            return {
                ...song,
                fileUrl: URL.createObjectURL(song.fileBlob)
            };
        }
        return song;
      });
      resolve(hydratedSongs);
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateSongInDB = async (song: Song): Promise<void> => {
    return saveSongToDB(song);
};

export const deleteSongFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SONGS], 'readwrite');
    const store = transaction.objectStore(STORE_SONGS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Playlists ---

export const savePlaylistToDB = async (playlist: Playlist): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYLISTS], 'readwrite');
        const store = transaction.objectStore(STORE_PLAYLISTS);
        const request = store.put(playlist);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getPlaylistsFromDB = async (): Promise<Playlist[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYLISTS], 'readonly');
        const store = transaction.objectStore(STORE_PLAYLISTS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Playlist[]);
        request.onerror = () => reject(request.error);
    });
};

export const deletePlaylistFromDB = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYLISTS], 'readwrite');
        const store = transaction.objectStore(STORE_PLAYLISTS);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
