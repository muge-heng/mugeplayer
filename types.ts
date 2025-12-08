export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  fileUrl: string; // Blob URL
  coverUrl?: string;
  lyrics?: string; // LRC format or plain text
  isLiked?: boolean;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  queue: Song[];
  history: Song[];
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  view: 'library' | 'lyrics';
}

export interface LyricLine {
  time: number;
  text: string;
}

export enum GeminiAction {
  ANALYZE_VIBE = 'ANALYZE_VIBE',
  FETCH_LYRICS = 'FETCH_LYRICS',
}
