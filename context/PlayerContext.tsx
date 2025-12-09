import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Song, PlayerState, VisualMode, NavView, Playlist, AppSettings, SortOption, Language } from '../types';
import { readMetadata, generateId } from '../utils';
import { getSongsFromDB, saveSongToDB, updateSongInDB, initDB, getPlaylistsFromDB, savePlaylistToDB, deletePlaylistFromDB, deleteSongFromDB } from '../services/db';

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
  setPlayerOpen: (isOpen: boolean) => void;
  setNavView: (view: NavView) => void;
  setActivePlaylist: (id: string | null) => void;
  setVisualMode: (mode: VisualMode) => void;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  updateSongMetadata: (id: string, updates: Partial<Song>) => void;
  createPlaylist: (name: string) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
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
    playlists: [],
    history: [],
    shuffle: false,
    repeat: 'off',
    isPlayerOpen: false,
    navView: 'library',
    activePlaylistId: null,
    visualMode: 'immersive',
    searchQuery: '',
    sortOption: 'dateAdded',
    settings: {
        language: 'en',
        enableParticles: true,
        enableHyperMode: false,
        highPerformanceMode: false,
        lyricEffect: 'blur'
    }
  });

  // Initialize DB and load data
  useEffect(() => {
    const loadData = async () => {
        try {
            await initDB();
            const [songs, playlists] = await Promise.all([getSongsFromDB(), getPlaylistsFromDB()]);
            
            // Load Settings from LocalStorage
            const savedSettings = localStorage.getItem('museSettings');
            const parsedSettings = savedSettings ? JSON.parse(savedSettings) : state.settings;

            setState(prev => ({ 
                ...prev, 
                queue: songs,
                playlists: playlists,
                settings: parsedSettings
            }));
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    loadData();
  }, []);

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
  }, [state.queue, state.repeat, state.shuffle]); 

  // Derived sorted queue for display (though internal queue remains consistent for playback logic usually, 
  // here we just modify how we access next/prev or display)
  // For simplicity in this local player, we sort the main queue directly or sort on render.
  // We'll expose a 'getSortedSongs' helper internally if needed, but here we just store the sort preference.

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

        let lyrics = undefined;
        const fileNameBase = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const matchedLrcFile = lrcFiles.find(l => {
            const lrcNameBase = l.name.substring(0, l.name.lastIndexOf('.')) || l.name;
            return lrcNameBase === fileNameBase;
        });

        if (matchedLrcFile) {
            lyrics = await matchedLrcFile.text();
        }

        const song: Song = {
          id: generateId(),
          title,
          artist,
          album: metadata.album || 'Local Import',
          duration: 0, 
          fileUrl: url,
          fileBlob: file, 
          coverUrl: metadata.coverUrl,
          lyrics: lyrics,
          dateAdded: Date.now()
        };

        await saveSongToDB(song);
        newSongs.push(song);
    }

    setState(prev => {
        const finalQueue = [...prev.queue, ...newSongs];
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
    const song = state.queue.find(s => s.id === id);
    if (song) {
        const updatedSong = { ...song, isLiked: !song.isLiked };
        updateSongInDB(updatedSong);
    }

    setState(prev => ({
      ...prev,
      queue: prev.queue.map(s => s.id === id ? { ...s, isLiked: !s.isLiked } : s),
      currentSong: prev.currentSong?.id === id ? { ...prev.currentSong, isLiked: !prev.currentSong.isLiked } : prev.currentSong
    }));
  };

  // --- Playlist Logic ---

  const createPlaylist = async (name: string) => {
      const newPlaylist: Playlist = {
          id: generateId(),
          name,
          songs: [],
          createdAt: Date.now(),
          useFirstSongCover: true
      };
      await savePlaylistToDB(newPlaylist);
      setState(prev => ({ ...prev, playlists: [...prev.playlists, newPlaylist] }));
  };

  const updatePlaylist = async (id: string, updates: Partial<Playlist>) => {
      const playlist = state.playlists.find(p => p.id === id);
      if (playlist) {
          const updated = { ...playlist, ...updates };
          await savePlaylistToDB(updated);
          setState(prev => ({
              ...prev,
              playlists: prev.playlists.map(p => p.id === id ? updated : p)
          }));
      }
  };

  const addToPlaylist = async (playlistId: string, songId: string) => {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist && !playlist.songs.includes(songId)) {
          const updated = { ...playlist, songs: [...playlist.songs, songId] };
          await savePlaylistToDB(updated);
          setState(prev => ({
              ...prev,
              playlists: prev.playlists.map(p => p.id === playlistId ? updated : p)
          }));
      }
  };

  const removeFromPlaylist = async (playlistId: string, songId: string) => {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (playlist) {
          const updated = { ...playlist, songs: playlist.songs.filter(id => id !== songId) };
          await savePlaylistToDB(updated);
          setState(prev => ({
              ...prev,
              playlists: prev.playlists.map(p => p.id === playlistId ? updated : p)
          }));
      }
  };

  const deletePlaylist = async (id: string) => {
      await deletePlaylistFromDB(id);
      setState(prev => ({
          ...prev,
          playlists: prev.playlists.filter(p => p.id !== id),
          navView: prev.navView === 'playlist' && prev.activePlaylistId === id ? 'library' : prev.navView
      }));
  };

  const deleteSong = async (id: string) => {
      await deleteSongFromDB(id);
      setState(prev => ({
          ...prev,
          queue: prev.queue.filter(s => s.id !== id),
          playlists: prev.playlists.map(p => {
              if (p.songs.includes(id)) {
                  const updated = { ...p, songs: p.songs.filter(sid => sid !== id) };
                  savePlaylistToDB(updated);
                  return updated;
              }
              return p;
          })
      }));
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
      setState(prev => {
          const newSettings = { ...prev.settings, ...settings };
          localStorage.setItem('museSettings', JSON.stringify(newSettings));
          return { ...prev, settings: newSettings };
      });
  };

  const toggleShuffle = () => setState(s => ({ ...s, shuffle: !s.shuffle }));
  
  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
    setState(s => ({ ...s, repeat: nextMode }));
  };

  const updateSongMetadata = (id: string, updates: Partial<Song>) => {
     const songIndex = state.queue.findIndex(s => s.id === id);
     if (songIndex !== -1) {
         const updatedSong = { ...state.queue[songIndex], ...updates };
         updateSongInDB(updatedSong);
     }

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
      setPlayerOpen: (isOpen) => setState(s => ({...s, isPlayerOpen: isOpen})),
      setNavView: (navView) => setState(s => ({...s, navView})),
      setActivePlaylist: (id) => setState(s => ({...s, activePlaylistId: id})),
      setVisualMode: (visualMode) => setState(s => ({...s, visualMode})),
      setSearchQuery: (searchQuery) => setState(s => ({...s, searchQuery})),
      setSortOption: (option) => setState(s => ({...s, sortOption: option})),
      updateSongMetadata,
      createPlaylist,
      updatePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      deletePlaylist,
      deleteSong,
      updateSettings
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onLoadedMetadata={(e) => {
            const target = e.target as HTMLAudioElement;
            setState(s => {
                if(s.currentSong && s.currentSong.duration !== target.duration) {
                    const updated = { ...s.currentSong, duration: target.duration };
                    updateSongInDB(updated);
                    return { ...s, currentSong: updated };
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
