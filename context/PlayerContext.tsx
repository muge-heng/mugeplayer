import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Song, PlayerState, VisualMode, NavView, Playlist, AppSettings, SortOption } from '../types';
import { readMetadata, generateId, getAudioDuration } from '../utils';
import { 
    getPlaylistsFromDB, savePlaylistToDB, deletePlaylistFromDB,
    getSongsFromDB, saveSongToDB, deleteSongFromDB, updateSongInDB 
} from '../services/db';

interface PlayerContextType extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement>;
  play: (song: Song, fromContext?: 'queue' | 'library') => void;
  playNext: (song: Song) => void;
  playPlaylist: (playlistId: string) => void; // New
  pause: () => void;
  resume: () => void;
  next: (isAuto?: boolean) => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (val: number) => void;
  addToQueue: (files: FileList | null) => Promise<void>;
  removeFromQueue: (index: number) => void;
  uploadLyrics: (file: File) => Promise<void>;
  toggleLike: (id: string) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlayerOpen: (isOpen: boolean) => void;
  setQueueOpen: (isOpen: boolean) => void;
  setNavView: (view: NavView) => void;
  setActivePlaylist: (id: string | null) => void;
  setVisualMode: (mode: VisualMode) => void;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  updateSongMetadata: (id: string, updates: Partial<Song>) => void;
  createPlaylist: (name: string) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Modal State
  createPlaylistModal: { isOpen: boolean; songId: string | null };
  openCreatePlaylistModal: (songId?: string) => void;
  closeCreatePlaylistModal: () => void;
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
    library: [], 
    playlists: [],
    history: [],
    shuffle: false,
    repeat: 'off',
    isPlayerOpen: false,
    isQueueOpen: false,
    navView: 'library',
    activePlaylistId: null,
    visualMode: 'immersive',
    searchQuery: '',
    sortOption: 'dateAdded',
    playedSongIds: new Set(),
    settings: {
        language: 'en',
        theme: 'dark',
        enableParticles: true,
        enableHyperMode: false,
        hyperSettings: {
            enableChromatic: true,
            enableNoise: true,
            enableGlow: true
        },
        highPerformanceMode: false,
        lyricEffect: 'blur',
        showAdvancedPlayerControls: false,
        smartShuffle: true,
        lyricFontSize: 24,
        lyricFontFamily: 'Inter, sans-serif'
    }
  });

  const [createPlaylistModal, setCreatePlaylistModal] = useState<{ isOpen: boolean; songId: string | null }>({ isOpen: false, songId: null });

  // Initialize Data
  useEffect(() => {
    const loadData = async () => {
        try {
            const [playlists, songs] = await Promise.all([
                getPlaylistsFromDB(),
                getSongsFromDB()
            ]);
            
            const savedSettings = localStorage.getItem('museSettings');
            let parsedSettings = savedSettings ? JSON.parse(savedSettings) : state.settings;

            // Migration for new settings
            if (!parsedSettings.hyperSettings) {
                parsedSettings.hyperSettings = { enableChromatic: true, enableNoise: true, enableGlow: true };
            }
            if (parsedSettings.smartShuffle === undefined) {
                parsedSettings.smartShuffle = true;
            }
            if (parsedSettings.lyricFontSize === undefined) {
                parsedSettings.lyricFontSize = 24;
            }
            if (!parsedSettings.theme) parsedSettings.theme = 'dark';

            setState(prev => ({ 
                ...prev, 
                playlists: playlists,
                library: songs,
                queue: songs,
                settings: parsedSettings
            }));
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    loadData();
  }, []);

  // Apply Theme Effect
  useEffect(() => {
      document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // Handle Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    // Pass true to next() indicating this was an automatic end
    const handleEnded = () => next(true);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [state.queue, state.repeat, state.shuffle, state.settings.smartShuffle]); 

  const play = (song: Song, fromContext?: 'queue' | 'library') => {
    setState(prev => {
        let newQueue = prev.queue;
        // If queue is empty, populate with library
        if (prev.queue.length === 0) {
            newQueue = prev.library;
        }

        // Ensure song is in queue
        if (!newQueue.find(s => s.id === song.id)) {
            newQueue = [song, ...newQueue];
        }

        // Add to played history
        const newPlayed = new Set(prev.playedSongIds);
        newPlayed.add(song.id);

        return {
            ...prev,
            currentSong: song,
            isPlaying: true,
            queue: newQueue,
            playedSongIds: newPlayed,
            history: prev.currentSong ? [...prev.history, prev.currentSong] : prev.history
        };
    });

    if (audioRef.current) {
      audioRef.current.src = song.fileUrl;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              if (error.name === 'AbortError') {
                  // Ignore new load request interrupt
              } else {
                  console.error("Play error:", error);
              }
          });
      }
    }
  };

  const playPlaylist = (playlistId: string) => {
      setState(prev => {
          let songsToPlay: Song[] = [];
          if (playlistId === 'liked') {
              songsToPlay = prev.library.filter(s => s.isLiked);
          } else {
              const pl = prev.playlists.find(p => p.id === playlistId);
              if (pl) {
                  // Map IDs to actual songs, filter out missing ones
                  songsToPlay = pl.songs.map(sid => prev.library.find(s => s.id === sid)).filter((s): s is Song => !!s);
              }
          }

          if (songsToPlay.length === 0) return prev;

          // Replace Queue
          const firstSong = songsToPlay[0];
          
          if (audioRef.current) {
              audioRef.current.src = firstSong.fileUrl;
              audioRef.current.play().catch(e => {
                  if (e.name !== 'AbortError') console.error(e);
              });
          }

          return {
              ...prev,
              queue: songsToPlay,
              currentSong: firstSong,
              isPlaying: true,
              playedSongIds: new Set([firstSong.id]),
              history: prev.currentSong ? [...prev.history, prev.currentSong] : prev.history
          };
      });
  };

  const playNext = (song: Song) => {
      setState(prev => {
          let newQueue = [...prev.queue];
          const existingIdx = newQueue.findIndex(s => s.id === song.id);
          if (existingIdx !== -1) newQueue.splice(existingIdx, 1);
          
          const currentIdx = newQueue.findIndex(s => s.id === prev.currentSong?.id);
          if (currentIdx !== -1) {
              newQueue.splice(currentIdx + 1, 0, song);
          } else {
              newQueue.push(song);
          }
          return { ...prev, queue: newQueue };
      });
  };

  const pause = () => {
    setState(s => ({ ...s, isPlaying: false }));
    audioRef.current?.pause();
  };

  const resume = () => {
    setState(s => ({ ...s, isPlaying: true }));
    audioRef.current?.play().catch(e => {
        if (e.name !== 'AbortError') console.error(e);
    });
  };

  // Enhanced Next Logic for Loop & Smart Shuffle
  const next = (isAuto = false) => {
    if (!state.currentSong || state.queue.length === 0) return;
    
    // 1. Single Repeat (Only if Auto-Ended)
    // If Manual Next Click (!isAuto), we skip the repeat check to allow moving to next song
    if (state.repeat === 'one' && isAuto) {
       if (audioRef.current) {
         audioRef.current.currentTime = 0;
         audioRef.current.play().catch(e => { if(e.name !== 'AbortError') console.error(e); });
       }
       return;
    }

    let nextSong: Song | undefined;

    // 2. Shuffle Logic
    if (state.shuffle) {
        let pool = state.queue;
        
        // Smart Shuffle: Prioritize unplayed
        if (state.settings.smartShuffle) {
            const unplayed = state.queue.filter(s => !state.playedSongIds.has(s.id));
            if (unplayed.length > 0) {
                pool = unplayed;
            } else {
                // All played. 
                // If it's an auto-advance and we aren't looping all, stop.
                if (isAuto && state.repeat === 'off') {
                    pause();
                    return;
                }
                // If Manual Next or Repeat All, pick random from full queue (reset logic implicit)
                pool = state.queue;
            }
        }
        
        // Pick random from pool
        // Try to avoid picking the exact same song if possible, unless it's the only one
        let candidates = pool.filter(s => s.id !== state.currentSong?.id);
        if (candidates.length === 0) candidates = pool;
        
        if (candidates.length > 0) {
            const idx = Math.floor(Math.random() * candidates.length);
            nextSong = candidates[idx];
        }
    } else {
        // 3. Sequential Logic
        const currentIndex = state.queue.findIndex(s => s.id === state.currentSong?.id);
        let nextIndex = currentIndex + 1;
        
        if (nextIndex >= state.queue.length) {
            // End of list
            if (state.repeat === 'all' || !isAuto) {
                // Wrap around if Repeat All OR Manual Click (Standard player behavior)
                nextIndex = 0;
            } else {
                // Stop if Auto and No Repeat
                pause();
                return;
            }
        }
        nextSong = state.queue[nextIndex];
    }

    if (nextSong) {
        play(nextSong);
    }
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
        if (file.type.startsWith('audio/') || file.name.endsWith('.flac') || file.name.endsWith('.mp3')) {
            audioFiles.push(file);
        } else if (file.name.endsWith('.lrc')) {
            lrcFiles.push(file);
        }
    }

    const newSongs: Song[] = [];

    for (const file of audioFiles) {
        const url = URL.createObjectURL(file);
        const metadata = await readMetadata(file);
        const duration = await getAudioDuration(file);

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
          duration: duration, 
          fileUrl: url,
          fileBlob: file, 
          coverUrl: metadata.coverUrl,
          lyrics: lyrics,
          dateAdded: Date.now(),
          isLiked: false
        };

        await saveSongToDB(song);
        newSongs.push(song);
    }

    setState(prev => {
        const finalQueue = [...prev.queue, ...newSongs];
        const finalLibrary = [...prev.library, ...newSongs];
        
        if (!prev.currentSong && newSongs.length > 0) {
            setTimeout(() => play(newSongs[0]), 100);
            return { ...prev, library: finalLibrary, queue: finalQueue, currentSong: newSongs[0], isPlaying: true };
        }
        return { ...prev, library: finalLibrary, queue: finalQueue };
    });
  };

  const removeFromQueue = (index: number) => {
      setState(prev => {
          const newQueue = [...prev.queue];
          newQueue.splice(index, 1);
          return { ...prev, queue: newQueue };
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
    setState(prev => {
      // Helper: toggle in a list
      const toggle = (list: Song[]) => list.map(s => s.id === id ? { ...s, isLiked: !s.isLiked } : s);
      
      const newQueue = toggle(prev.queue);
      const newLibrary = toggle(prev.library);
      
      // Crucial: Update currentSong if it matches the ID, otherwise UI won't update instantly
      let newCurrent = prev.currentSong;
      if (newCurrent && newCurrent.id === id) {
          newCurrent = { ...newCurrent, isLiked: !newCurrent.isLiked };
      }

      const updatedSong = newLibrary.find(s => s.id === id);
      if (updatedSong) updateSongInDB(updatedSong);

      return {
          ...prev,
          queue: newQueue,
          library: newLibrary,
          currentSong: newCurrent
      };
    });
  };

  // --- Playlist Logic ---

  const createPlaylist = async (name: string): Promise<Playlist> => {
      const newPlaylist: Playlist = {
          id: generateId(),
          name,
          songs: [],
          createdAt: Date.now(),
          useFirstSongCover: true
      };
      await savePlaylistToDB(newPlaylist);
      setState(prev => ({ ...prev, playlists: [...prev.playlists, newPlaylist] }));
      return newPlaylist;
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
          library: prev.library.filter(s => s.id !== id),
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
          // If toggling off smart shuffle, we might want to reset played history? Optional.
          if (settings.smartShuffle === false) {
             // Keep history for now, just don't use it in logic
          }
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
     setState(prev => {
         const updateList = (list: Song[]) => list.map(s => s.id === id ? { ...s, ...updates } : s);
         
         const newQueue = updateList(prev.queue);
         const newLibrary = updateList(prev.library);
         
         const target = newLibrary.find(s => s.id === id);
         if(target) updateSongInDB(target);

         return {
             ...prev,
             queue: newQueue,
             library: newLibrary,
             currentSong: prev.currentSong?.id === id ? { ...prev.currentSong, ...updates } : prev.currentSong
         };
     });
  };
  
  const openCreatePlaylistModal = (songId?: string) => setCreatePlaylistModal({ isOpen: true, songId: songId || null });
  const closeCreatePlaylistModal = () => setCreatePlaylistModal({ isOpen: false, songId: null });

  return (
    <PlayerContext.Provider value={{
      ...state,
      audioRef,
      play,
      playNext,
      playPlaylist,
      pause,
      resume,
      next,
      prev,
      seek,
      setVolume,
      addToQueue,
      removeFromQueue,
      uploadLyrics,
      toggleLike,
      toggleShuffle,
      toggleRepeat,
      setPlayerOpen: (isOpen) => setState(s => ({...s, isPlayerOpen: isOpen})),
      setQueueOpen: (isOpen) => setState(s => ({...s, isQueueOpen: isOpen})),
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
      updateSettings,
      createPlaylistModal,
      openCreatePlaylistModal,
      closeCreatePlaylistModal
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onLoadedMetadata={(e) => {
            const target = e.target as HTMLAudioElement;
            setState(s => {
                if(s.currentSong && target.duration && s.currentSong.duration !== target.duration) {
                    const updated = { ...s.currentSong, duration: target.duration };
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