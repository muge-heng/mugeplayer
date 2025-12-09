
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  fileUrl: string; // Blob URL (Transient, generated at runtime)
  fileBlob?: Blob; // Actual file data (Persisted in IndexedDB)
  coverUrl?: string;
  lyrics?: string; // LRC format or plain text
  dateAdded?: number;
  isLiked?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string; // Custom user uploaded cover
  useFirstSongCover?: boolean; // Logic flag
  songs: string[]; // Array of Song IDs
  createdAt: number;
}

export type Language = 'en' | 'zh';
// Updated to include specific Aurora variations
export type Theme = 'dark' | 'light' | 'violet' | 'aurora-dark' | 'aurora-light' | 'pink';

export interface HyperSettings {
    enableChromatic: boolean;
    enableNoise: boolean;
    enableGlow: boolean;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  enableParticles: boolean;
  enableHyperMode: boolean; // Master switch
  hyperSettings: HyperSettings; // Granular settings
  highPerformanceMode: boolean;
  lyricEffect: 'standard' | 'blur' | 'glow' | 'kinetic';
  showAdvancedPlayerControls: boolean;
  smartShuffle: boolean; // New: Prioritize unplayed songs
  lyricFontSize: number; // New: Font size in px (base)
  lyricFontFamily: string; // New: Font family
}

export type VisualMode = 'square' | 'vinyl' | 'cassette' | 'immersive' | 'particles' | 'hyper';
export type NavView = 'home' | 'search' | 'library' | 'playlist' | 'settings';
export type SortOption = 'title' | 'artist' | 'dateAdded';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  queue: Song[];   // The active playback list
  library: Song[]; // The persistent database list
  history: Song[];
  playlists: Playlist[];
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isPlayerOpen: boolean;
  isQueueOpen: boolean;
  navView: NavView;
  activePlaylistId: string | null;
  visualMode: VisualMode;
  searchQuery: string;
  settings: AppSettings;
  sortOption: SortOption;
  playedSongIds: Set<string>; // For Smart Shuffle
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  songId: string | null;
  playlistId?: string; // If triggered inside a playlist context
}

export enum GeminiAction {
  ANALYZE_VIBE = 'ANALYZE_VIBE',
  FETCH_LYRICS = 'FETCH_LYRICS',
}
