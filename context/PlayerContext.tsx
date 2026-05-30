import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Song, PlayerState, VisualMode, NavView, Playlist, AppSettings, SortOption, AiQueueStatus, RecoveryStatus, RecoveryLog } from '../types';
import { readMetadata, generateId, getAudioDuration } from '../utils';
import {
    getPlaylistsFromDB, savePlaylistToDB, deletePlaylistFromDB,
    getSongsFromDB, saveSongToDB, deleteSongFromDB, updateSongInDB
} from '../services/db';
import { fetchPlaylistSongs, getLyric, getSongUrl } from '../services/netease';
import { bulkAiTagging } from '../services/ai';
import { fetchLyrics } from '../services/lyricService';
import { t } from '../utils/i18n';

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
    importNeteasePlaylist: (id: string) => Promise<void>;
    isNeteaseImportOpen: boolean;
    setNeteaseImportOpen: (open: boolean) => void;

    // Bulk Management
    selectionMode: boolean;
    setSelectionMode: (mode: boolean) => void;
    playedSongIds: Set<string>;
    aiQueueStatus: AiQueueStatus;
    playSongs: (songs: Song[]) => void;
    resolveMissingDurations: (songIds: string[]) => Promise<void>;
    selectedSongIds: Set<string>;
    toggleSongSelection: (id: string) => void;
    clearSelection: () => void;
    selectAll: (songIds: string[]) => void;
    bulkDeleteSongs: () => Promise<void>;
    bulkAddToPlaylist: (playlistId: string) => Promise<void>;
    bulkRemoveFromPlaylist: (playlistId: string) => Promise<void>;
    tagSongsWithAi: (songIds: string[]) => Promise<void>;
    tagAllSongs: () => Promise<void>;
    tagUntaggedSongs: () => Promise<void>;
    updateSongTags: (songId: string, tags: string[]) => void;

    // Feedback System
    feedback: {
        isVisible: boolean;
        type: 'alert' | 'confirm' | null;
        title: string;
        message: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    };
    showAlert: (title: string, message: string) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
    closeFeedback: () => void;

    // Lyrics Management
    fetchSongLyrics: (song: Song) => Promise<void>;

    // Tag Editor
    tagEditorSongId: string | null;
    setTagEditorSongId: (id: string | null) => void;

    // Discovery Categories Management
    addDiscoveryCategory: (label: string, color: string) => void;
    deleteDiscoveryCategory: (id: string) => void;
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
            lyricFontFamily: 'Inter, sans-serif',
            lyricSource: 'lrccx',
            neteaseSource: 'meting'
        },
        aiQueueStatus: {
            total: 0,
            completed: 0,
            errors: 0,
            isProcessing: false
        }
    });

    const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>({
        total: 0,
        checked: 0,
        fixed: 0,
        failed: 0,
        isProcessing: false,
        logs: []
    });

    const [createPlaylistModal, setCreatePlaylistModal] = useState<{ isOpen: boolean; songId: string | null }>({ isOpen: false, songId: null });
    const [isNeteaseImportOpen, setNeteaseImportOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState<PlayerContextType['feedback']>({
        isVisible: false,
        type: null,
        title: '',
        message: ''
    });
    const [tagEditorSongId, setTagEditorSongId] = useState<string | null>(null);

    const DEFAULT_DISCOVERY_CATEGORIES = [
        { id: 'moodRelax', color: 'from-blue-500 to-teal-400', label: t(state.settings.language, 'moodRelax') },
        { id: 'moodWorkout', color: 'from-orange-500 to-red-500', label: t(state.settings.language, 'moodWorkout') },
        { id: 'genrePop', color: 'from-pink-500 to-rose-400', label: t(state.settings.language, 'genrePop') },
        { id: 'genreElectronic', color: 'from-purple-600 to-indigo-500', label: t(state.settings.language, 'genreElectronic') },
        { id: 'moodFocus', color: 'from-cyan-500 to-blue-600', label: t(state.settings.language, 'moodFocus') },
        { id: 'genreRock', color: 'from-amber-600 to-orange-700', label: t(state.settings.language, 'genreRock') },
        { id: 'genreHipHop', color: 'from-emerald-500 to-teal-600', label: t(state.settings.language, 'genreHipHop') },
        { id: 'genreRnB', color: 'from-fuchsia-500 to-purple-600', label: t(state.settings.language, 'genreRnB') },
    ];

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
                if (!parsedSettings.discoveryCategories || parsedSettings.discoveryCategories.length === 0) {
                    parsedSettings.discoveryCategories = DEFAULT_DISCOVERY_CATEGORIES;
                }
                if (!parsedSettings.lyricSource) {
                    parsedSettings.lyricSource = 'lrccx';
                }
                if (!parsedSettings.neteaseSource) {
                    parsedSettings.neteaseSource = 'meting';
                }

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

    const playSongs = (songs: Song[]) => {
        if (songs.length === 0) return;

        setState(prev => {
            const firstSong = songs[0];
            const newPlayed = new Set(prev.playedSongIds);
            newPlayed.add(firstSong.id);

            return {
                ...prev,
                queue: songs,
                currentSong: firstSong,
                isPlaying: true,
                playedSongIds: newPlayed,
                history: prev.currentSong ? [...prev.history, prev.currentSong] : prev.history
            };
        });

        if (audioRef.current) {
            audioRef.current.src = songs[0].fileUrl;
            audioRef.current.play().catch(e => {
                if (e.name !== 'AbortError') console.error(e);
            });
        }
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
                audioRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error(e); });
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

        // AI Auto Tagging
        if (state.settings.autoAiTagging && state.settings.deepseekApiKey && newSongs.length > 0) {
            tagSongsWithAi(newSongs.map(s => s.id));
        }
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
        try {
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
        } catch (error: any) {
            console.error("Error creating playlist:", error);
            throw error;
        }
    };

    const updatePlaylist = async (id: string, updates: Partial<Playlist>) => {
        try {
            const playlist = state.playlists.find(p => p.id === id);
            if (playlist) {
                const updated = { ...playlist, ...updates };
                await savePlaylistToDB(updated);
                setState(prev => ({
                    ...prev,
                    playlists: prev.playlists.map(p => p.id === id ? updated : p)
                }));
            }
        } catch (error: any) {
            console.error("Error updating playlist:", error);
        }
    };

    const addToPlaylist = async (playlistId: string, songId: string) => {
        try {
            // Functional update to avoid stale state in loops
            setState(prev => {
                const playlist = prev.playlists.find(p => p.id === playlistId);
                if (playlist && !playlist.songs.includes(songId)) {
                    const updated = { ...playlist, songs: [...playlist.songs, songId] };
                    savePlaylistToDB(updated); // Sync to DB in background
                    return {
                        ...prev,
                        playlists: prev.playlists.map(p => p.id === playlistId ? updated : p)
                    };
                }
                return prev;
            });
        } catch (error: any) {
            console.error("Error adding to playlist:", error);
        }
    };

    const removeFromPlaylist = async (playlistId: string, songId: string) => {
        try {
            const playlist = state.playlists.find(p => p.id === playlistId);
            if (playlist) {
                const updated = { ...playlist, songs: playlist.songs.filter(id => id !== songId) };
                await savePlaylistToDB(updated);
                setState(prev => ({
                    ...prev,
                    playlists: prev.playlists.map(p => p.id === playlistId ? updated : p)
                }));
            }
        } catch (error: any) {
            console.error("Error removing from playlist:", error);
        }
    };

    const deletePlaylist = async (id: string) => {
        try {
            await deletePlaylistFromDB(id);
            setState(prev => ({
                ...prev,
                playlists: prev.playlists.filter(p => p.id !== id),
                navView: prev.navView === 'playlist' && prev.activePlaylistId === id ? 'library' : prev.navView
            }));
        } catch (error: any) {
            console.error("Error deleting playlist:", error);
        }
    };

    const deleteSong = async (id: string) => {
        try {
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
        } catch (error: any) {
            console.error("Error deleting song:", error);
        }
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
            if (target) updateSongInDB(target);

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

    const fetchSongLyrics = async (song: Song) => {
        try {
            const lyrics = await fetchLyrics(song, state.settings);
            if (lyrics) {
                updateSongMetadata(song.id, { lyrics });
            }
        } catch (e) {
            console.error("Failed to fetch lyrics:", e);
        }
    };

    const resolveMissingDurations = async (songIds: string[]) => {
        // Use a more robust approach to get the latest library
        let targets: Song[] = [];

        // We'll pull from state.library directly in each iteration or filter once 
        // if we are sure it's stable enough. 
        setState(prev => {
            targets = prev.library.filter(s => songIds.includes(s.id) && s.duration === 0);
            return prev;
        });

        if (targets.length === 0) return;
        console.log(`[DurationFix] Starting auto-detection for ${targets.length} songs...`);

        for (const song of targets) {
            try {
                const duration = await new Promise<number>((resolve) => {
                    const audio = new Audio();
                    audio.src = song.fileUrl;
                    audio.preload = 'metadata';

                    const timeout = setTimeout(() => {
                        console.warn(`[DurationFix] Timeout for ${song.title}`);
                        cleanup(0);
                    }, 15000); // Increased timeout to 15s

                    const cleanup = (dur: number) => {
                        audio.onloadedmetadata = null;
                        audio.onerror = null;
                        audio.src = '';
                        audio.load();
                        resolve(dur);
                    };

                    audio.onloadedmetadata = () => {
                        clearTimeout(timeout);
                        const dur = audio.duration;
                        if (dur && dur !== Infinity && !isNaN(dur)) {
                            cleanup(dur);
                        } else {
                            cleanup(0);
                        }
                    };

                    audio.onerror = () => {
                        clearTimeout(timeout);
                        cleanup(0);
                    };
                });

                if (duration > 0) {
                    console.log(`[DurationFix] ${song.title} -> ${duration.toFixed(1)}s`);
                    updateSongMetadata(song.id, { duration });
                }
            } catch (err) {
                console.warn("[DurationFix] Error:", err);
            }
        }
    };

    const importNeteasePlaylist = async (playlistId: string, forcedSource?: 'official' | 'paugram' | 'meting') => {
        try {
            const source = forcedSource || state.settings.neteaseSource;
            let mirror: string | undefined = undefined;
            if (source === 'paugram') mirror = 'https://api.paugram.com/netease/';
            if (source === 'meting') mirror = 'https://api.qijieya.cn/meting/';

            const { songs, playlistName, mirrorUsed } = await fetchPlaylistSongs(playlistId, mirror);
            const playlistSongIds = songs.map(s => `netease-${s.id}`);
            const newSongs: Song[] = [];

            // Auto-Playlist Logic: Resolve Target ID
            let targetPlaylistId = state.playlists.find(p => p.name === playlistName)?.id;
            if (!targetPlaylistId) {
                const newPl = await createPlaylist(playlistName);
                targetPlaylistId = newPl.id;
            }
            const finalTargetId = targetPlaylistId!;

            for (const s of songs) {
                // Ensure unique ID even if multiple imports happen or ID collisions occur in API
                const songId = `netease-${s.id}`;

                // Check if already in library
                const existingIndex = state.library.findIndex(item => item.id === songId);
                if (existingIndex !== -1) {
                    const existingSong = state.library[existingIndex];
                    if (!existingSong.sourcePlaylistId) {
                        updateSongMetadata(songId, { sourcePlaylistId: playlistId });
                    }
                    continue;
                }

                const normalizedSong: Song = {
                    id: songId,
                    title: s.name,
                    artist: (s.ar || s.artists || []).map(a => a.name).join(', '),
                    album: (s.al as any)?.name || 'Netease Album',
                    duration: s.dt ? (s.dt > 10000 ? s.dt / 1000 : s.dt) : 0,
                    fileUrl: s.url || `https://music.163.com/song/media/outer/url?id=${s.id}.mp3`,
                    coverUrl: s.al?.picUrl,
                    dateAdded: Date.now(),
                    isLiked: false,
                    neteaseId: s.id,
                    mirror: mirrorUsed,
                    sourcePlaylistId: playlistId
                };

                // Try to fetch lyrics or use embedded ones
                if (s.lrc) {
                    // Meting provides direct LRC content or URL
                    if (s.lrc.startsWith('http')) {
                        fetch(s.lrc).then(r => r.text()).then(l => {
                            if (l) updateSongMetadata(songId, { lyrics: l });
                        });
                    } else {
                        updateSongMetadata(songId, { lyrics: s.lrc });
                    }
                } else {
                    getLyric(s.id, mirrorUsed).then(lrc => {
                        if (lrc) updateSongMetadata(songId, { lyrics: lrc });
                    });
                }

                await saveSongToDB(normalizedSong);
                newSongs.push(normalizedSong);
            }

            // Perform a single atomic state update for both library and target playlist
            setState(prev => {
                const updatedLibrary = [...prev.library, ...newSongs];

                let updatedPlaylists = prev.playlists;
                const pl = prev.playlists.find(p => p.id === finalTargetId);
                if (pl) {
                    // Use Set to ensure uniqueness when merging existing and new song IDs
                    const mergedSongs = Array.from(new Set([...pl.songs, ...playlistSongIds]));
                    const updatedPl = { ...pl, songs: mergedSongs };
                    savePlaylistToDB(updatedPl);
                    updatedPlaylists = prev.playlists.map(p => p.id === finalTargetId ? updatedPl : p);
                }

                return {
                    ...prev,
                    library: updatedLibrary,
                    playlists: updatedPlaylists,
                    queue: prev.queue.length === 0 ? updatedLibrary : prev.queue
                };
            });

            if (newSongs.length > 0 || playlistSongIds.length > 0) {
                showAlert("导入成功", `成功从 "${playlistName}" 同步了 ${playlistSongIds.length} 首歌曲。`);

                // Automatically resolve missing durations in background
                setTimeout(() => resolveMissingDurations(playlistSongIds), 2000);

                // Trigger AI auto tagging if enabled
                if (state.settings.autoAiTagging && state.settings.deepseekApiKey && newSongs.length > 0) {
                    setTimeout(() => tagSongsWithAi(newSongs.map(s => s.id)), 1000);
                }
            } else {
                showAlert("导入提示", "没有发现新歌曲。");
            }
        } catch (error) {
            console.error("Netease Import Failed:", error);
            showAlert("导入失败", "连接 API 失败或无效的歌单 ID。");
        }
    };

    // --- Bulk Management Logic ---
    const toggleSongSelection = (id: string) => {
        setSelectedSongIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedSongIds(new Set());

    const selectAll = (songIds: string[]) => setSelectedSongIds(new Set(songIds));

    const bulkDeleteSongs = async () => {
        if (selectedSongIds.size === 0) return;
        showConfirm("批量删除", `确定要从库中删除选中的 ${selectedSongIds.size} 首歌曲吗？`, async () => {
            const idsToRemove = Array.from<string>(selectedSongIds);
            for (const id of idsToRemove) {
                await deleteSong(id);
            }
            clearSelection();
        });
    };

    const bulkAddToPlaylist = async (playlistId: string) => {
        if (selectedSongIds.size === 0) return;
        const idsToAdd = Array.from<string>(selectedSongIds);

        setState(prev => {
            const pl = prev.playlists.find(p => p.id === playlistId);
            if (!pl) return prev;

            const newSongs = [...pl.songs];
            let addedCount = 0;
            for (const id of idsToAdd) {
                if (!newSongs.includes(id)) {
                    newSongs.push(id);
                    addedCount++;
                }
            }

            if (addedCount === 0) return prev;

            const updatedPl = { ...pl, songs: newSongs };
            savePlaylistToDB(updatedPl);

            return {
                ...prev,
                playlists: prev.playlists.map(p => p.id === playlistId ? updatedPl : p)
            };
        });

        const count = idsToAdd.length;
        clearSelection();
        showAlert("批量添加", `成功将 ${count} 首歌曲添加到歌单。`);
    };

    const bulkRemoveFromPlaylist = async (playlistId: string) => {
        if (selectedSongIds.size === 0) return;
        const idsToRemove = Array.from<string>(selectedSongIds);

        if (playlistId === 'liked') {
            // For 'liked' playlist, removal means unliking
            setState(prev => {
                const newLibrary = prev.library.map(s =>
                    selectedSongIds.has(s.id) ? { ...s, isLiked: false } : s
                );

                const newQueue = prev.queue.map(s =>
                    selectedSongIds.has(s.id) ? { ...s, isLiked: false } : s
                );

                // Update DB for each affected song
                idsToRemove.forEach(id => {
                    const song = newLibrary.find(s => s.id === id);
                    if (song) updateSongInDB(song);
                });

                return {
                    ...prev,
                    library: newLibrary,
                    queue: newQueue,
                    currentSong: prev.currentSong && selectedSongIds.has(prev.currentSong.id)
                        ? { ...prev.currentSong, isLiked: false }
                        : prev.currentSong
                };
            });
        } else {
            // For regular playlists
            setState(prev => {
                const pl = prev.playlists.find(p => p.id === playlistId);
                if (!pl) return prev;

                const updatedSongs = pl.songs.filter(id => !selectedSongIds.has(id));
                const updatedPl = { ...pl, songs: updatedSongs };
                savePlaylistToDB(updatedPl);

                return {
                    ...prev,
                    playlists: prev.playlists.map(p => p.id === playlistId ? updatedPl : p)
                };
            });
        }

        clearSelection();
        setSelectionMode(false);
    };

    const updateSongTags = (songId: string, tags: string[]) => {
        setState(prev => {
            const updateList = (list: Song[]) => list.map(s => s.id === songId ? { ...s, tags, isAiTagged: true } : s);
            const newLibrary = updateList(prev.library);
            const newQueue = updateList(prev.queue);

            const target = newLibrary.find(s => s.id === songId);
            if (target) updateSongInDB(target);

            return {
                ...prev,
                library: newLibrary,
                queue: newQueue,
                currentSong: prev.currentSong?.id === songId ? { ...prev.currentSong, tags, isAiTagged: true } : prev.currentSong
            };
        });
    };

    const tagSongsWithAi = async (songIds: string[]) => {
        if (!state.settings.deepseekApiKey) {
            showAlert(t(state.settings.language, 'aiTagging'), "Please set DeepSeek API Key in settings first.");
            return;
        }

        const songsToTag = state.library.filter(s => songIds.includes(s.id));
        if (songsToTag.length === 0) return;

        setState(prev => ({
            ...prev,
            aiQueueStatus: {
                total: songsToTag.length,
                completed: 0,
                errors: 0,
                isProcessing: true
            }
        }));

        try {
            const results = await bulkAiTagging(
                songsToTag,
                state.settings.deepseekApiKey,
                [...(state.settings.customTags || []), ...(state.settings.discoveryCategories?.map(c => c.label) || [])],
                (completedCount) => {
                    setState(prev => ({
                        ...prev,
                        aiQueueStatus: {
                            ...prev.aiQueueStatus,
                            completed: completedCount
                        }
                    }));
                }
            );

            // Apply results
            setState(prev => {
                let newLib = [...prev.library];
                let newQueue = [...prev.queue];

                results.forEach(res => {
                    const updater = (s: Song) => s.id === res.id ? { ...s, tags: res.tags, isAiTagged: true } : s;
                    newLib = newLib.map(updater);
                    newQueue = newQueue.map(updater);

                    const song = newLib.find(s => s.id === res.id);
                    if (song) updateSongInDB(song);
                });

                return {
                    ...prev,
                    library: newLib,
                    queue: newQueue,
                    aiQueueStatus: {
                        ...prev.aiQueueStatus,
                        isProcessing: false
                    },
                    currentSong: prev.currentSong && results.find(r => r.id === prev.currentSong?.id)
                        ? { ...prev.currentSong, tags: results.find(r => r.id === prev.currentSong?.id)!.tags, isAiTagged: true }
                        : prev.currentSong
                };
            });

            showAlert(t(state.settings.language, 'aiTagging'), t(state.settings.language, 'taggingComplete'));
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                aiQueueStatus: {
                    ...prev.aiQueueStatus,
                    errors: prev.aiQueueStatus.errors + 1,
                    isProcessing: false
                }
            }));
            showAlert("AI Error", error.message || "Failed to tag songs");
        }
    };

    const tagAllSongs = async () => {
        const ids = state.library.map(s => s.id);
        if (ids.length === 0) {
            showAlert(t(state.settings.language, 'aiTagging'), "No songs in library.");
            return;
        }
        await tagSongsWithAi(ids);
    };

    const tagUntaggedSongs = async () => {
        const ids = state.library.filter(s => !s.isAiTagged).map(s => s.id);
        if (ids.length === 0) {
            showAlert(t(state.settings.language, 'aiTagging'), "All songs are already tagged.");
            return;
        }
        await tagSongsWithAi(ids);
    };

    // --- Feedback Helpers ---
    const showAlert = (title: string, message: string) => {
        setFeedback({ isVisible: true, type: 'alert', title, message });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setFeedback({ isVisible: true, type: 'confirm', title, message, onConfirm });
    };

    const closeFeedback = () => setFeedback(prev => ({ ...prev, isVisible: false }));

    const fixInvalidLinks = async () => {
        if (recoveryStatus.isProcessing) return;

        const neteaseSongs = state.library.filter(s => !!s.neteaseId);
        if (neteaseSongs.length === 0) {
            showAlert(t(state.settings.language, 'linkRecovery'), t(state.settings.language, 'noInvalidLinks'));
            return;
        }

        setRecoveryStatus({
            total: neteaseSongs.length,
            checked: 0,
            fixed: 0,
            failed: 0,
            isProcessing: true,
            logs: []
        });

        const addLog = (log: Omit<RecoveryLog, 'id' | 'timestamp'>) => {
            setRecoveryStatus(prev => ({
                ...prev,
                logs: [{ ...log, id: generateId(), timestamp: Date.now() }, ...prev.logs].slice(0, 100)
            }));
        };

        const invalidSongs: Song[] = [];

        // --- PHASE 1: Detection ---
        addLog({ songTitle: '-', status: 'checking', message: 'Starting detection scan...' });

        const CONCURRENCY = 8;
        const scanQueue = [...neteaseSongs];
        const scanWorkers = Array(CONCURRENCY).fill(null).map(async () => {
            while (scanQueue.length > 0) {
                const song = scanQueue.shift();
                if (!song) break;

                try {
                    // Quick check
                    let isValid = false;
                    try {
                        await fetch(song.fileUrl, { method: 'HEAD', mode: 'no-cors' });
                        isValid = true;
                    } catch (e) {
                        isValid = false;
                    }

                    if (isValid) {
                        isValid = await new Promise<boolean>((resolve) => {
                            const audio = new Audio();
                            audio.src = song.fileUrl;
                            audio.onloadedmetadata = () => { audio.src = ''; audio.load(); resolve(true); };
                            audio.onerror = () => { audio.src = ''; audio.load(); resolve(false); };
                            setTimeout(() => { audio.src = ''; audio.load(); resolve(false); }, 4000);
                        });
                    }

                    if (!isValid) {
                        invalidSongs.push(song);
                        addLog({ songTitle: song.title, status: 'failed', message: 'Link expired' });
                        setRecoveryStatus(prev => ({ ...prev, checked: prev.checked + 1, failed: prev.failed + 1 }));
                    } else {
                        setRecoveryStatus(prev => ({ ...prev, checked: prev.checked + 1 }));
                    }
                } catch (error) {
                    setRecoveryStatus(prev => ({ ...prev, checked: prev.checked + 1 }));
                }
            }
        });

        await Promise.all(scanWorkers);

        if (invalidSongs.length === 0) {
            setRecoveryStatus(prev => ({ ...prev, isProcessing: false }));
            showAlert(t(state.settings.language, 'linkRecovery'), t(state.settings.language, 'noInvalidLinks'));
            return;
        }

        // --- PHASE 2: Batch Recovery ---
        addLog({ songTitle: '-', status: 'checking', message: `Found ${invalidSongs.length} broken links. Starting recovery...` });

        // Group by playlist ID
        const playlistGroups = new Map<string, Song[]>();
        const individualFixes: Song[] = [];

        for (const song of invalidSongs) {
            if (song.sourcePlaylistId) {
                const group = playlistGroups.get(song.sourcePlaylistId) || [];
                group.push(song);
                playlistGroups.set(song.sourcePlaylistId, group);
            } else {
                individualFixes.push(song);
            }
        }

        // 1. Batch recovery via playlists
        const source = state.settings.neteaseSource;
        let mirror: string | undefined = undefined;
        if (source === 'paugram') mirror = 'https://api.paugram.com/netease/';
        if (source === 'meting') mirror = 'https://api.qijieya.cn/meting/';

        for (const [playlistId, songsToFix] of playlistGroups.entries()) {
            try {
                addLog({ songTitle: `Playlist ${playlistId}`, status: 'checking', message: `Fetching playlist data to recover ${songsToFix.length} songs...` });
                const { songs: freshSongsData } = await fetchPlaylistSongs(playlistId, mirror);

                let fixedInThisBatch = 0;
                for (const songToFix of songsToFix) {
                    const freshData = freshSongsData.find(s => String(s.id) === String(songToFix.neteaseId));
                    if (freshData && freshData.url && freshData.url !== songToFix.fileUrl) {
                        updateSongMetadata(songToFix.id, { fileUrl: freshData.url });
                        fixedInThisBatch++;
                        addLog({ songTitle: songToFix.title, status: 'fixed', message: 'Recovered via playlist batch' });
                        setRecoveryStatus(prev => ({ ...prev, fixed: prev.fixed + 1 }));
                    } else {
                        // Fallback to individual
                        individualFixes.push(songToFix);
                    }
                }
            } catch (error) {
                addLog({ songTitle: `Playlist ${playlistId}`, status: 'failed', message: `Batch failed: ${error}. Falling back to individual fix.` });
                individualFixes.push(...songsToFix);
            }
        }

        // 2. Individual recovery fallback
        if (individualFixes.length > 0) {
            addLog({ songTitle: '-', status: 'checking', message: `Running individual recovery for ${individualFixes.length} items...` });
            const individualQueue = [...individualFixes];
            const individualWorkers = Array(3).fill(null).map(async () => {
                while (individualQueue.length > 0) {
                    const song = individualQueue.shift();
                    if (!song) break;

                    try {
                        const newUrl = await getSongUrl(song.neteaseId!, mirror);
                        if (newUrl && newUrl !== song.fileUrl) {
                            updateSongMetadata(song.id, { fileUrl: newUrl });
                            addLog({ songTitle: song.title, status: 'fixed', message: 'Recovered individually' });
                            setRecoveryStatus(prev => ({ ...prev, fixed: prev.fixed + 1 }));
                        } else {
                            addLog({ songTitle: song.title, status: 'failed', message: 'Recovery failed' });
                        }
                    } catch (e) {
                        addLog({ songTitle: song.title, status: 'failed', message: `Recovery error: ${e}` });
                    }
                }
            });
            await Promise.all(individualWorkers);
        }

        setRecoveryStatus(prev => ({ ...prev, isProcessing: false }));
        showAlert(t(state.settings.language, 'linkRecovery'), t(state.settings.language, 'recoveryComplete'));
    };

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
            updateSettings,
            fetchSongLyrics,
            toggleShuffle,
            toggleRepeat,
            setPlayerOpen: (isOpen) => setState(s => ({ ...s, isPlayerOpen: isOpen })),
            setQueueOpen: (isOpen) => setState(s => ({ ...s, isQueueOpen: isOpen })),
            setNavView: (navView) => setState(s => ({ ...s, navView })),
            setActivePlaylist: (id) => setState(s => ({ ...s, activePlaylistId: id })),
            setVisualMode: (visualMode) => setState(s => ({ ...s, visualMode })),
            setSearchQuery: (searchQuery) => setState(s => ({ ...s, searchQuery })),
            setSortOption: (option) => setState(s => ({ ...s, sortOption: option })),
            updateSongMetadata,
            createPlaylist,
            updatePlaylist,
            addToPlaylist,
            removeFromPlaylist,
            deletePlaylist,
            deleteSong,
            createPlaylistModal,
            openCreatePlaylistModal,
            closeCreatePlaylistModal,
            importNeteasePlaylist,
            isNeteaseImportOpen,
            setNeteaseImportOpen,
            selectionMode,
            setSelectionMode,
            selectedSongIds,
            toggleSongSelection,
            clearSelection,
            selectAll,
            bulkDeleteSongs,
            bulkAddToPlaylist,
            bulkRemoveFromPlaylist,
            feedback,
            showAlert,
            showConfirm,
            closeFeedback,
            tagSongsWithAi,
            tagAllSongs,
            tagUntaggedSongs,
            updateSongTags,
            tagEditorSongId,
            setTagEditorSongId,
            playSongs,
            resolveMissingDurations,
            addDiscoveryCategory: (label, color) => {
                const newCat = { id: generateId(), label, color };
                updateSettings({ discoveryCategories: [...(state.settings.discoveryCategories || []), newCat] });
            },
            deleteDiscoveryCategory: (id) => {
                updateSettings({ discoveryCategories: (state.settings.discoveryCategories || []).filter(c => c.id !== id) });
            },
            recoveryStatus,
            fixInvalidLinks
        }}>
            {children}
            <audio
                ref={audioRef}
                onLoadedMetadata={(e) => {
                    const target = e.target as HTMLAudioElement;
                    setState(s => {
                        if (s.currentSong && target.duration && s.currentSong.duration !== target.duration) {
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