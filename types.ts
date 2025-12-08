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

export type VisualMode = 'square' | 'vinyl' | 'immersive';
export type NavView = 'home' | 'search' | 'library';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  queue: Song[];
  history: Song[];
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  view: 'library' | 'lyrics'; // 'view' controls the full screen player overlay
  navView: NavView; // 'navView' controls the main content area
  visualMode: VisualMode;
  searchQuery: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export enum GeminiAction {
  ANALYZE_VIBE = 'ANALYZE_VIBE',
  FETCH_LYRICS = 'FETCH_LYRICS',
}
