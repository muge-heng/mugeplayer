import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, Volume2, Mic2, Maximize2, ChevronUp } from 'lucide-react';
import { formatTime } from '../utils';

const PlayerBar: React.FC = () => {
  const { 
    currentSong, isPlaying, play, pause, resume, next, prev, 
    currentTime, seek, volume, setVolume, toggleLike, 
    shuffle, toggleShuffle, repeat, toggleRepeat, isPlayerOpen, setPlayerOpen
  } = usePlayer();

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  if (!currentSong) return null;

  return (
    <>
        {/* Invisible Drag Trigger for Mobile/Desktop */}
        <div 
            className="fixed bottom-0 left-0 right-0 h-24 z-40 cursor-pointer" 
            onClick={() => !isPlayerOpen && setPlayerOpen(true)}
        ></div>

        <div className="h-24 bg-cardBg/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300">
        
        {/* Hover Hint */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity bg-black/50 px-2 py-0.5 rounded-full text-[10px] text-gray-300 pointer-events-none border border-white/10">
            <ChevronUp size={12} className="inline mr-1"/> Click to Expand
        </div>

        {/* Song Info */}
        <div className="flex items-center w-1/4 min-w-[200px] relative z-50 pointer-events-none">
            <div className="relative group pointer-events-auto">
                <div 
                    className="w-14 h-14 rounded-md overflow-hidden mr-4 shadow-lg cursor-pointer hover:scale-105 transition"
                    onClick={() => setPlayerOpen(true)}
                >
                    {currentSong.coverUrl ? (
                        <img src={currentSong.coverUrl} alt="Art" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">🎵</div>
                    )}
                </div>
            </div>
            
            <div className="overflow-hidden pointer-events-auto">
            <div className="text-sm font-semibold text-white truncate hover:underline cursor-pointer" onClick={() => setPlayerOpen(true)}>
                {currentSong.title}
            </div>
            <div className="text-xs text-gray-400 truncate">{currentSong.artist}</div>
            </div>
            <button 
                className={`ml-4 pointer-events-auto ${currentSong.isLiked ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id); }}
            >
            <Heart size={18} fill={currentSong.isLiked ? "currentColor" : "none"} />
            </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-2/4 max-w-2xl pointer-events-auto z-50">
            <div className="flex items-center gap-6 mb-2">
            <button 
                onClick={toggleShuffle}
                className={`transition ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            >
                <Shuffle size={18} />
            </button>
            
            <button onClick={prev} className="text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
                <SkipBack size={24} fill="currentColor" />
            </button>
            
            <button 
                onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume(); }} 
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg active:scale-95"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            
            <button onClick={next} className="text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
                <SkipForward size={24} fill="currentColor" />
            </button>
            
            <button 
                onClick={toggleRepeat}
                className={`transition relative ${repeat !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            >
                <Repeat size={18} />
                {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
            </button>
            </div>

            <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div className="relative w-full h-1 group cursor-pointer">
                <div className="absolute inset-0 bg-gray-600 rounded-lg"></div>
                <div 
                    className="absolute top-0 left-0 h-full bg-white rounded-lg group-hover:bg-green-500 transition-colors"
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

        {/* Volume & Extras */}
        <div className="flex items-center justify-end w-1/4 gap-3 pointer-events-auto z-50">
            <button onClick={() => setPlayerOpen(!isPlayerOpen)} className="text-gray-400 hover:text-white hidden md:block">
                <Maximize2 size={18} />
            </button>
            <div className="flex items-center gap-2 group w-32">
            <Volume2 size={18} className="text-gray-400" />
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-400 group-hover:accent-green-500"
            />
            </div>
        </div>
        </div>
    </>
  );
};

export default PlayerBar;
