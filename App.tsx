import React, { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import LyricsView from './components/LyricsView';
import { AnimatePresence } from 'framer-motion';
import { Search, Trash2, List, Settings, Edit2, Camera } from 'lucide-react';
import { t } from './utils/i18n';
import ContextMenu from './components/ContextMenu';
import { ContextMenuState } from './types';

const HomePage: React.FC = () => {
    const { history, play, playlists, setActivePlaylist, setNavView, settings } = usePlayer();
    const recent = [...history].reverse().slice(0, 6);

    return (
        <div className="p-8 overflow-y-auto h-full hide-scrollbar">
            <h1 className="text-3xl font-bold mb-6">
                {new Date().getHours() < 12 ? t(settings.language, 'goodMorning') : t(settings.language, 'goodEvening')}
            </h1>
            
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-300">{t(settings.language, 'playHistory')}</h2>
                {recent.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {recent.map((song, i) => (
                            <div 
                                key={`${song.id}-${i}`}
                                onClick={() => play(song)}
                                className="bg-white/5 hover:bg-white/20 transition rounded overflow-hidden flex items-center cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-gray-800 flex-shrink-0">
                                    {song.coverUrl ? (
                                        <img src={song.coverUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">🎵</div>
                                    )}
                                </div>
                                <div className="px-4 font-bold truncate flex-1">{song.title}</div>
                                <div className="mr-4 opacity-0 group-hover:opacity-100 transition shadow-xl bg-green-500 rounded-full p-2 text-black">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-400">Play some music to see your history here.</div>
                )}
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4 text-gray-300">{t(settings.language, 'playlists')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {playlists.map(pl => (
                        <div 
                            key={pl.id} 
                            onClick={() => {
                                setActivePlaylist(pl.id);
                                setNavView('playlist');
                            }}
                            className="bg-cardBg p-4 rounded-lg hover:bg-cardHover transition cursor-pointer group"
                        >
                            <div className="w-full aspect-square bg-gray-800 rounded-md mb-4 overflow-hidden shadow-lg relative">
                                {pl.coverUrl ? (
                                    <img src={pl.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <List size={40} />
                                    </div>
                                )}
                            </div>
                            <div className="font-bold truncate">{pl.name}</div>
                            <div className="text-sm text-gray-400">By You</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const PlaylistView: React.FC = () => {
    const { activePlaylistId, playlists, queue, play, currentSong, updatePlaylist, removeFromPlaylist, settings } = usePlayer();
    const playlist = playlists.find(p => p.id === activePlaylistId);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, songId: null });

    if (!playlist) return <div>Playlist not found</div>;

    const playlistSongs = playlist.songs.map(id => queue.find(s => s.id === id)).filter((s): s is any => !!s);
    
    // Determine effective cover
    let displayCover = playlist.coverUrl;
    if (!displayCover && playlist.useFirstSongCover && playlistSongs.length > 0 && playlistSongs[0].coverUrl) {
        displayCover = playlistSongs[0].coverUrl;
    }

    const startEdit = () => {
        setEditName(playlist.name);
        setEditDesc(playlist.description || '');
        setIsEditing(true);
    };

    const saveEdit = () => {
        updatePlaylist(playlist.id, { name: editName, description: editDesc });
        setIsEditing(false);
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    updatePlaylist(playlist.id, { coverUrl: ev.target.result as string, useFirstSongCover: false });
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, songId: string) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, songId, playlistId: playlist.id });
    };

    return (
        <div className="h-full flex flex-col overflow-y-auto hide-scrollbar">
            <ContextMenu 
                visible={contextMenu.visible} 
                x={contextMenu.x} 
                y={contextMenu.y} 
                songId={contextMenu.songId}
                playlistId={contextMenu.playlistId} 
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
            />
            <div className="p-8 bg-gradient-to-b from-gray-700 to-darkBg flex flex-col md:flex-row items-end gap-6">
                 <div className="group relative w-52 h-52 shadow-2xl bg-gray-800 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                     {displayCover ? <img src={displayCover} className="w-full h-full object-cover" /> : <List size={64} className="text-gray-500"/>}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                         <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-green-400 flex flex-col items-center">
                             <Camera size={24} />
                             <span className="text-xs font-bold mt-1">{t(settings.language, 'uploadCover')}</span>
                         </button>
                         <button onClick={() => updatePlaylist(playlist.id, { useFirstSongCover: true, coverUrl: undefined })} className="text-white text-xs hover:text-green-400 mt-2">
                             {t(settings.language, 'useFirstSong')}
                         </button>
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                 </div>
                 
                 <div className="flex-1 w-full">
                     <div className="uppercase text-xs font-bold mt-2">Playlist</div>
                     {isEditing ? (
                         <div className="mt-2 space-y-2">
                             <input value={editName} onChange={e => setEditName(e.target.value)} className="text-4xl font-bold bg-white/10 p-2 rounded w-full text-white" />
                             <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t(settings.language, 'playlistDesc')} className="text-sm bg-white/10 p-2 rounded w-full text-white" />
                             <div className="flex gap-2">
                                 <button onClick={saveEdit} className="bg-green-500 text-black px-4 py-1 rounded font-bold">{t(settings.language, 'save')}</button>
                                 <button onClick={() => setIsEditing(false)} className="bg-white/10 px-4 py-1 rounded">{t(settings.language, 'cancel')}</button>
                             </div>
                         </div>
                     ) : (
                         <>
                            <h1 className="text-4xl md:text-6xl font-bold mt-2 mb-2 cursor-pointer hover:underline" onClick={startEdit}>{playlist.name}</h1>
                            <p className="text-gray-300 text-sm mb-4 cursor-pointer hover:text-white" onClick={startEdit}>{playlist.description || t(settings.language, 'playlistDesc')}</p>
                            <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <span>{playlist.songs.length} songs</span>
                                <button onClick={startEdit} className="opacity-50 hover:opacity-100"><Edit2 size={16}/></button>
                            </div>
                         </>
                     )}
                 </div>
            </div>

            <div className="p-6">
                 {playlistSongs.map((song, index) => {
                     const isCurrent = currentSong?.id === song.id;
                     return (
                         <div 
                            key={song.id} 
                            onContextMenu={(e) => handleContextMenu(e, song.id)}
                            className="group grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 rounded-md hover:bg-white/10 items-center"
                        >
                             <div className="w-8 text-center text-gray-400">{index + 1}</div>
                             <div className="flex items-center gap-4 cursor-pointer" onClick={() => play(song)}>
                                 <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                     {song.coverUrl && <img src={song.coverUrl} className="w-full h-full object-cover"/>}
                                 </div>
                                 <div>
                                     <div className={`font-medium ${isCurrent ? 'text-green-500' : 'text-white'}`}>{song.title}</div>
                                     <div className="text-sm text-gray-400">{song.artist}</div>
                                 </div>
                             </div>
                             <button onClick={() => removeFromPlaylist(playlist.id, song.id)} className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100">
                                 <Trash2 size={16} />
                             </button>
                         </div>
                     )
                 })}
            </div>
        </div>
    );
};

const SettingsView: React.FC = () => {
    const { settings, updateSettings, queue, deleteSong } = usePlayer();

    return (
        <div className="p-10 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold mb-8">{t(settings.language, 'settings')}</h1>
            
            <div className="space-y-8 max-w-2xl">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">General</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="font-medium">{t(settings.language, 'language')}</div>
                            <select 
                                value={settings.language}
                                onChange={(e) => updateSettings({ language: e.target.value as any })}
                                className="bg-gray-700 text-white rounded p-1 outline-none"
                            >
                                <option value="en">English</option>
                                <option value="zh">中文 (Chinese)</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">{t(settings.language, 'visuals')}</h2>
                    <div className="bg-cardBg rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{t(settings.language, 'lyricEffect')}</div>
                            </div>
                            <select 
                                value={settings.lyricEffect}
                                onChange={(e) => updateSettings({ lyricEffect: e.target.value as any })}
                                className="bg-gray-700 text-white rounded p-1 outline-none"
                            >
                                <option value="standard">{t(settings.language, 'effectStandard')}</option>
                                <option value="blur">{t(settings.language, 'effectBlur')}</option>
                                <option value="glow">{t(settings.language, 'effectGlow')}</option>
                                <option value="kinetic">{t(settings.language, 'effectKinetic')}</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{t(settings.language, 'particles')}</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.enableParticles} 
                                onChange={(e) => updateSettings({ enableParticles: e.target.checked })}
                                className="w-5 h-5 accent-green-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-cyan-400">{t(settings.language, 'hyperMode')}</div>
                                <div className="text-sm text-gray-400">{t(settings.language, 'hyperModeDesc')}</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={settings.enableHyperMode} 
                                onChange={(e) => updateSettings({ enableHyperMode: e.target.checked })}
                                className="w-5 h-5 accent-cyan-500"
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">Storage</h2>
                     <div className="bg-cardBg rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium">Total Songs</div>
                                <div className="text-sm text-gray-400">{queue.length} tracks in library</div>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                             <button className="text-red-400 hover:text-red-300 text-sm font-medium" onClick={() => {
                                 if(confirm("Clear entire library? This cannot be undone.")) {
                                     queue.forEach(s => deleteSong(s.id));
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
    const { queue, play, searchQuery, setSearchQuery, settings } = usePlayer();
    
    const filtered = queue.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                    type="text" 
                    placeholder={t(settings.language, 'search')}
                    className="w-full md:w-96 bg-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {searchQuery && filtered.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                        {filtered.map(song => (
                             <div 
                                key={song.id}
                                onClick={() => play(song)}
                                className="flex items-center gap-4 p-2 hover:bg-white/10 rounded cursor-pointer"
                             >
                                <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                     {song.coverUrl ? <img src={song.coverUrl} className="w-full h-full object-cover"/> : null}
                                </div>
                                <div>
                                    <div className="font-medium">{song.title}</div>
                                    <div className="text-sm text-gray-400">{song.artist}</div>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </div>
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
      className="flex h-screen bg-darkBg text-white relative overflow-hidden font-sans select-none"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#1e1e1e] to-darkBg overflow-hidden">
         {/* Navigation Content */}
         <div className="flex-1 overflow-hidden relative pb-24">
            {navView === 'library' && <SongList />}
            {navView === 'home' && <HomePage />}
            {navView === 'search' && <SearchPage />}
            {navView === 'playlist' && <PlaylistView />}
            {navView === 'settings' && <SettingsView />}
         </div>
      </div>

      <PlayerBar />

      <AnimatePresence>
        {isPlayerOpen && <LyricsView />}
      </AnimatePresence>

      {dragActive && (
        <div className="absolute inset-0 z-[100] bg-green-500/20 backdrop-blur-md border-4 border-green-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
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
