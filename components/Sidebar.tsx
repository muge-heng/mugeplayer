import React, { useRef, useState } from 'react';
import { Home, Search, Library, PlusSquare, Heart, Settings, ListMusic, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { NavView, Playlist } from '../types';
import { t } from '../utils/i18n';

const Sidebar: React.FC = () => {
  const { addToQueue, navView, setNavView, playlists, library, createPlaylist, setActivePlaylist, activePlaylistId, deletePlaylist, settings } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addToQueue(e.target.files);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPlaylistName.trim()) {
          await createPlaylist(newPlaylistName);
          setNewPlaylistName('');
          setIsCreating(false);
      }
  };

  // Helper for covers
  const getPlaylistCover = (pl: Playlist) => {
      if (pl.coverUrl) return pl.coverUrl;
      if (pl.useFirstSongCover && pl.songs.length > 0) {
          const song = library.find(s => s.id === pl.songs[0]);
          if (song && song.coverUrl) return song.coverUrl;
      }
      return null;
  };

  const NavItem = ({ icon: Icon, label, view, onClick }: { icon: any, label: string, view?: NavView, onClick?: () => void }) => (
      <div 
        onClick={() => {
            if (onClick) onClick();
            if (view) setNavView(view);
        }}
        className={`flex items-center gap-4 font-medium transition cursor-pointer p-2 rounded-md ${navView === view ? 'text-textPrimary bg-white/10 shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
      >
         <Icon size={24} />
         <span>{label}</span>
      </div>
  );

  return (
    <div className="w-64 bg-sidebarBg h-full flex flex-col p-6 border-r border-borderColor flex-shrink-0 hidden md:flex z-20 relative pb-32 glass-panel transition-colors duration-300">
      <div className="mb-8 flex items-center gap-3">
         {/* Advanced Logo */}
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
         </div>
         <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-textPrimary to-textSecondary">Muse.ai</h1>
      </div>

      <nav className="flex flex-col gap-2 mb-8">
        <NavItem icon={Home} label={t(settings.language, 'home')} view="home" />
        <NavItem icon={Search} label={t(settings.language, 'search')} view="search" />
        <NavItem icon={Library} label={t(settings.language, 'library')} view="library" />
      </nav>

      <div className="mb-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 mb-2 text-textSecondary text-sm font-semibold uppercase tracking-wider">
              <span>{t(settings.language, 'playlists')}</span>
              <button onClick={() => setIsCreating(true)} className="hover:text-textPrimary transition"><PlusSquare size={16} /></button>
          </div>
          
          {isCreating && (
              <form onSubmit={handleCreatePlaylist} className="mb-2 px-2">
                  <input 
                    autoFocus
                    type="text" 
                    className="w-full bg-inputBg text-textPrimary text-sm rounded px-2 py-1 outline-none border border-borderColor focus:border-spotGreen"
                    placeholder={t(settings.language, 'playlistName')}
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onBlur={() => setIsCreating(false)}
                  />
              </form>
          )}

          <div className="flex flex-col gap-1 overflow-y-auto hide-scrollbar">
               <div 
                   onClick={() => {
                       setNavView('playlist');
                       setActivePlaylist('liked');
                   }}
                   className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition ${navView === 'playlist' && activePlaylistId === 'liked' ? 'text-textPrimary bg-white/10' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
               >
                   <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center">
                       <Heart size={12} fill="white" className="text-white"/>
                   </div>
                   <span className="truncate">{t(settings.language, 'likedSongs')}</span>
               </div>
               
               {playlists.map(pl => {
                   const cover = getPlaylistCover(pl);
                   return (
                       <div 
                            key={pl.id}
                            className={`group flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition ${navView === 'playlist' && activePlaylistId === pl.id ? 'text-textPrimary bg-white/10' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
                            onClick={() => {
                                setNavView('playlist');
                                setActivePlaylist(pl.id);
                            }}
                       >
                           <div className="flex items-center gap-3 overflow-hidden">
                               <div className="w-6 h-6 rounded bg-cardBg flex items-center justify-center flex-shrink-0">
                                   {cover ? <img src={cover} className="w-full h-full rounded object-cover"/> : <ListMusic size={14}/>}
                               </div>
                               <span className="truncate">{pl.name}</span>
                           </div>
                           <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm(t(settings.language, 'confirmDelete'))) deletePlaylist(pl.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1"
                           >
                               <Trash2 size={12} />
                           </button>
                       </div>
                   );
               })}
          </div>
      </div>

      <div className="mt-auto space-y-4">
         <NavItem icon={Settings} label={t(settings.language, 'settings')} view="settings" />

         <div className="border-t border-borderColor pt-4">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs border border-borderColor rounded-full px-3 py-2 text-textSecondary hover:border-textPrimary hover:text-textPrimary transition flex items-center justify-center gap-2"
            >
                <PlusSquare size={14} /> {t(settings.language, 'importMusic')}
            </button>
         </div>
      </div>

      <input 
        type="file" 
        multiple 
        accept="audio/*,.lrc,.flac" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Sidebar;