import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Clock, Play, Music } from 'lucide-react';
import { formatTime } from '../utils';

const SongList: React.FC = () => {
  const { queue, currentSong, play, isPlaying, pause } = usePlayer();

  if (queue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Music size={40} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your library is empty</h2>
        <p>Drag and drop audio files anywhere or use the import button.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6">
       {/* Header Row */}
       <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-gray-400 text-sm font-medium uppercase sticky top-0 bg-darkBg z-10">
          <div className="w-8 text-center">#</div>
          <div>Title</div>
          <div>Album</div>
          <div className="mr-4"><Clock size={16} /></div>
       </div>

       {/* List */}
       <div className="mt-2">
         {queue.map((song, index) => {
           const isCurrent = currentSong?.id === song.id;
           return (
             <div 
                key={song.id}
                onClick={() => play(song)}
                className={`group grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 rounded-md hover:bg-white/10 transition cursor-pointer items-center ${isCurrent ? 'text-green-500' : 'text-gray-300'}`}
             >
                <div className="w-8 text-center relative flex items-center justify-center">
                    <span className={`group-hover:hidden ${isCurrent ? 'hidden' : 'block'}`}>{index + 1}</span>
                    <span className={`hidden group-hover:block ${isCurrent && isPlaying ? 'hidden' : 'block'}`}>
                        <Play size={14} fill="currentColor"/>
                    </span>
                    {isCurrent && isPlaying && (
                         <div className="flex items-end gap-[2px] h-3">
                             <div className="w-1 bg-green-500 animate-pulse h-full"></div>
                             <div className="w-1 bg-green-500 animate-pulse h-2/3 delay-75"></div>
                             <div className="w-1 bg-green-500 animate-pulse h-1/2 delay-150"></div>
                         </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                        {song.coverUrl ? (
                            <img src={song.coverUrl} className="w-full h-full object-cover" alt="art" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                                <Music size={16} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className={`font-medium truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>{song.title}</span>
                        <span className="text-xs text-gray-400 truncate">{song.artist}</span>
                    </div>
                </div>

                <div className="text-sm text-gray-400 truncate hidden md:block">
                    {song.album}
                </div>

                <div className="text-sm text-gray-400 font-mono">
                    {formatTime(song.duration)}
                </div>
             </div>
           );
         })}
       </div>
    </div>
  );
};

export default SongList;
