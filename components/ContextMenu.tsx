import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { ListPlus, Trash2, PlayCircle, ListMusic, X, PlusSquare } from 'lucide-react';
import { t } from '../utils/i18n';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  songId: string | null;
  playlistId?: string;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ visible, x, y, songId, playlistId, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { playlists, addToPlaylist, removeFromPlaylist, deleteSong, settings, queue, playNext, openCreatePlaylistModal } = usePlayer();
  const [showPlaylists, setShowPlaylists] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (visible) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible || !songId) return null;

  const song = queue.find(s => s.id === songId);
  if (!song) return null;

  // Adjust position if close to edge
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[100] w-60 bg-[#282828] border border-white/10 rounded-lg shadow-2xl py-1 text-sm text-gray-200"
        style={{ top: adjustedY, left: adjustedX }}
      >
        <div className="px-4 py-2 border-b border-white/5 mb-1 bg-white/5 rounded-t-lg">
            <p className="font-bold text-white truncate">{song.title}</p>
            <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        </div>

        <div 
            onClick={() => { playNext(song); onClose(); }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 cursor-pointer transition"
        >
            <PlayCircle size={16} /> {t(settings.language, 'contextPlayNext')}
        </div>

        <div 
            className="relative" 
            onMouseEnter={() => setShowPlaylists(true)}
            onMouseLeave={() => setShowPlaylists(false)}
        >
             <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 cursor-pointer transition w-full justify-between bg-transparent">
                <span className="flex items-center gap-3"><ListPlus size={16} /> {t(settings.language, 'contextAddPlaylist')}</span>
                <span className="text-gray-500">›</span>
             </div>
             
             {/* Submenu for Playlists */}
             {showPlaylists && (
                 <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute left-full top-0 w-56 pl-2 z-[105]"
                >
                    <div className="bg-[#282828] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                        <div 
                            onClick={() => {
                                openCreatePlaylistModal(songId);
                                onClose();
                            }}
                            className="px-4 py-2 hover:bg-white/10 cursor-pointer text-green-400 font-medium flex items-center gap-2 border-b border-white/5"
                        >
                            <PlusSquare size={14}/> {t(settings.language, 'createPlaylist')}
                        </div>

                        {playlists.length > 0 ? playlists.map(pl => {
                             const isIn = pl.songs.includes(songId);
                             return (
                                 <div 
                                    key={pl.id}
                                    onClick={() => { addToPlaylist(pl.id, songId); onClose(); }}
                                    className="px-4 py-2 hover:bg-white/10 cursor-pointer truncate flex items-center justify-between"
                                 >
                                     <span className="truncate">{pl.name}</span>
                                     {isIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 ml-2"></div>}
                                 </div>
                             );
                        }) : null}
                    </div>
                 </motion.div>
             )}
        </div>

        {playlistId && (
            <div 
                onClick={() => { removeFromPlaylist(playlistId, songId); onClose(); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 cursor-pointer transition text-red-400 hover:text-red-300"
            >
                <X size={16} /> {t(settings.language, 'contextRemovePlaylist')}
            </div>
        )}

        <div className="my-1 border-t border-white/5"></div>

        <div 
            onClick={() => { if(confirm(t(settings.language, 'confirmDelete'))) { deleteSong(songId); onClose(); } }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 cursor-pointer transition text-red-400 hover:text-red-300 rounded-b-lg"
        >
            <Trash2 size={16} /> {t(settings.language, 'contextDelete')}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContextMenu;
