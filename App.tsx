import React, { useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import LyricsView from './components/LyricsView';
import { AnimatePresence } from 'framer-motion';

const MainLayout: React.FC = () => {
  const { view, addToQueue } = usePlayer();
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
      className="flex h-screen bg-darkBg text-white relative overflow-hidden"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#2a2a2a] to-darkBg">
         {/* Top Bar / Header would go here */}
         <div className="h-16 flex items-center px-8 shrink-0 bg-transparent z-10 sticky top-0 backdrop-blur-sm">
             {/* Navigation buttons */}
             <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-pointer text-gray-300 hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-pointer text-gray-300 hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                 </div>
             </div>
         </div>

         <SongList />

         {/* Fullscreen Lyrics Overlay */}
         <AnimatePresence>
            {view === 'lyrics' && <LyricsView key="lyrics" />}
         </AnimatePresence>
      </div>

      {/* Persistent Player */}
      <PlayerBar />

      {/* Drag Drop Overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-[60] bg-green-500/20 backdrop-blur-sm border-4 border-green-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-4xl font-bold text-white drop-shadow-lg">Drop your music here</div>
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
