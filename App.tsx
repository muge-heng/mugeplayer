import React, { useState, useRef, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import LyricsView from './components/LyricsView';
import QueueView from './components/QueueView';
import MobileNav from './components/MobileNav';
import AuroraBackground from './components/AuroraBackground';
import NeteaseImportModal from './components/NeteaseImportModal';
import FeedbackModal from './components/FeedbackModal';
import TagEditor from './components/TagEditor';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Trash2, List, Settings, Edit2, Camera, X, PlayCircle, DownloadCloud, ListX, HeartOff, Clock, Zap, ArrowUpRight, History, Tag, Sparkles, Filter, Plus, Play, Terminal, RefreshCw } from 'lucide-react';
import { t } from './utils/i18n';
import ContextMenu from './components/ContextMenu';
import { ContextMenuState, Playlist } from './types';

const HomePage: React.FC = () => {
    const { history, play, playlists, library, setActivePlaylist, setNavView, settings } = usePlayer();
    const recent = [...history].reverse().slice(0, 6);

    // Helper to get playlist cover correctly
    const getPlaylistCover = (pl: Playlist) => {
        if (pl.coverUrl) return pl.coverUrl;
        if (pl.useFirstSongCover && pl.songs.length > 0) {
            const song = library.find(s => s.id === pl.songs[0]);
            if (song && song.coverUrl) return song.coverUrl;
        }
        return null;
    };

    return (
        <div className="p-8 pb-40 md:pb-32 overflow-y-auto h-full hide-scrollbar">
            <h1 className="text-3xl font-bold mb-6 text-textPrimary">
                {new Date().getHours() < 12 ? t(settings.language, 'goodMorning') : t(settings.language, 'goodEvening')}
            </h1>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-textSecondary">{t(settings.language, 'playHistory')}</h2>
                {recent.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {recent.map((song, i) => (
                            <div
                                key={`${song.id}-${i}`}
                                onClick={() => play(song)}
                                className="bg-white/5 hover:bg-white/20 transition rounded overflow-hidden flex items-center cursor-pointer group shadow-lg border border-white/5 glass-panel h-16 md:h-20"
                            >
                                <div className="w-16 h-full bg-gray-800 flex-shrink-0">
                                    {song.coverUrl ? (
                                        <img src={song.coverUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">🎵</div>
                                    )}
                                </div>
                                {/* Layout Fix: min-w-0 ensures truncation works inside flex */}
                                <div className="px-3 flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="font-bold text-textPrimary truncate text-sm md:text-base">{song.title}</div>
                                </div>
                                <div className="mr-4 opacity-0 group-hover:opacity-100 transition shadow-xl bg-spotGreen rounded-full p-2 text-white hidden md:block">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-textSecondary">Play some music to see your history here.</div>
                )}
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4 text-textSecondary">{t(settings.language, 'playlists')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {playlists.map(pl => {
                        const cover = getPlaylistCover(pl);
                        return (
                            <div
                                key={pl.id}
                                onClick={() => {
                                    setActivePlaylist(pl.id);
                                    setNavView('playlist');
                                }}
                                className="bg-cardBg p-4 rounded-lg hover:bg-cardHover transition cursor-pointer group shadow-sm hover:shadow-lg border border-transparent hover:border-borderColor glass-panel"
                            >
                                <div className="w-full aspect-square bg-gray-800 rounded-md mb-4 overflow-hidden shadow-lg relative">
                                    {cover ? (
                                        <img src={cover} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-white/5">
                                            <List size={40} />
                                        </div>
                                    )}
                                </div>
                                <div className="font-bold truncate text-textPrimary">{pl.name}</div>
                                <div className="text-sm text-textSecondary">By You</div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

const PlaylistView: React.FC = () => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, songId: null });
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [isDraggingSelect, setIsDraggingSelect] = useState(false);
    const [dragActionType, setDragActionType] = useState<'select' | 'deselect' | null>(null);

    const {
        activePlaylistId, playlists, library, play, playPlaylist, currentSong,
        updatePlaylist, removeFromPlaylist, settings,
        selectionMode, setSelectionMode, selectedSongIds, toggleSongSelection,
        clearSelection, bulkRemoveFromPlaylist, bulkAddToPlaylist, selectAll,
        bulkDeleteSongs
    } = usePlayer();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle Virtual Playlist for Liked Songs
    let playlist: Playlist | undefined = playlists.find(p => p.id === activePlaylistId);

    if (activePlaylistId === 'liked') {
        playlist = {
            id: 'liked',
            name: t(settings.language, 'likedSongs'),
            description: 'Your favorite tracks',
            songs: library.filter(s => s.isLiked).map(s => s.id),
            createdAt: 0,
            useFirstSongCover: true
        };
    }

    if (!playlist) return <div className="p-8 text-gray-400">Playlist not found</div>;

    const playlistSongs = playlist.songs.map(id => library.find(s => s.id === id)).filter((s): s is any => !!s);

    // Determine effective cover
    let displayCover = playlist.coverUrl;
    if (!displayCover && playlist.useFirstSongCover && playlistSongs.length > 0 && playlistSongs[0].coverUrl) {
        displayCover = playlistSongs[0].coverUrl;
    }

    const startEdit = () => {
        setEditName(playlist!.name);
        setEditDesc(playlist!.description || '');
        setIsEditing(true);
    };

    const saveEdit = () => {
        if (playlist!.id !== 'liked') {
            updatePlaylist(playlist!.id, { name: editName, description: editDesc });
        }
        setIsEditing(false);
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (playlist!.id === 'liked') return;
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    updatePlaylist(playlist!.id, { coverUrl: ev.target.result as string, useFirstSongCover: false });
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, songId: string) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, songId, playlistId: playlist!.id === 'liked' ? undefined : playlist!.id });
    };

    const handleSongClick = (e: React.MouseEvent, songId: string, index: number) => {
        if (!selectionMode) {
            play(playlistSongs[index]);
            return;
        }

        if (e.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const idsToToggle = playlistSongs.slice(start, end + 1).map(s => s.id);

            const shouldSelect = selectedSongIds.has(playlistSongs[lastSelectedIndex].id);
            idsToToggle.forEach(id => {
                if (shouldSelect) {
                    if (!selectedSongIds.has(id)) toggleSongSelection(id);
                } else {
                    if (selectedSongIds.has(id)) toggleSongSelection(id);
                }
            });
        } else {
            toggleSongSelection(songId);
        }
        setLastSelectedIndex(index);
    };

    const handleMouseDown = (songId: string, index: number) => {
        if (!selectionMode) return;
        setIsDraggingSelect(true);
        const willSelect = !selectedSongIds.has(songId);
        setDragActionType(willSelect ? 'select' : 'deselect');
        toggleSongSelection(songId);
        setLastSelectedIndex(index);
    };

    const handleMouseEnter = (songId: string, index: number) => {
        if (!isDraggingSelect || !selectionMode || !dragActionType) return;

        const isCurrentlySelected = selectedSongIds.has(songId);
        if (dragActionType === 'select' && !isCurrentlySelected) {
            toggleSongSelection(songId);
        } else if (dragActionType === 'deselect' && isCurrentlySelected) {
            toggleSongSelection(songId);
        }
    };

    const handleMouseUp = () => {
        setIsDraggingSelect(false);
        setDragActionType(null);
    };

    const isSystem = activePlaylistId === 'liked';

    return (
        <div
            className="h-full flex flex-col overflow-y-auto hide-scrollbar pb-48 md:pb-40 relative select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                songId={contextMenu.songId}
                playlistId={contextMenu.playlistId}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
            />
            {/* Header with gradient background based on theme or basic color */}
            <div className={`p-8 flex flex-col md:flex-row items-end gap-6 bg-gradient-to-b from-spotGreen/10 to-transparent`}>
                <div className={`group relative w-52 h-52 shadow-2xl ${isSystem ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-cardBg'} rounded flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/10`}>
                    {displayCover ? <img src={displayCover} className="w-full h-full object-cover" /> : <List size={64} className="text-textSecondary" />}

                    {!isSystem && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                            <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-spotGreen flex flex-col items-center">
                                <Camera size={24} />
                                <span className="text-xs font-bold mt-1">{t(settings.language, 'uploadCover')}</span>
                            </button>
                            <button onClick={() => updatePlaylist(playlist!.id, { useFirstSongCover: true, coverUrl: undefined })} className="text-white text-xs hover:text-spotGreen mt-2">
                                {t(settings.language, 'useFirstSong')}
                            </button>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                </div>

                <div className="flex-1 w-full relative">
                    <div className="uppercase text-xs font-bold mt-2 text-textSecondary">{isSystem ? t(settings.language, 'systemPlaylist') : t(settings.language, 'playlist')}</div>

                    <div className="absolute top-0 right-0 flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (selectionMode) clearSelection();
                                setSelectionMode(!selectionMode);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 border ${selectionMode ? 'bg-spotGreen/20 border-spotGreen text-spotGreen' : 'bg-white/5 border-white/5 text-textSecondary hover:text-textPrimary'}`}
                        >
                            <List size={14} />
                            <span className="hidden md:inline">{selectionMode ? t(settings.language, 'exitManage') : t(settings.language, 'bulkManage')}</span>
                        </button>
                    </div>

                    {isEditing && !isSystem ? (
                        <div className="mt-2 space-y-2">
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="text-4xl font-bold bg-inputBg p-2 rounded w-full text-textPrimary border border-borderColor glass-panel" />
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t(settings.language, 'playlistDesc')} className="text-sm bg-inputBg p-2 rounded w-full text-textPrimary border border-borderColor glass-panel" />
                            <div className="flex gap-2">
                                <button onClick={saveEdit} className="bg-spotGreen text-white px-4 py-1 rounded font-bold">{t(settings.language, 'save')}</button>
                                <button onClick={() => setIsEditing(false)} className="bg-white/10 px-4 py-1 rounded text-textPrimary glass-panel">{t(settings.language, 'cancel')}</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className={`text-4xl md:text-6xl font-bold mt-2 mb-2 text-textPrimary ${!isSystem ? 'cursor-pointer hover:underline' : ''}`} onClick={!isSystem ? startEdit : undefined}>{playlist.name}</h1>
                            <p className={`text-textSecondary text-sm mb-4 ${!isSystem ? 'cursor-pointer hover:text-textPrimary' : ''}`} onClick={!isSystem ? startEdit : undefined}>{playlist.description || t(settings.language, 'playlistDesc')}</p>

                            <div className="flex items-center gap-4 mt-4">
                                {/* Play Entire Playlist Button */}
                                <button
                                    onClick={() => playPlaylist(playlist!.id)}
                                    className="bg-spotGreen text-white rounded-full p-3 hover:scale-105 active:scale-95 transition shadow-lg"
                                >
                                    <PlayCircle size={32} fill="currentColor" className="ml-0.5" />
                                </button>

                                <div className="text-sm font-medium text-textSecondary flex items-center gap-2">
                                    <span>{playlist.songs.length} {t(settings.language, 'songs')}</span>
                                    {!isSystem && <button onClick={startEdit} className="opacity-50 hover:opacity-100 text-textPrimary"><Edit2 size={16} /></button>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="p-4 md:p-6">
                {playlistSongs.length === 0 && (
                    <div className="text-textSecondary italic py-10 text-center">{t(settings.language, 'noSongs')}</div>
                )}
                {playlistSongs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    const isSelected = selectedSongIds.has(song.id);
                    return (
                        <div
                            key={song.id}
                            onClick={(e) => handleSongClick(e, song.id, index)}
                            onContextMenu={(e) => handleContextMenu(e, song.id)}
                            className={`group grid ${selectionMode ? 'grid-cols-[40px_auto_1fr_auto]' : 'grid-cols-[auto_1fr_auto]'} gap-4 px-3 md:px-4 py-3 rounded-lg hover:bg-white/10 items-center transition cursor-pointer ${isCurrent || isSelected ? 'bg-white/10 shadow-sm' : ''} ${isSelected ? 'border-l-2 border-spotGreen' : 'border-l-2 border-transparent'}`}
                        >
                            {selectionMode && (
                                <div
                                    className="flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={() => handleMouseDown(song.id, index)}
                                    onMouseEnter={() => handleMouseEnter(song.id, index)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        className="w-4 h-4 accent-spotGreen rounded cursor-pointer pointer-events-none"
                                    />
                                </div>
                            )}
                            <div className="w-8 text-center text-textSecondary text-xs">{index + 1}</div>
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-cardBg rounded overflow-hidden shadow-sm flex-shrink-0">
                                    {song.coverUrl ? <img src={song.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">🎵</div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className={`font-medium truncate ${isCurrent ? 'text-spotGreen' : 'text-textPrimary'}`}>{song.title}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-sm text-textSecondary truncate">{song.artist}</div>
                                        {song.isAiTagged && <Sparkles size={10} className="text-cyan-400 flex-shrink-0" />}
                                        <div className="flex flex-wrap gap-1 max-w-[150px] md:max-w-[300px] overflow-hidden">
                                            {song.tags?.map((tag: string) => (
                                                <span key={tag} className="px-1 py-0 bg-cyan-500/10 text-cyan-400 text-[9px] font-bold rounded border border-cyan-500/10 whitespace-nowrap">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {!isSystem && !selectionMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromPlaylist(playlist!.id, song.id);
                                        }}
                                        className="text-textSecondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* Bulk Action Bar */}
            {selectionMode && selectedSongIds.size > 0 && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-playerBg/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-300 max-w-[95vw] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div className="text-sm font-bold text-textPrimary whitespace-nowrap">
                        <span className="hidden md:inline">{t(settings.language, 'selectedPrefix')} </span>
                        <span className="text-spotGreen text-lg">{selectedSongIds.size}</span>
                        <span className="hidden md:inline"> {t(settings.language, 'selectedSuffix')}</span>
                    </div>

                    <div className="h-6 w-[1px] bg-white/10"></div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => bulkRemoveFromPlaylist(playlist!.id)}
                            className="px-3 md:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-xs font-bold transition flex items-center gap-2 border border-red-500/20"
                        >
                            {isSystem ? <HeartOff size={14} /> : <ListX size={14} />}
                            <span className="hidden md:inline">{isSystem ? t(settings.language, 'bulkUnlike') : t(settings.language, 'bulkRemove')}</span>
                        </button>

                        <button
                            onClick={bulkDeleteSongs}
                            className="px-3 md:px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded-full text-xs font-bold transition flex items-center gap-2 border border-red-600/20"
                        >
                            <Trash2 size={14} />
                            <span className="hidden md:inline">{t(settings.language, 'bulkDelete')}</span>
                        </button>

                        <button
                            onClick={clearSelection}
                            className="px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 text-textSecondary rounded-full text-xs font-bold transition"
                        >
                            {t(settings.language, 'clearSelection')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsView: React.FC = () => {
    const {
        settings, updateSettings, library, deleteSong,
        aiQueueStatus, tagAllSongs, tagUntaggedSongs, showAlert,
        recoveryStatus, fixInvalidLinks
    } = usePlayer();

    // Helper to update nested hyperSettings
    const toggleHyperSetting = (key: keyof typeof settings.hyperSettings) => {
        const current = settings.hyperSettings || { enableChromatic: true, enableNoise: true, enableGlow: true };
        updateSettings({
            hyperSettings: {
                ...current,
                [key]: !current[key]
            }
        });
    };

    return (
        <div className="p-10 h-full overflow-y-auto pb-40 md:pb-32">
            <h1 className="text-3xl font-bold mb-8 text-textPrimary">{t(settings.language, 'settings')}</h1>

            <div className="space-y-8 max-w-2xl relative z-10">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">General</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel">
                        <div className="flex items-center justify-between">
                            <div className="font-medium text-textPrimary">{t(settings.language, 'language')}</div>
                            <select
                                value={settings.language}
                                onChange={(e) => updateSettings({ language: e.target.value as any })}
                                className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px]"
                            >
                                <option value="en" className="text-black">English</option>
                                <option value="zh" className="text-black">中文 (Chinese)</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">{t(settings.language, 'visuals')}</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel">
                        {/* Theme Selector */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'theme')}</div>
                            </div>
                            <select
                                value={settings.theme}
                                onChange={(e) => updateSettings({ theme: e.target.value as any })}
                                className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none capitalize focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px]"
                            >
                                <option value="dark" className="text-black">{t(settings.language, 'themeDark')}</option>
                                <option value="light" className="text-black">{t(settings.language, 'themeLight')}</option>
                                <option value="violet" className="text-black">{t(settings.language, 'themeViolet')}</option>
                                <option value="aurora-dark" className="text-black">{t(settings.language, 'themeAuroraDark')}</option>
                                <option value="aurora-light" className="text-black">{t(settings.language, 'themeAuroraLight')}</option>
                                <option value="pink" className="text-black">{t(settings.language, 'themePink')}</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'lyricEffect')}</div>
                            </div>
                            <select
                                value={settings.lyricEffect}
                                onChange={(e) => updateSettings({ lyricEffect: e.target.value as any })}
                                className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px]"
                            >
                                <option value="standard" className="text-black">{t(settings.language, 'effectStandard')}</option>
                                <option value="blur" className="text-black">{t(settings.language, 'effectBlur')}</option>
                                <option value="glow" className="text-black">{t(settings.language, 'effectGlow')}</option>
                                <option value="kinetic" className="text-black">{t(settings.language, 'effectKinetic')}</option>
                            </select>
                        </div>

                        {/* Font Settings */}
                        <div className="border-t border-borderColor pt-4 mt-2">
                            <div className="text-sm font-bold text-textSecondary mb-2 uppercase">{t(settings.language, 'lyricSettings')}</div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-textPrimary">{t(settings.language, 'fontSize')}</div>
                                <input
                                    type="range" min="16" max="48"
                                    value={settings.lyricFontSize || 24}
                                    onChange={(e) => updateSettings({ lyricFontSize: Number(e.target.value) })}
                                    className="w-32 accent-spotGreen"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-textPrimary">{t(settings.language, 'fontFamily')}</div>
                                <select
                                    value={settings.lyricFontFamily || 'Inter, sans-serif'}
                                    onChange={(e) => updateSettings({ lyricFontFamily: e.target.value })}
                                    className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px] text-sm"
                                >
                                    <option value="Inter, sans-serif" className="text-black">Inter (Default)</option>
                                    <option value="'Times New Roman', serif" className="text-black">Serif</option>
                                    <option value="'Courier New', monospace" className="text-black">Monospace</option>
                                    <option value="cursive" className="text-black">Cursive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-borderColor pt-4 mt-2">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'particles')}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.enableParticles}
                                onChange={(e) => updateSettings({ enableParticles: e.target.checked })}
                                className="w-5 h-5 accent-spotGreen cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'showAdvancedControls')}</div>
                                <div className="text-sm text-textSecondary">{t(settings.language, 'showAdvancedControlsDesc')}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.showAdvancedPlayerControls}
                                onChange={(e) => updateSettings({ showAdvancedPlayerControls: e.target.checked })}
                                className="w-5 h-5 accent-spotGreen cursor-pointer"
                            />
                        </div>

                        {/* Granular Hyper Mode Settings */}
                        <div className="border-t border-borderColor pt-4 mt-2">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="font-medium text-cyan-400">{t(settings.language, 'hyperMode')}</div>
                                    <div className="text-sm text-textSecondary">{t(settings.language, 'hyperModeDesc')}</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.enableHyperMode}
                                    onChange={(e) => updateSettings({ enableHyperMode: e.target.checked })}
                                    className="w-5 h-5 accent-cyan-500 cursor-pointer"
                                />
                            </div>
                            {settings.enableHyperMode && (
                                <div className="ml-4 space-y-2 border-l-2 border-cyan-500/30 pl-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-textPrimary">{t(settings.language, 'hyperChromatic')}</div>
                                        <input type="checkbox" checked={settings.hyperSettings?.enableChromatic} onChange={() => toggleHyperSetting('enableChromatic')} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-textPrimary">{t(settings.language, 'hyperNoise')}</div>
                                        <input type="checkbox" checked={settings.hyperSettings?.enableNoise} onChange={() => toggleHyperSetting('enableNoise')} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-textPrimary">{t(settings.language, 'hyperGlow')}</div>
                                        <input type="checkbox" checked={settings.hyperSettings?.enableGlow} onChange={() => toggleHyperSetting('enableGlow')} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">{t(settings.language, 'aiTagging')}</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel text-left">
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-2">{t(settings.language, 'deepseekApiKey')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={settings.deepseekApiKey || ''}
                                    onChange={(e) => updateSettings({ deepseekApiKey: e.target.value })}
                                    className="flex-1 bg-inputBg text-textPrimary p-2.5 rounded-lg border border-borderColor outline-none focus:border-cyan-500 transition"
                                />
                                <button
                                    onClick={() => showAlert(t(settings.language, 'aiTagging'), t(settings.language, 'apiKeySet'))}
                                    className={`flex items-center px-4 text-xs font-bold rounded-lg transition-all ${settings.deepseekApiKey ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-white/5 text-textSecondary cursor-not-allowed'}`}
                                >
                                    SET
                                </button>
                            </div>
                            <p className="text-[10px] text-textSecondary mt-1.5">{t(settings.language, 'saveApiKeyDesc')}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-borderColor">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'neteaseSource')}</div>
                                <div className="text-sm text-textSecondary">{settings.language === 'zh' ? '选择网易云同步接口。' : 'Choose interface for NetEase synchronization.'}</div>
                            </div>
                            <select
                                value={settings.neteaseSource || 'meting'}
                                onChange={(e) => updateSettings({ neteaseSource: e.target.value as any })}
                                className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px]"
                            >
                                <option value="meting" className="text-black">{t(settings.language, 'neteaseMeting')}</option>
                                <option value="official" className="text-black">{t(settings.language, 'neteaseOfficial')}</option>
                                <option value="paugram" className="text-black">{t(settings.language, 'neteasePaugram')}</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-borderColor">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'lyricSource')}</div>
                                <div className="text-sm text-textSecondary">{settings.language === 'zh' ? '选择缺失歌词的搜索源。' : 'Choose where to fetch missing lyrics from.'}</div>
                            </div>
                            <select
                                value={settings.lyricSource || 'lrccx'}
                                onChange={(e) => updateSettings({ lyricSource: e.target.value as any })}
                                className="bg-inputBg text-textPrimary border border-borderColor rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer transition-all hover:bg-white/5 min-w-[140px]"
                            >
                                <option value="lrccx" className="text-black">Lrc.cx (External)</option>
                                {settings.deepseekApiKey && <option value="gemini" className="text-black">Gemini (AI Analysis)</option>}
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-borderColor">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'autoAiTagging')}</div>
                                <div className="text-sm text-textSecondary">{t(settings.language, 'autoAiTaggingDesc')}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.autoAiTagging}
                                onChange={(e) => updateSettings({ autoAiTagging: e.target.checked })}
                                className="w-5 h-5 accent-cyan-500 cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-borderColor">
                            <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                                <Sparkles size={14} className="text-cyan-400" />
                                {t(settings.language, 'batchTagging')}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={tagAllSongs}
                                    disabled={aiQueueStatus.isProcessing}
                                    className="flex-1 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/20 transition disabled:opacity-50"
                                >
                                    {t(settings.language, 'tagAllSongs')}
                                </button>
                                <button
                                    onClick={tagUntaggedSongs}
                                    disabled={aiQueueStatus.isProcessing}
                                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-textPrimary text-xs font-bold rounded-lg border border-borderColor transition disabled:opacity-50"
                                >
                                    {t(settings.language, 'tagUntaggedSongs')}
                                </button>
                            </div>
                        </div>

                        {/* Developer Section (Queue Status) */}
                        <div className="pt-2 border-t border-borderColor">
                            <h3 className="text-sm font-semibold text-textSecondary mb-3 uppercase tracking-wider">{t(settings.language, 'developerSettings')}</h3>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-textSecondary">{t(settings.language, 'aiQueueStatus')}</span>
                                    {aiQueueStatus.isProcessing ? (
                                        <span className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse font-bold">
                                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                            {t(settings.language, 'processing')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-textSecondary opacity-50 font-medium">Idle</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                        <div className="text-xs text-textSecondary mb-1">{t(settings.language, 'totalItems')}</div>
                                        <div className="text-lg font-bold text-textPrimary">{aiQueueStatus.total}</div>
                                    </div>
                                    <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                        <div className="text-xs text-textSecondary mb-1">{t(settings.language, 'completed')}</div>
                                        <div className="text-lg font-bold text-green-400">{aiQueueStatus.completed}</div>
                                    </div>
                                    <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                        <div className="text-xs text-textSecondary mb-1">{t(settings.language, 'errors')}</div>
                                        <div className="text-lg font-bold text-red-400">{aiQueueStatus.errors}</div>
                                    </div>
                                </div>
                                {aiQueueStatus.isProcessing && (
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(aiQueueStatus.completed / aiQueueStatus.total) * 100}%` }}
                                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">{t(settings.language, 'linkRecovery')}</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel text-left">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-textPrimary">{t(settings.language, 'scanAndFix')}</div>
                                    <div className="text-sm text-textSecondary">{settings.language === 'zh' ? '扫描失效的歌曲并重定向为有效链接。' : 'Scan for broken links and redirect to valid mirrors.'}</div>
                                </div>
                                <button
                                    onClick={fixInvalidLinks}
                                    disabled={recoveryStatus.isProcessing}
                                    className="px-6 py-2 bg-spotGreen hover:bg-opacity-90 text-black font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <RefreshCw size={18} className={recoveryStatus.isProcessing ? 'animate-spin' : ''} />
                                    {t(settings.language, 'scanAndFix')}
                                </button>
                            </div>

                            {/* Recovery Progress & Log */}
                            {(recoveryStatus.isProcessing || recoveryStatus.total > 0) && (
                                <div className="mt-2 space-y-4">
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-textSecondary">{t(settings.language, 'aiQueueStatus')}</span>
                                            {recoveryStatus.isProcessing ? (
                                                <span className="flex items-center gap-2 text-xs text-spotGreen animate-pulse font-bold">
                                                    <div className="w-2 h-2 rounded-full bg-spotGreen"></div>
                                                    {t(settings.language, 'processing')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-textSecondary opacity-50 font-medium">Idle</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-xs text-textSecondary mb-1">Total</div>
                                                <div className="text-lg font-bold text-textPrimary">{recoveryStatus.total}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-xs text-textSecondary mb-1">Checked</div>
                                                <div className="text-lg font-bold text-blue-400">{recoveryStatus.checked}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-xs text-textSecondary mb-1">Fixed</div>
                                                <div className="text-lg font-bold text-green-400">{recoveryStatus.fixed}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
                                                <div className="text-xs text-textSecondary mb-1">Failed</div>
                                                <div className="text-lg font-bold text-red-400">{recoveryStatus.failed}</div>
                                            </div>
                                        </div>

                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(recoveryStatus.checked / recoveryStatus.total) * 100}%` }}
                                                className="h-full bg-spotGreen shadow-[0_0_10px_rgba(29,185,84,0.5)]"
                                            />
                                        </div>

                                        {/* Activity Log */}
                                        <div className="mt-4">
                                            <h3 className="text-xs font-bold text-textSecondary uppercase mb-2 flex items-center gap-2">
                                                <Terminal size={12} />
                                                {t(settings.language, 'recoveryLog')}
                                            </h3>
                                            <div className="h-40 bg-black/40 rounded-lg p-2 font-mono text-[10px] overflow-y-auto custom-scrollbar border border-white/5">
                                                {recoveryStatus.logs.length === 0 && <div className="text-textSecondary opacity-30 italic">Waiting for activity...</div>}
                                                {recoveryStatus.logs.map(log => (
                                                    <div key={log.id} className="mb-1 flex gap-2">
                                                        <span className="opacity-30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                                        <span className={`font-bold ${log.status === 'fixed' ? 'text-green-400' :
                                                                log.status === 'failed' ? 'text-red-400' :
                                                                    log.status === 'checking' ? 'text-blue-400' :
                                                                        'text-textSecondary'
                                                            }`}>
                                                            {log.status.toUpperCase()}
                                                        </span>
                                                        <span className="text-textPrimary truncate max-w-[120px]">{log.songTitle}</span>
                                                        <span className="text-textSecondary opacity-80">{log.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">Playback</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-textPrimary">{t(settings.language, 'smartShuffle')}</div>
                                <div className="text-sm text-textSecondary">{t(settings.language, 'smartShuffleDesc')}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.smartShuffle}
                                onChange={(e) => updateSettings({ smartShuffle: e.target.checked })}
                                className="w-5 h-5 accent-spotGreen cursor-pointer"
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-textPrimary">Storage</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4 border border-borderColor shadow-sm glass-panel">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium text-textPrimary">Total Songs</div>
                                <div className="text-sm text-textSecondary">{library.length} tracks in library</div>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-borderColor">
                            <button className="text-red-400 hover:text-red-300 text-sm font-medium transition" onClick={() => {
                                if (confirm("Clear entire library? This cannot be undone.")) {
                                    library.forEach(s => deleteSong(s.id));
                                }
                            }}>{t(settings.language, 'clearData')}</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

const SearchPage: React.FC = () => {
    const { library, play, playSongs, searchQuery, setSearchQuery, settings, updateSettings, playlists, tagSongsWithAi, updateSongTags, addDiscoveryCategory, deleteDiscoveryCategory, showAlert, showConfirm, setNavView, setActivePlaylistId } = usePlayer();
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        const saved = localStorage.getItem('museRecentSearches');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [tagFilter, setTagFilter] = useState('');
    const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatColor, setNewCatColor] = useState('from-blue-500 to-teal-400');
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; songId: string | null } | null>(null);

    // Derived tags from library
    const allUniqueTags = Array.from(new Set(library.flatMap(s => s.tags || [])))
        .filter((t: string) => t.toLowerCase().includes(tagFilter.toLowerCase()))
        .sort();

    const categories = settings.discoveryCategories || [];

    const filteredSongs = library.filter(s => {
        const query = searchQuery.toLowerCase();
        const matchesQuery = s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query) ||
            s.album.toLowerCase().includes(query) ||
            (s.tags && s.tags.some(t => t.toLowerCase().includes(query)));

        const matchesTags = selectedTags.size === 0 || (s.tags && Array.from(selectedTags).every(t => s.tags?.includes(t)));
        return matchesQuery && matchesTags;
    });

    const filteredPlaylists = playlists.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() && !recentSearches.includes(query)) {
            const next = [query, ...recentSearches.slice(0, 4)];
            setRecentSearches(next);
            localStorage.setItem('museRecentSearches', JSON.stringify(next));
        }
    };

    const clearHistory = () => {
        setRecentSearches([]);
        localStorage.removeItem('museRecentSearches');
    };

    const handleBatchTagging = () => {
        const ids = filteredSongs.map(s => s.id);
        if (ids.length > 0) tagSongsWithAi(ids);
    };

    return (
        <div className="p-6 md:p-8 h-full flex flex-col overflow-hidden">
            {/* Search Header */}
            <div className="mb-8 flex-shrink-0 flex flex-col md:flex-row md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="relative flex-1 max-w-[450px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
                    <input
                        type="text"
                        placeholder={t(settings.language, 'search')}
                        className="w-full bg-white/5 backdrop-blur-md rounded-2xl py-4 pl-12 pr-4 text-textPrimary border border-white/10 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 transition-all shadow-xl text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                        autoFocus
                    />
                </div>

                {searchQuery && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => playSongs(filteredSongs)}
                            className="flex items-center gap-2 px-6 py-4 bg-spotGreen hover:bg-opacity-90 text-black font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex-shrink-0"
                        >
                            <Play size={18} fill="black" />
                            {t(settings.language, 'playAll') || '播放当前列表'}
                        </button>
                        <button
                            onClick={handleBatchTagging}
                            className="flex items-center gap-2 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95 flex-shrink-0"
                        >
                            <Sparkles size={18} />
                            {t(settings.language, 'aiPerception')}
                        </button>
                    </div>
                )}
            </div>

            {/* Tag Cloud */}
            <section className="mb-6 relative group px-2 bg-white/5 p-4 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
                    <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 opacity-80">
                        <Tag className="text-cyan-400" size={18} />
                        {t(settings.language, 'tagCloud')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textSecondary opacity-50" size={12} />
                            <input
                                type="text"
                                placeholder={t(settings.language, 'search')}
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className="bg-white/5 text-textPrimary text-[10px] pl-7 pr-3 py-1 rounded-full border border-white/5 focus:border-cyan-500/50 transition-all outline-none w-24 focus:w-32"
                            />
                        </div>
                        <div className="relative group/input">
                            <input
                                type="text"
                                placeholder={t(settings.language, 'addTag')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value.trim();
                                        if (val && !settings.customTags?.includes(val)) {
                                            updateSettings({ customTags: [...(settings.customTags || []), val] });
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] pl-3 pr-3 py-1 rounded-full border border-cyan-500/20 focus:border-cyan-500 transition-all outline-none w-24 focus:w-32 font-bold"
                            />
                        </div>
                        <button
                            onClick={() => setSelectedTags(new Set())}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedTags.size === 0 ? 'bg-cyan-500 text-white shadow-lg border-transparent' : 'bg-white/5 text-textSecondary hover:text-textPrimary border-white/10'}`}
                        >
                            {t(settings.language, 'browseAll')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                    {allUniqueTags.map(tag => (
                        <div key={tag} className="flex-shrink-0 flex items-center gap-1 group/tag">
                            <button
                                onClick={() => {
                                    const next = new Set(selectedTags);
                                    if (next.has(tag)) next.delete(tag);
                                    else next.add(tag);
                                    setSelectedTags(next);
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedTags.has(tag)
                                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                    : 'bg-white/5 border-white/5 text-textSecondary hover:bg-white/10 hover:text-textPrimary hover:border-borderColor'
                                    }`}
                            >
                                #{tag}
                            </button>
                            {settings.customTags?.includes(tag) && (
                                <button
                                    onClick={() => {
                                        const next = settings.customTags?.filter(t => t !== tag) || [];
                                        updateSettings({ customTags: next });
                                    }}
                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-red-400/10 text-red-400 opacity-0 group-hover/tag:opacity-100 transition hover:bg-red-400/20"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    ))}
                    {allUniqueTags.length === 0 && <div className="text-textSecondary italic text-xs py-2">{t(settings.language, 'noTags')}</div>}
                </div>
            </section>

            <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar pr-2">
                {!searchQuery ? (
                    <div className="space-y-10">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                                        <History size={20} className="text-spotGreen" />
                                        {t(settings.language, 'recentSearches')}
                                    </h2>
                                    <button onClick={clearHistory} className="text-xs text-textSecondary hover:text-red-400 transition">
                                        {t(settings.language, 'clearData')}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((term, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSearchQuery(term)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm text-textSecondary hover:text-textPrimary transition border border-white/5 flex items-center gap-2"
                                        >
                                            <Clock size={12} />
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Discovery Categories */}
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 pb-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-textPrimary tracking-tight uppercase opacity-80">{t(settings.language, 'browseAll')}</h2>
                                <button
                                    onClick={() => setIsAddCatModalOpen(true)}
                                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/20 transition flex items-center gap-2"
                                >
                                    <Plus size={14} />
                                    {t(settings.language, 'addCategory')}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {categories.map((cat, idx) => (
                                    <motion.div
                                        whileHover={{ scale: 1.03, y: -5 }}
                                        whileTap={{ scale: 0.97 }}
                                        key={cat.id}
                                        className={`relative h-28 md:h-36 rounded-2xl overflow-hidden p-4 text-left shadow-lg bg-gradient-to-br ${cat.color} group transition-all duration-300 cursor-pointer shadow-xl`}
                                        onClick={() => handleSearch(cat.label)}
                                    >
                                        <span className="text-xl font-black text-white drop-shadow-md z-10 relative">{cat.label}</span>
                                        <Zap className="absolute bottom-[-10%] right-[-10%] text-white/20 group-hover:scale-125 transition-transform duration-500" size={80} />

                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showConfirm(t(settings.language, 'deleteCategory'), t(settings.language, 'confirmDeleteCategory'), () => deleteDiscoveryCategory(cat.id));
                                                }}
                                                className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all border border-white/5"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                                {categories.length === 0 && (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 border-dashed opacity-50">
                                        <Plus size={48} className="mb-4 text-textSecondary" />
                                        <div className="text-lg font-bold">{t(settings.language, 'noSongs')}</div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Results count or Top Match could go here */}

                        {/* Songs Results */}
                        {filteredSongs.length > 0 && (
                            <section>
                                <h2 className="text-sm font-black text-textSecondary uppercase tracking-[0.2em] mb-4 border-l-4 border-spotGreen pl-4">{t(settings.language, 'searchSongs')}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {filteredSongs.map((song, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={song.id}
                                            onClick={() => play(song)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, songId: song.id });
                                            }}
                                            className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/10"
                                        >
                                            <div className="w-12 h-12 bg-cardBg rounded-lg overflow-hidden shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                                {song.coverUrl ? <img src={song.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-textPrimary truncate group-hover:text-cyan-400 transition-colors">{song.title}</div>
                                                <div className="text-xs text-textSecondary truncate">{song.artist}</div>
                                                <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden">
                                                    {song.tags?.map(t => (
                                                        <span key={t} className="px-1.5 py-0 bg-cyan-500/10 text-[8px] md:text-[9px] text-cyan-400 rounded-md border border-cyan-500/10 whitespace-nowrap font-bold">
                                                            #{t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {song.isAiTagged && <Sparkles className="text-cyan-400/50" size={14} />}
                                            <PlayCircle className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Playlists Results (MOCKED for now if any) */}
                        {filteredPlaylists.length > 0 && (
                            <section>
                                <h2 className="text-sm font-black text-textSecondary uppercase tracking-[0.2em] mb-4 border-l-4 border-purple-500 pl-4">{t(settings.language, 'searchPlaylists')}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {filteredPlaylists.map((pl, idx) => {
                                        const firstSong = library.find(s => pl.songs.includes(s.id));
                                        const cover = pl.coverUrl || firstSong?.coverUrl;

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.1 }}
                                                key={pl.id}
                                                className="group cursor-pointer"
                                                onClick={() => {
                                                    const plSongs = library.filter(s => pl.songs.includes(s.id));
                                                    if (plSongs.length > 0) playSongs(plSongs);
                                                    setActivePlaylistId(pl.id);
                                                    setNavView('playlist');
                                                }}
                                            >
                                                <div className="aspect-square bg-cardBg rounded-2xl overflow-hidden mb-3 shadow-xl relative group-hover:shadow-purple-500/20 transition-all">
                                                    {cover ? <img src={cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/10 flex items-center justify-center text-purple-400 font-black text-2xl uppercase">{pl.name.slice(0, 2)}</div>}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                                        <PlayCircle className="text-white" size={40} />
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold text-textPrimary truncate">{pl.name}</div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {contextMenu && (
                            <ContextMenu
                                visible={contextMenu.visible}
                                x={contextMenu.x}
                                y={contextMenu.y}
                                songId={contextMenu.songId!}
                                onClose={() => setContextMenu(null)}
                            />
                        )}

                        {filteredSongs.length === 0 && filteredPlaylists.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <Search size={64} className="mb-4" />
                                <div className="text-xl font-bold">{t(settings.language, 'noSongs')}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Category Modal */}
            <AnimatePresence>
                {isAddCatModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsAddCatModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-textPrimary mb-6">{t(settings.language, 'addCategory')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-2">{t(settings.language, 'categoryLabel')}</label>
                                    <input
                                        type="text"
                                        value={newCatLabel}
                                        onChange={e => setNewCatLabel(e.target.value)}
                                        className="w-full bg-white/5 text-textPrimary p-3 rounded-xl border border-white/10 focus:border-cyan-500 outline-none transition"
                                        placeholder="e.g. Mellow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-2">{t(settings.language, 'categoryColor')}</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            'from-blue-500 to-teal-400',
                                            'from-orange-500 to-red-500',
                                            'from-pink-500 to-rose-400',
                                            'from-purple-600 to-indigo-500',
                                            'from-cyan-500 to-blue-600',
                                            'from-amber-600 to-orange-700',
                                            'from-emerald-500 to-teal-600',
                                            'from-fuchsia-500 to-purple-600'
                                        ].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewCatColor(c)}
                                                className={`h-10 rounded-lg bg-gradient-to-br ${c} border-2 ${newCatColor === c ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setIsAddCatModalOpen(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition"
                                    >
                                        {t(settings.language, 'cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (newCatLabel.trim()) {
                                                addDiscoveryCategory(newCatLabel, newCatColor);
                                                setIsAddCatModalOpen(false);
                                                setNewCatLabel('');
                                            }
                                        }}
                                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition"
                                    >
                                        {t(settings.language, 'save')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CreatePlaylistModal: React.FC = () => {
    const { createPlaylistModal, closeCreatePlaylistModal, createPlaylist, addToPlaylist, settings } = usePlayer();
    const [name, setName] = useState('');

    useEffect(() => {
        if (createPlaylistModal.isOpen) setName('');
    }, [createPlaylistModal.isOpen]);

    if (!createPlaylistModal.isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            const newPl = await createPlaylist(name.trim());
            if (createPlaylistModal.songId) {
                await addToPlaylist(newPl.id, createPlaylistModal.songId);
            }
            closeCreatePlaylistModal();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-cardBg p-6 rounded-xl shadow-2xl w-full max-w-md border border-borderColor glass-panel"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-textPrimary">{t(settings.language, 'createPlaylist')}</h2>
                    <button onClick={closeCreatePlaylistModal} className="text-textSecondary hover:text-textPrimary"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={t(settings.language, 'playlistName')}
                        className="w-full bg-inputBg text-textPrimary p-3 rounded-md mb-6 border border-borderColor outline-none focus:border-spotGreen focus:ring-1 focus:ring-spotGreen"
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={closeCreatePlaylistModal} className="px-4 py-2 font-bold text-textPrimary hover:text-textSecondary">
                            {t(settings.language, 'cancel')}
                        </button>
                        <button type="submit" disabled={!name.trim()} className="px-6 py-2 bg-spotGreen text-white font-bold rounded-full hover:scale-105 active:scale-95 transition disabled:opacity-50">
                            {t(settings.language, 'createPlaylist')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const MainLayout: React.FC = () => {
    const { addToQueue, navView, isPlayerOpen, setPlayerOpen, settings, setNeteaseImportOpen, tagEditorSongId, setTagEditorSongId } = usePlayer();
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addToQueue(e.dataTransfer.files);
        }
    };

    return (
        <div
            className="flex h-screen text-textPrimary relative overflow-hidden font-sans select-none transition-colors duration-300"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <AuroraBackground />
            <Sidebar />

            <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden z-10">
                {/* Navigation Content */}
                {/* Fix scrollbar issue: Ensure parent is flex-col so child flex-1 fills space and scrolls */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {navView === 'library' && <SongList />}
                    {navView === 'home' && <HomePage />}
                    {navView === 'search' && <SearchPage />}
                    {navView === 'playlist' && <PlaylistView />}
                    {navView === 'settings' && <SettingsView />}
                </div>
            </div>

            <PlayerBar />
            <QueueView />
            <MobileNav />
            <CreatePlaylistModal />
            <NeteaseImportModal />
            <FeedbackModal />

            <AnimatePresence>
                {isPlayerOpen && <LyricsView />}
            </AnimatePresence>

            <AnimatePresence>
                {tagEditorSongId && <TagEditor songId={tagEditorSongId} onClose={() => setTagEditorSongId(null)} />}
            </AnimatePresence>

            {dragActive && (
                <div className="absolute inset-0 z-[100] bg-spotGreen/20 backdrop-blur-md border-4 border-spotGreen border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="text-5xl font-bold text-white drop-shadow-xl">{t(settings.language, 'dragDrop')}</div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <PlayerProvider>
            <MainLayout />
        </PlayerProvider>
    );
};

export default App;