import React, { useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import LyricsView from './components/LyricsView';
import { AnimatePresence } from 'framer-motion';
import { Search, Clock } from 'lucide-react';

const HomePage: React.FC = () => {
    const { history, play } = usePlayer();
    const recent = [...history].reverse().slice(0, 6);

    return (
        <div className="p-8 overflow-y-auto h-full">
            <h1 className="text-3xl font-bold mb-6">Good Evening</h1>
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
        </div>
    );
};

const SearchPage: React.FC = () => {
    const { queue, play, searchQuery, setSearchQuery } = usePlayer();
    
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
                    placeholder="Search songs or artists" 
                    className="w-full md:w-96 bg-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {searchQuery && filtered.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">No results found for "{searchQuery}"</div>
                )}
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
                {!searchQuery && (
                    <div className="text-center text-gray-500 mt-20">
                        <Search size={48} className="mx-auto mb-4 opacity-50"/>
                        <p>Search your local library</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MainLayout: React.FC = () => {
  const { view, addToQueue, navView } = usePlayer();
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
      className="flex h-screen bg-darkBg text-white relative overflow-hidden font-sans"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#2a2a2a] to-darkBg overflow-hidden">
         {/* Top Header Placeholder */}
         <div className="h-16 flex items-center px-8 shrink-0 bg-transparent z-10 sticky top-0">
             <div className="flex gap-4 opacity-50">
                 <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-not-allowed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-not-allowed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                 </div>
             </div>
         </div>

         {/* View Content */}
         <div className="flex-1 overflow-hidden relative">
            {navView === 'library' && <SongList />}
            {navView === 'home' && <HomePage />}
            {navView === 'search' && <SearchPage />}
         </div>

         {/* Fullscreen Player Overlay */}
         <AnimatePresence>
            {view === 'lyrics' && <LyricsView key="lyrics" />}
         </AnimatePresence>
      </div>

      <PlayerBar />

      {dragActive && (
        <div className="absolute inset-0 z-[100] bg-green-500/20 backdrop-blur-md border-4 border-green-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-5xl font-bold text-white drop-shadow-xl">Drop Music & Lyrics</div>
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
