import React, { useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Clock, Play, Music, ArrowUpDown, Upload, List, Trash2, Library, DownloadCloud, Sparkles } from 'lucide-react';
import { formatTime } from '../utils';
import ContextMenu from './ContextMenu';
import { ContextMenuState } from '../types';
import { t } from '../utils/i18n';

const SongList: React.FC = () => {
    // Use library here instead of queue to show all songs
    const {
        library, currentSong, play, isPlaying, sortOption, setSortOption, settings, addToQueue,
        selectionMode, setSelectionMode, selectedSongIds, toggleSongSelection, clearSelection, selectAll, bulkDeleteSongs, bulkAddToPlaylist, playlists,
        setNeteaseImportOpen
    } = usePlayer();
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, songId: null });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [showImportMenu, setShowImportMenu] = useState(false);

    // Advanced Selection States
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [isDraggingSelect, setIsDraggingSelect] = useState(false);
    const [dragActionType, setDragActionType] = useState<'select' | 'deselect' | null>(null);

    const handleContextMenu = (e: React.MouseEvent, songId: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            songId: songId
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addToQueue(e.target.files);
        }
    };

    // Sorting Logic on Library
    const sortedLibrary = [...library].sort((a, b) => {
        if (sortOption === 'title') return a.title.localeCompare(b.title);
        if (sortOption === 'artist') return a.artist.localeCompare(b.artist);
        if (sortOption === 'dateAdded') return (b.dateAdded || 0) - (a.dateAdded || 0);
        return 0;
    });

    const allIds = sortedLibrary.map(s => s.id);
    const isAllSelected = selectedSongIds.size === sortedLibrary.length && sortedLibrary.length > 0;

    // Advanced Selection Logic
    const handleSongClick = (e: React.MouseEvent, songId: string, index: number) => {
        if (!selectionMode) {
            play(library.find(s => s.id === songId)!);
            return;
        }

        if (e.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const idsToToggle = sortedLibrary.slice(start, end + 1).map(s => s.id);

            const shouldSelect = selectedSongIds.has(sortedLibrary[lastSelectedIndex].id);
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

    return (
        <div
            className="flex-1 overflow-y-auto pb-48 md:pb-40 px-3 md:px-6 relative select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                songId={contextMenu.songId}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
            />

            {/* Header Row */}
            <div className="flex items-center justify-between mt-8 mb-6 px-2 md:px-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-textPrimary">{t(settings.language, 'library')}</h2>
                    <div className="flex items-center gap-1.5 ml-2">
                        <div className="relative">
                            <button
                                onClick={() => {
                                    if (window.innerWidth < 768) {
                                        setShowImportMenu(!showImportMenu);
                                    } else {
                                        fileInputRef.current?.click();
                                    }
                                }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-textPrimary border border-white/5"
                                title={t(settings.language, 'importMusic')}
                            >
                                <Upload size={16} />
                            </button>

                            {showImportMenu && (
                                <div className="absolute top-full mt-2 left-0 min-w-[160px] bg-cardBg border border-borderColor rounded-xl shadow-2xl p-2 z-[60]">
                                    <button
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                            setShowImportMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition flex items-center gap-2"
                                    >
                                        <Music size={14} /> {t(settings.language, 'localFiles')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNeteaseImportOpen(true);
                                            setShowImportMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition flex items-center gap-2 text-blue-400"
                                    >
                                        <DownloadCloud size={14} /> {t(settings.language, 'neteaseImport')}
                                    </button>
                                </div>
                            )}
                        </div>
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
                    <input type="file" multiple accept="audio/*,.lrc,.flac" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>

                <div className="flex items-center gap-2 text-sm text-textSecondary bg-cardBg border border-borderColor px-3 py-1.5 rounded-full">
                    <ArrowUpDown size={14} />
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="bg-transparent outline-none cursor-pointer hover:text-textPrimary transition"
                    >
                        <option value="dateAdded" className="text-black">{t(settings.language, 'sortDate')}</option>
                        <option value="title" className="text-black">{t(settings.language, 'sortTitle')}</option>
                        <option value="artist" className="text-black">{t(settings.language, 'sortArtist')}</option>
                    </select>
                </div>
            </div>

            {library.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-textSecondary py-20 border border-dashed border-borderColor rounded-xl mx-2">
                    <div className="w-20 h-20 bg-cardBg rounded-full flex items-center justify-center mb-4 border border-borderColor">
                        <Music size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-textPrimary mb-2">Your library is empty</h2>
                    <p>{t(settings.language, 'dragDrop')}</p>
                </div>
            ) : (
                <>
                    <div className={`grid ${selectionMode ? 'grid-cols-[40px_auto_1fr_auto] md:grid-cols-[40px_auto_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto]'} gap-2 md:gap-4 px-2 md:px-4 py-3 border-b border-borderColor text-textSecondary text-xs font-bold uppercase tracking-wider sticky top-0 bg-playerBg/90 backdrop-blur-md z-10 transition-all`}>
                        {selectionMode && (
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={() => isAllSelected ? clearSelection() : selectAll(allIds)}
                                    className="w-4 h-4 accent-spotGreen rounded cursor-pointer"
                                />
                            </div>
                        )}
                        <div className="w-6 md:w-8 text-center">#</div>
                        <div>{t(settings.language, 'sortTitle')}</div>
                        <div className="hidden md:block">{t(settings.language, 'sortArtist')}</div>
                        <div className="mr-2 text-right"><Clock size={16} className="inline" /></div>
                    </div>

                    <div className="mt-2 space-y-1">
                        {sortedLibrary.map((song, index) => {
                            const isCurrent = currentSong?.id === song.id;
                            const isSelected = selectedSongIds.has(song.id);
                            return (
                                <div
                                    key={song.id}
                                    onClick={(e) => handleSongClick(e, song.id, index)}
                                    onContextMenu={(e) => handleContextMenu(e, song.id)}
                                    className={`group grid ${selectionMode ? 'grid-cols-[40px_auto_1fr_auto] md:grid-cols-[40px_auto_1fr_1fr_auto]' : 'grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto]'} gap-2 md:gap-4 px-2 md:px-4 py-3 rounded-lg hover:bg-white/10 transition cursor-pointer items-center ${isCurrent || isSelected ? 'bg-white/10 shadow-sm' : ''} ${isSelected ? 'border-l-2 border-spotGreen' : 'border-l-2 border-transparent'}`}
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
                                    <div className="w-6 md:w-8 text-center relative flex items-center justify-center">
                                        {!selectionMode && <span className={`group-hover:hidden ${isCurrent ? 'hidden' : 'text-textSecondary font-mono text-sm'}`}>{index + 1}</span>}
                                        {!selectionMode && (
                                            <span className={`hidden group-hover:block ${isCurrent && isPlaying ? 'hidden' : 'text-textPrimary'}`}>
                                                <Play size={14} fill="currentColor" />
                                            </span>
                                        )}
                                        {selectionMode && <span className="text-textSecondary font-mono text-xs">{index + 1}</span>}
                                        {isCurrent && isPlaying && !selectionMode && (
                                            <div className="flex items-end gap-[2px] h-3">
                                                <div className="w-1 bg-spotGreen animate-pulse h-full"></div>
                                                <div className="w-1 bg-spotGreen animate-pulse h-2/3 delay-75"></div>
                                                <div className="w-1 bg-spotGreen animate-pulse h-1/2 delay-150"></div>
                                            </div>
                                        )}
                                        {isCurrent && !isPlaying && !selectionMode && <span className="text-spotGreen font-bold">{index + 1}</span>}
                                    </div>

                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden min-w-0">
                                        <div className="w-10 h-10 bg-cardBg rounded flex-shrink-0 overflow-hidden shadow-sm relative group-hover:scale-105 transition">
                                            {song.coverUrl ? (
                                                <img src={song.coverUrl} className="w-full h-full object-cover" alt="art" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-textSecondary">
                                                    <Music size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col truncate flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium truncate ${isCurrent ? 'text-spotGreen' : 'text-textPrimary'}`}>{song.title}</span>
                                                {song.isAiTagged && <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {song.lyrics && (
                                                    <span className="flex-shrink-0 bg-white/10 text-[9px] text-textSecondary px-1 rounded border border-white/5 font-mono tracking-tighter" title="Lyrics available">
                                                        LRC
                                                    </span>
                                                )}
                                                <span className="text-xs text-textSecondary truncate group-hover:text-textPrimary transition md:hidden">{song.artist}</span>
                                                <div className="flex flex-wrap gap-1 items-center max-w-[120px] md:max-w-[300px] overflow-hidden">
                                                    {song.tags?.map((tag: string) => (
                                                        <span key={tag} className="px-1 py-0 bg-cyan-500/10 text-cyan-400 text-[9px] font-bold rounded border border-cyan-500/10 whitespace-nowrap">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-textSecondary truncate hidden md:block group-hover:text-textPrimary transition">
                                        {song.artist}
                                    </div>

                                    <div className="text-sm text-textSecondary font-mono text-right mr-1">
                                        {formatTime(song.duration)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Bulk Action Bar */}
            {selectionMode && selectedSongIds.size > 0 && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-playerBg/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-300 max-w-[95vw]">
                    <div className="text-sm font-bold text-textPrimary whitespace-nowrap">
                        <span className="hidden md:inline">{t(settings.language, 'selectedPrefix')} </span>
                        <span className="text-spotGreen text-lg">{selectedSongIds.size}</span>
                        <span className="hidden md:inline"> {t(settings.language, 'selectedSuffix')}</span>
                    </div>

                    <div className="h-6 w-[1px] bg-white/10"></div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowBulkMenu(!showBulkMenu)}
                                className="px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-bold transition flex items-center gap-2 border border-white/10"
                            >
                                <Library size={14} />
                                <span className="hidden md:inline">{t(settings.language, 'bulkAddPlaylist')}</span>
                            </button>
                            {showBulkMenu && (
                                <div className="absolute bottom-full mb-2 left-0 min-w-[200px] bg-cardBg border border-borderColor rounded-xl shadow-2xl p-2 z-50 glass-panel">
                                    <div className="text-[10px] font-bold text-textSecondary px-3 py-2 uppercase">{t(settings.language, 'playlists')}</div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {playlists.map(pl => (
                                            <button
                                                key={pl.id}
                                                onClick={() => {
                                                    bulkAddToPlaylist(pl.id);
                                                    setShowBulkMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition"
                                            >
                                                {pl.name}
                                            </button>
                                        ))}
                                        {playlists.length === 0 && <div className="px-3 py-2 text-xs text-textSecondary italic">暂无歌单</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={bulkDeleteSongs}
                            className="px-3 md:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-xs font-bold transition flex items-center gap-2 border border-red-500/20"
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

export default SongList;