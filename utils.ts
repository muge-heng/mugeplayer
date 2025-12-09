import { LyricLine } from './types';

// Declare jsmediatags for TypeScript (loaded via CDN)
declare const jsmediatags: any;

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseLrc = (lrc: string): LyricLine[] => {
  const lines = lrc.split('\n');
  const regex = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/;
  const result: LyricLine[] = [];

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result;
};

// Fallback to treat plain text as lyrics without timestamps
export const isLrcFormat = (text: string): boolean => {
  return /\[\d{2}:\d{2}/.test(text);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => {
            const duration = audio.duration;
            URL.revokeObjectURL(objectUrl);
            resolve(duration === Infinity || isNaN(duration) ? 0 : duration);
        };
        audio.onerror = () => {
             resolve(0);
        }
    });
};

export const readMetadata = (file: File): Promise<{ title?: string; artist?: string; album?: string; coverUrl?: string }> => {
  return new Promise((resolve) => {
    if (typeof jsmediatags === 'undefined') {
      console.warn("jsmediatags library not loaded");
      resolve({});
      return;
    }

    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const { title, artist, album, picture } = tag.tags;
        let coverUrl: string | undefined = undefined;

        if (picture) {
          const { data, format } = picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
        }

        resolve({
          title,
          artist,
          album,
          coverUrl
        });
      },
      onError: (error: any) => {
        console.log('Error reading tags:', error.type, error.info);
        resolve({});
      }
    });
  });
};
