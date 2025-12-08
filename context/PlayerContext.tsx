import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Song, PlayerState, VisualMode, NavView } from '../types';
import { readMetadata } from '../utils';

interface PlayerContextType extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement>;
  play: (song: Song) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (val: number) => void;
  addToQueue: (files: FileList | null) => Promise<void>;
  uploadLyrics: (file: File) => Promise<void>;
  toggleLike: (id: string) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setView: (view: 'library' | 'lyrics') => void;
  setNavView: (view: NavView) => void;
  setVisualMode: (mode: VisualMode) => void;
  setSearchQuery: (query: string) => void;
  updateSongMetadata: (id: string, updates: Partial<Song>) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    volume: 0.8,
    currentTime: 0,
    queue: [],
    history: [],
    shuffle: false,
    repeat: 'off',
    view: 'library',
    navView: 'library',
    visualMode: 'square',
    searchQuery: '',
  });

  // Handle Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const handleEnded = () => next();
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.queue, state.repeat, state.shuffle]); 

  // Play a specific song
  const play = (song: Song) => {
    setState(prev => ({
      ...prev,
      currentSong: song,
      isPlaying: true,
      history: prev.currentSong ? [...prev.history, prev.currentSong] : prev.history
    }));
    if (audioRef.current) {
      audioRef.current.src = song.fileUrl;
      audioRef.current.play();
    }
  };

  const pause = () => {
    setState(s => ({ ...s, isPlaying: false }));
    audioRef.current?.pause();
  };

  const resume = () => {
    setState(s => ({ ...s, isPlaying: true }));
    audioRef.current?.play();
  };

  const next = () => {
    if (!state.currentSong) return;
    
    let nextIndex = state.queue.findIndex(s => s.id === state.currentSong?.id) + 1;
    
    if (state.repeat === 'one') {
       if (audioRef.current) {
         audioRef.current.currentTime = 0;
         audioRef.current.play();
       }
       return;
    }

    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    }

    if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all') {
        nextIndex = 0;
      } else {
        pause();
        return;
      }
    }

    play(state.queue[nextIndex]);
  };

  const prev = () => {
    if (!state.currentSong) return;
    if (state.currentTime > 3 && audioRef.current) {
        audioRef.current.currentTime = 0;
        return;
    }
    
    const currentIndex = state.queue.findIndex(s => s.id === state.currentSong?.id);
    const prevIndex = currentIndex - 1;
    
    if (prevIndex >= 0) {
      play(state.queue[prevIndex]);
    } else {
      play(state.queue[state.queue.length - 1]);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  };

  const setVolume = (val: number) => {
    if (audioRef.current) audioRef.current.volume = val;
    setState(s => ({ ...s, volume: val }));
  };

  const addToQueue = async (files: FileList | null) => {
    if (!files) return;
    
    const audioFiles: File[] = [];
    const lrcFiles: File[] = [];

    // Separate files
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('audio/') || file.name.endsWith('.flac')) {
            audioFiles.push(file);
        } else if (file.name.endsWith('.lrc')) {
            lrcFiles.push(file);
        }
    }

    const newSongs: Song[] = [];

    for (const file of audioFiles) {
        const url = URL.createObjectURL(file);
        const metadata = await readMetadata(file);

        let artist = metadata.artist || 'Unknown Artist';
        let title = metadata.title || file.name.replace(/\.[^/.]+$/, "");
        if (!metadata.title && title.includes('-')) {
            const parts = title.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
        }

        // Auto-match LRC
        let lyrics = undefined;
        // 1. Check in newly uploaded LRCs
        const fileNameBase = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const matchedLrcFile = lrcFiles.find(l => {
            const lrcNameBase = l.name.substring(0, l.name.lastIndexOf('.')) || l.name;
            return lrcNameBase === fileNameBase;
        });

        if (matchedLrcFile) {
            lyrics = await matchedLrcFile.text();
        }

        newSongs.push({
          id: Math.random().toString(36).substr(2, 9),
          title,
          artist,
          album: metadata.album || 'Local Import',
          duration: 0, 
          fileUrl: url,
          coverUrl: metadata.coverUrl,
          lyrics: lyrics
        });
    }

    setState(prev => {
        // Also check if any new LRCs match EXISTING songs in queue that don't have lyrics
        const updatedQueue = [...prev.queue];
        // Note: This logic for existing songs would require async operations inside set state which is tricky. 
        // We'll simplisticly just handle new songs for now, or we would need a separate effect.
        
        const finalQueue = [...updatedQueue, ...newSongs];
        
        if (!prev.currentSong && newSongs.length > 0) {
            setTimeout(() => play(newSongs[0]), 100);
            return { ...prev, queue: finalQueue, currentSong: newSongs[0], isPlaying: true };
        }
        return { ...prev, queue: finalQueue };
    });
  };

  const uploadLyrics = async (file: File) => {
      if (!state.currentSong) return;
      if (file.name.endsWith('.lrc') || file.type === 'text/plain') {
          const text = await file.text();
          updateSongMetadata(state.currentSong.id, { lyrics: text });
      }
  };

  const toggleLike = (id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.map(s => s.id === id ? { ...s, isLiked: !s.isLiked } : s),
      currentSong: prev.currentSong?.id === id ? { ...prev.currentSong, isLiked: !prev.currentSong.isLiked } : prev.currentSong
    }));
  };

  const toggleShuffle = () => setState(s => ({ ...s, shuffle: !s.shuffle }));
  
  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
    setState(s => ({ ...s, repeat: nextMode }));
  };

  const updateSongMetadata = (id: string, updates: Partial<Song>) => {
     setState(prev => ({
         ...prev,
         queue: prev.queue.map(s => s.id === id ? { ...s, ...updates } : s),
         currentSong: prev.currentSong?.id === id ? { ...prev.currentSong, ...updates } : prev.currentSong
     }));
  };

  return (
    <PlayerContext.Provider value={{
      ...state,
      audioRef,
      play,
      pause,
      resume,
      next,
      prev,
      seek,
      setVolume,
      addToQueue,
      uploadLyrics,
      toggleLike,
      toggleShuffle,
      toggleRepeat,
      setView: (view) => setState(s => ({...s, view})),
      setNavView: (navView) => setState(s => ({...s, navView})),
      setVisualMode: (visualMode) => setState(s => ({...s, visualMode})),
      setSearchQuery: (searchQuery) => setState(s => ({...s, searchQuery})),
      updateSongMetadata
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onLoadedMetadata={(e) => {
            const target = e.target as HTMLAudioElement;
            setState(s => {
                if(s.currentSong) {
                    return { ...s, currentSong: { ...s.currentSong, duration: target.duration } };
                }
                return s;
            })
        }}
      />
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
};
