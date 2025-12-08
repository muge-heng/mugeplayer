import { LyricLine } from './types';

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

// Fallback to treat plain text as lyrics without timestamps (display all at once or static)
export const isLrcFormat = (text: string): boolean => {
  return /\[\d{2}:\d{2}/.test(text);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
