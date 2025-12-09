import React, { useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Clock, Play, Music, ArrowUpDown, Upload } from 'lucide-react';
import { formatTime } from '../utils';
import ContextMenu from './ContextMenu';
import { ContextMenuState } from '../types';
import { t } from '../utils/i18n';

const SongList: React.FC = () => {
  // Use library here instead of queue to show all songs
  const { library, currentSong, play, isPlaying, sortOption, setSortOption, settings, addToQueue } = usePlayer();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, songId: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex-1 overflow-y-auto pb-40 md:pb-32 px-3 md:px-6">
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
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-textPrimary"
                    title={t(settings.language, 'importMusic')}
                >
                    <Upload size={18} />
                </button>
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
               <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-3 border-b border-borderColor text-textSecondary text-xs font-bold uppercase tracking-wider sticky top-0 bg-playerBg/90 backdrop-blur-md z-10">
                  <div className="w-6 md:w-8 text-center">#</div>
                  <div>{t(settings.language, 'sortTitle')}</div>
                  <div className="hidden md:block">{t(settings.language, 'sortArtist')}</div>
                  <div className="mr-2 text-right"><Clock size={16} className="inline"/></div>
               </div>

               <div className="mt-2 space-y-1">
                 {sortedLibrary.map((song, index) => {
                   const isCurrent = currentSong?.id === song.id;
                   return (
                     <div 
                        key={song.id}
                        onClick={() => play(song)}
                        onContextMenu={(e) => handleContextMenu(e, song.id)}
                        className={`group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-3 rounded-lg hover:bg-white/10 transition cursor-pointer items-center ${isCurrent ? 'bg-white/10' : ''}`}
                     >
                        <div className="w-6 md:w-8 text-center relative flex items-center justify-center">
                            <span className={`group-hover:hidden ${isCurrent ? 'hidden' : 'text-textSecondary font-mono text-sm'}`}>{index + 1}</span>
                            <span className={`hidden group-hover:block ${isCurrent && isPlaying ? 'hidden' : 'text-textPrimary'}`}>
                                <Play size={14} fill="currentColor"/>
                            </span>
                            {isCurrent && isPlaying && (
                                 <div className="flex items-end gap-[2px] h-3">
                                     <div className="w-1 bg-spotGreen animate-pulse h-full"></div>
                                     <div className="w-1 bg-spotGreen animate-pulse h-2/3 delay-75"></div>
                                     <div className="w-1 bg-spotGreen animate-pulse h-1/2 delay-150"></div>
                                 </div>
                            )}
                            {isCurrent && !isPlaying && <span className="text-spotGreen font-bold">{index + 1}</span>}
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
                            
                            {/* Layout Optimization: Flex 1 and Min-W-0 force text to truncate properly inside the grid */}
                            <div className="flex flex-col truncate flex-1 min-w-0">
                                <div className="flex items-center">
                                     <span className={`font-medium truncate ${isCurrent ? 'text-spotGreen' : 'text-textPrimary'}`}>{song.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     {song.lyrics && (
                                         <span className="flex-shrink-0 bg-white/10 text-[9px] text-textSecondary px-1 rounded border border-white/5 font-mono tracking-tighter" title="Lyrics available">
                                             LRC
                                         </span>
                                     )}
                                     <span className="text-xs text-textSecondary truncate group-hover:text-textPrimary transition md:hidden">{song.artist}</span>
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
    </div>
  );
};

export default SongList;