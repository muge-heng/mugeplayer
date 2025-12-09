import React, { useState, useRef, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import LyricsView from './components/LyricsView';
import QueueView from './components/QueueView';
import MobileNav from './components/MobileNav';
import AuroraBackground from './components/AuroraBackground';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Trash2, List, Settings, Edit2, Camera, X, PlayCircle } from 'lucide-react';
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
    const { activePlaylistId, playlists, library, play, playPlaylist, currentSong, updatePlaylist, removeFromPlaylist, settings } = usePlayer();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, songId: null });

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

    const isSystem = activePlaylistId === 'liked';

    return (
        <div className="h-full flex flex-col overflow-y-auto hide-scrollbar pb-40 md:pb-32">
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
                     {displayCover ? <img src={displayCover} className="w-full h-full object-cover" /> : <List size={64} className="text-textSecondary"/>}
                     
                     {!isSystem && (
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                             <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-spotGreen flex flex-col items-center">
                                 <Camera size={24} />
                                 <span className="text-xs font-bold mt-1">{t(settings.language, 'uploadCover')}</span>
                             </button>
                             <button onClick={() => updatePlaylist(playlist.id, { useFirstSongCover: true, coverUrl: undefined })} className="text-white text-xs hover:text-spotGreen mt-2">
                                 {t(settings.language, 'useFirstSong')}
                             </button>
                         </div>
                     )}
                     <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                 </div>
                 
                 <div className="flex-1 w-full">
                     <div className="uppercase text-xs font-bold mt-2 text-textSecondary">{isSystem ? 'System Playlist' : 'Playlist'}</div>
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
                                    <span>{playlist.songs.length} songs</span>
                                    {!isSystem && <button onClick={startEdit} className="opacity-50 hover:opacity-100 text-textPrimary"><Edit2 size={16}/></button>}
                                </div>
                            </div>
                         </>
                     )}
                 </div>
            </div>

            <div className="p-6">
                 {playlistSongs.length === 0 && (
                     <div className="text-textSecondary italic">No songs yet.</div>
                 )}
                 {playlistSongs.map((song, index) => {
                     const isCurrent = currentSong?.id === song.id;
                     return (
                         <div 
                            key={song.id} 
                            onContextMenu={(e) => handleContextMenu(e, song.id)}
                            className="group grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 rounded-md hover:bg-white/10 items-center transition-colors"
                        >
                             <div className="w-8 text-center text-textSecondary">{index + 1}</div>
                             <div className="flex items-center gap-4 cursor-pointer" onClick={() => play(song)}>
                                 <div className="w-10 h-10 bg-cardBg rounded overflow-hidden shadow-sm">
                                     {song.coverUrl && <img src={song.coverUrl} className="w-full h-full object-cover"/>}
                                 </div>
                                 <div>
                                     <div className={`font-medium ${isCurrent ? 'text-spotGreen' : 'text-textPrimary'}`}>{song.title}</div>
                                     <div className="text-sm text-textSecondary">{song.artist}</div>
                                 </div>
                             </div>
                             {!isSystem && (
                                 <button onClick={() => removeFromPlaylist(playlist!.id, song.id)} className="text-textSecondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                     <Trash2 size={16} />
                                 </button>
                             )}
                         </div>
                     )
                 })}
            </div>
        </div>
    );
};

const SettingsView: React.FC = () => {
    const { settings, updateSettings, library, deleteSong } = usePlayer();

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
                                className="bg-inputBg text-textPrimary border border-borderColor rounded p-1.5 outline-none focus:border-spotGreen transition"
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
                                className="bg-inputBg text-textPrimary border border-borderColor rounded p-1.5 outline-none capitalize focus:border-spotGreen transition"
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
                                className="bg-inputBg text-textPrimary border border-borderColor rounded p-1.5 outline-none focus:border-spotGreen transition"
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
                                    className="bg-inputBg text-textPrimary border border-borderColor rounded p-1.5 outline-none focus:border-spotGreen transition text-sm w-32"
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
                                        <input type="checkbox" checked={settings.hyperSettings?.enableChromatic} onChange={() => toggleHyperSetting('enableChromatic')} className="w-4 h-4 accent-cyan-500 cursor-pointer"/>
                                     </div>
                                     <div className="flex items-center justify-between">
                                        <div className="text-sm text-textPrimary">{t(settings.language, 'hyperNoise')}</div>
                                        <input type="checkbox" checked={settings.hyperSettings?.enableNoise} onChange={() => toggleHyperSetting('enableNoise')} className="w-4 h-4 accent-cyan-500 cursor-pointer"/>
                                     </div>
                                     <div className="flex items-center justify-between">
                                        <div className="text-sm text-textPrimary">{t(settings.language, 'hyperGlow')}</div>
                                        <input type="checkbox" checked={settings.hyperSettings?.enableGlow} onChange={() => toggleHyperSetting('enableGlow')} className="w-4 h-4 accent-cyan-500 cursor-pointer"/>
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
                                 if(confirm("Clear entire library? This cannot be undone.")) {
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
    const { library, play, searchQuery, setSearchQuery, settings } = usePlayer();
    
    // Search on Library, not Queue
    const filtered = library.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" />
                <input 
                    type="text" 
                    placeholder={t(settings.language, 'search')}
                    className="w-full md:w-96 bg-inputBg rounded-full py-3 pl-12 pr-4 text-textPrimary border border-borderColor focus:outline-none focus:border-spotGreen focus:ring-1 focus:ring-spotGreen/50 transition glass-panel"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="flex-1 overflow-y-auto pb-40 md:pb-32">
                {searchQuery && filtered.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                        {filtered.map(song => (
                             <div 
                                key={song.id}
                                onClick={() => play(song)}
                                className="flex items-center gap-4 p-2 hover:bg-white/10 rounded cursor-pointer transition-colors"
                             >
                                <div className="w-10 h-10 bg-cardBg rounded overflow-hidden">
                                     {song.coverUrl ? <img src={song.coverUrl} className="w-full h-full object-cover"/> : null}
                                </div>
                                <div>
                                    <div className="font-medium text-textPrimary">{song.title}</div>
                                    <div className="text-sm text-textSecondary">{song.artist}</div>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </div>
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
                    <button onClick={closeCreatePlaylistModal} className="text-textSecondary hover:text-textPrimary"><X size={20}/></button>
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
  const { addToQueue, navView, isPlayerOpen, setPlayerOpen, settings } = usePlayer();
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

      <AnimatePresence>
        {isPlayerOpen && <LyricsView />}
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