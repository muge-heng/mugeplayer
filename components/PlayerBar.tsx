import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart, Volume2, Mic2, ListMusic } from 'lucide-react';
import { formatTime } from '../utils';

const PlayerBar: React.FC = () => {
  const { 
    currentSong, isPlaying, play, pause, resume, next, prev, 
    currentTime, seek, volume, setVolume, toggleLike, 
    shuffle, toggleShuffle, repeat, toggleRepeat, view, setView
  } = usePlayer();

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  if (!currentSong) return null;

  return (
    <div className="h-24 bg-cardBg border-t border-white/5 flex items-center justify-between px-4 fixed bottom-0 left-0 right-0 z-50">
      {/* Song Info */}
      <div className="flex items-center w-1/4 min-w-[200px]">
        <div className="relative group">
            <div className={`w-14 h-14 rounded overflow-hidden mr-4 ${view === 'lyrics' ? 'hidden' : 'block'}`}>
                 {currentSong.coverUrl ? (
                    <img src={currentSong.coverUrl} alt="Art" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">🎵</div>
                 )}
            </div>
             {/* Expand lyrics overlay button only if not already in lyrics view */}
            {view !== 'lyrics' && (
                <button 
                    onClick={() => setView('lyrics')}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                >
                    <Mic2 size={16} className="text-white"/>
                </button>
            )}
        </div>
        
        <div className="overflow-hidden">
          <div className="text-sm font-semibold text-white truncate hover:underline cursor-pointer" onClick={() => setView('lyrics')}>
              {currentSong.title}
          </div>
          <div className="text-xs text-gray-400 truncate">{currentSong.artist}</div>
        </div>
        <button 
            className={`ml-4 ${currentSong.isLiked ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            onClick={() => toggleLike(currentSong.id)}
        >
          <Heart size={18} fill={currentSong.isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-2/4 max-w-2xl">
        <div className="flex items-center gap-6 mb-2">
          <button 
            onClick={toggleShuffle}
            className={`transition ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Shuffle size={18} />
          </button>
          
          <button onClick={prev} className="text-gray-300 hover:text-white transition">
            <SkipBack size={24} fill="currentColor" />
          </button>
          
          <button 
            onClick={isPlaying ? pause : resume} 
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <button onClick={next} className="text-gray-300 hover:text-white transition">
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

        <div className="w-full flex items-center gap-2 text-xs text-gray-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input 
            type="range" 
            min="0" 
            max={currentSong.duration || 0} 
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500 transition-all"
          />
          <span>{formatTime(currentSong.duration)}</span>
        </div>
      </div>

      {/* Volume & Extras */}
      <div className="flex items-center justify-end w-1/4 gap-3">
        <button onClick={() => setView(view === 'lyrics' ? 'library' : 'lyrics')} className={`text-gray-400 hover:text-white ${view === 'lyrics' ? 'text-green-500' : ''}`}>
             <Mic2 size={18} />
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
  );
};

export default PlayerBar;
