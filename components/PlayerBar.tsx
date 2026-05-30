import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, Volume2, Maximize2, ChevronUp, Plus, ListMusic } from 'lucide-react';
import { formatTime } from '../utils';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';

const PlayerBar: React.FC = () => {
  const { 
    currentSong, isPlaying, pause, resume, next, prev, 
    currentTime, seek, volume, setVolume, toggleLike, 
    shuffle, toggleShuffle, repeat, toggleRepeat, isPlayerOpen, setPlayerOpen,
    playlists, addToPlaylist, openCreatePlaylistModal, isQueueOpen, setQueueOpen
  } = usePlayer();

  const [showQuickPlaylist, setShowQuickPlaylist] = useState(false);
  const likeTimerRef = useRef<number | null>(null);
  
  // Ref to track if the user is currently dragging to prevent click events
  const isDraggingRef = useRef(false);
  
  const controls = useAnimation();

  // Reset drag position when song changes or player state changes
  useEffect(() => {
    controls.start({ x: 0, y: 0 });
  }, [currentSong, isPlayerOpen, controls]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const handleLikeStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      likeTimerRef.current = window.setTimeout(() => {
          setShowQuickPlaylist(true);
          likeTimerRef.current = null;
      }, 500); // 500ms long press
  };

  const handleLikeEnd = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation(); // Stop propagation to prevent opening player
      if (likeTimerRef.current) {
          clearTimeout(likeTimerRef.current);
          likeTimerRef.current = null;
          // Normal Click if timer wasn't fired
          if (currentSong && !showQuickPlaylist) toggleLike(currentSong.id);
      }
  };

  const handleDragStart = () => {
      isDraggingRef.current = true;
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);

      // Prioritize Direction to prevent accidental triggers
      // Vertical swipe needs to be dominant and clear
      if (absY > absX * 1.2) { 
          // Up Swipe -> Open Player
          // Increased threshold: > 80px drag OR > 400 velocity
          if (offset.y < -80 || velocity.y < -400) {
              setPlayerOpen(true);
          }
      } else if (absX > absY) {
          // Horizontal Swipe Logic
          // Left Swipe -> Next Song
          if (offset.x < -50 || velocity.x < -300) {
              next();
          }
          // Right Swipe -> Prev Song
          else if (offset.x > 50 || velocity.x > 300) {
              prev();
          }
      }
      
      // Always animate back to center
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });

      // Reset dragging state after a small delay to ensure onClick doesn't fire immediately
      setTimeout(() => {
          isDraggingRef.current = false;
      }, 100);
  };

  const handleClick = () => {
      // Only open if we haven't been dragging and player isn't already open
      if (!isDraggingRef.current && !isPlayerOpen) {
          setPlayerOpen(true);
      }
  };

  if (!currentSong) return null;

  return (
    <>
        {/* Invisible Drag Trigger Area for easier pulling on mobile */}
        <div 
            className="fixed bottom-0 left-0 right-0 h-28 z-40 md:hidden" 
            style={{ touchAction: 'none' }}
        ></div>

        <motion.div 
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={{ top: 0.2, bottom: 0.05, left: 0.2, right: 0.2 }} // Follow-hand feel
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            animate={controls}
            className="h-[70px] md:h-24 bg-playerBg border-t border-borderColor flex items-center justify-between px-3 md:px-6 fixed bottom-[60px] md:bottom-0 left-0 right-0 z-50 transition-all duration-300 glass-panel shadow-[0_-5px_20px_rgba(0,0,0,0.3)]"
            onClick={handleClick}
        >
        
        {/* Hover Hint */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity bg-black/50 px-2 py-0.5 rounded-full text-[10px] text-gray-300 pointer-events-none border border-white/10 hidden md:block">
            <ChevronUp size={12} className="inline mr-1"/> Click to Expand
        </div>

        {/* --- Song Info (Mobile: Compressed) --- */}
        <div className="flex items-center flex-1 md:w-1/4 min-w-0 relative z-50 mr-2 md:mr-0 pointer-events-none">
            <div className="relative group pointer-events-auto">
                <div 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-md overflow-hidden mr-3 md:mr-4 shadow-lg cursor-pointer flex-shrink-0 relative"
                >
                    <AnimatePresence mode='popLayout'>
                        <motion.img 
                            key={currentSong.coverUrl || 'default-' + currentSong.id}
                            initial={{ x: 50, opacity: 0, scale: 0.8 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: -50, opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            src={currentSong.coverUrl} 
                            alt="Art" 
                            className="w-full h-full object-cover absolute inset-0" 
                        />
                    </AnimatePresence>
                    {!currentSong.coverUrl && (
                         <div className="w-full h-full bg-cardBg flex items-center justify-center">🎵</div>
                    )}
                </div>
            </div>
            
            <div className="overflow-hidden pointer-events-auto flex-1 mr-2 relative h-10 flex flex-col justify-center">
                 <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentSong.title + currentSong.artist}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="w-full"
                    >
                        <div className="text-sm font-bold text-textPrimary truncate">
                            {currentSong.title}
                        </div>
                        <div className="text-xs text-textSecondary truncate">{currentSong.artist}</div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Like Button (Visible on Mobile now, strict Z-index) */}
            <div className="relative pointer-events-auto z-[60] flex items-center">
                <button 
                    className={`transition active:scale-90 p-2 rounded-full hover:bg-white/10 ${currentSong.isLiked ? 'text-spotGreen' : 'text-textSecondary hover:text-textPrimary'}`}
                    onMouseDown={handleLikeStart}
                    onMouseUp={handleLikeEnd}
                    onMouseLeave={(e) => { e.stopPropagation(); if(likeTimerRef.current) clearTimeout(likeTimerRef.current); }}
                    onTouchStart={handleLikeStart}
                    onTouchEnd={handleLikeEnd}
                    onClick={(e) => e.stopPropagation()} // Extra safety
                >
                    <Heart size={22} fill={currentSong.isLiked ? "currentColor" : "none"} />
                </button>
                
                {/* Quick Playlist Popover */}
                <AnimatePresence>
                    {showQuickPlaylist && (
                        <>
                            <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setShowQuickPlaylist(false); }}></div>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full left-0 mb-4 bg-cardBg w-64 rounded-xl shadow-2xl border border-borderColor p-2 z-[80]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-xs font-bold text-textSecondary px-3 py-2 uppercase tracking-wider">Add to Playlist</div>
                                <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                                    {playlists.map(pl => {
                                        const isIn = pl.songs.includes(currentSong.id);
                                        return (
                                            <div 
                                                key={pl.id}
                                                onClick={() => { addToPlaylist(pl.id, currentSong.id); setShowQuickPlaylist(false); }}
                                                className="flex items-center justify-between px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                                            >
                                                <span className="truncate text-sm text-textPrimary">{pl.name}</span>
                                                {isIn && <div className="w-2 h-2 rounded-full bg-spotGreen"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div 
                                    onClick={() => {
                                        openCreatePlaylistModal(currentSong.id);
                                        setShowQuickPlaylist(false);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-spotGreen hover:bg-white/10 rounded cursor-pointer border-t border-borderColor"
                                >
                                    <Plus size={16} /> <span className="text-sm font-bold">New Playlist</span>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* --- Controls (Middle) --- */}
        <div className="flex flex-col items-center justify-center pointer-events-auto z-50">
            <div className="flex items-center gap-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
                    className={`transition hidden md:block ${shuffle ? 'text-spotGreen drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]' : 'text-textSecondary hover:text-textPrimary'}`}
                >
                    <Shuffle size={18} />
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); prev(); }} 
                    className="text-textSecondary hover:text-textPrimary transition hover:scale-110 active:scale-95 hidden md:block"
                >
                    <SkipBack size={24} fill="currentColor" />
                </button>
                
                {/* Main Play Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume(); }} 
                    className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-textPrimary text-playerBg flex items-center justify-center hover:scale-105 transition shadow-lg active:scale-95 mx-2"
                >
                    {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); next(); }} 
                    className="text-textSecondary hover:text-textPrimary transition hover:scale-110 active:scale-95 hidden md:block"
                >
                    <SkipForward size={24} fill="currentColor" />
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleRepeat(); }}
                    className={`transition relative hidden md:block ${repeat !== 'off' ? 'text-spotGreen drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]' : 'text-textSecondary hover:text-textPrimary'}`}
                >
                    <Repeat size={18} />
                    {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                </button>
            </div>

            {/* Progress Bar (Desktop Only for Layout simplicity) */}
            <div className="w-[30vw] hidden md:flex items-center gap-3 text-xs text-textSecondary font-mono mt-1" onClick={(e) => e.stopPropagation()}>
                <span>{formatTime(currentTime)}</span>
                <div className="relative w-full h-1 group cursor-pointer">
                    <div className="absolute inset-0 bg-textSecondary/20 rounded-lg"></div>
                    <div 
                        className="absolute top-0 left-0 h-full bg-textPrimary rounded-lg group-hover:bg-spotGreen transition-colors"
                        style={{ width: `${(currentTime / (currentSong.duration || 1)) * 100}%` }}
                    ></div>
                    <input 
                        type="range" 
                        min="0" 
                        max={currentSong.duration || 0} 
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <span>{formatTime(currentSong.duration)}</span>
            </div>
        </div>

        {/* --- Volume & Extras (Right) --- */}
        <div className="flex items-center justify-end w-auto md:w-1/4 gap-4 pointer-events-auto z-50 ml-2">
            
            {/* Queue Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); setQueueOpen(!isQueueOpen); }} 
                className={`transition ${isQueueOpen ? 'text-spotGreen' : 'text-textSecondary hover:text-textPrimary'}`}
            >
                <ListMusic size={24} />
            </button>
            
            <button 
                onClick={(e) => { e.stopPropagation(); setPlayerOpen(!isPlayerOpen); }} 
                className="text-textSecondary hover:text-textPrimary hidden md:block"
            >
                <Maximize2 size={18} />
            </button>
            
            <div className="flex items-center gap-2 group w-24 hidden md:flex" onClick={(e) => e.stopPropagation()}>
                <Volume2 size={18} className="text-textSecondary" />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-textSecondary/30 rounded-lg appearance-none cursor-pointer accent-textSecondary group-hover:accent-spotGreen"
                />
            </div>
        </div>
        </motion.div>
    </>
  );
};

export default PlayerBar;