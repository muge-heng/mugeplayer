import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrc, isLrcFormat } from '../utils';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { LyricLine } from '../types';
import { Sparkles, ArrowDown, Mic2, Disc, Square, Monitor, Upload } from 'lucide-react';
import { fetchLyricsWithGemini, analyzeSongVibe } from '../services/geminiService';

const LyricsView: React.FC = () => {
  const { currentSong, currentTime, setView, updateSongMetadata, visualMode, setVisualMode, uploadLyrics } = usePlayer();
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentSong) return;
    
    if (currentSong.lyrics && isLrcFormat(currentSong.lyrics)) {
      setLines(parseLrc(currentSong.lyrics));
      setAiMessage(null);
    } else if (currentSong.lyrics) {
      setLines([{ time: 0, text: currentSong.lyrics }]);
      setAiMessage(null);
    } else {
      setLines([]);
    }
  }, [currentSong]);

  useEffect(() => {
    if (lines.length === 0) return;
    let index = lines.findIndex(line => line.time > currentTime) - 1;
    if (index === -2) index = lines.length - 1; 
    
    if (index !== activeLineIndex) {
      setActiveLineIndex(index);
      scrollToActiveLine(index);
    }
  }, [currentTime, lines]);

  const scrollToActiveLine = (index: number) => {
    if (!scrollContainerRef.current) return;
    const element = document.getElementById(`lyric-line-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFetchLyrics = async () => {
      if (!currentSong) return;
      setIsLoadingAI(true);
      const fetchedLyrics = await fetchLyricsWithGemini(currentSong);
      updateSongMetadata(currentSong.id, { lyrics: fetchedLyrics });
      setIsLoadingAI(false);
  };

  const handleAnalyzeVibe = async () => {
      if(!currentSong) return;
      setIsLoadingAI(true);
      const vibe = await analyzeSongVibe(currentSong);
      setAiMessage(vibe);
      setIsLoadingAI(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          uploadLyrics(e.target.files[0]);
      }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 100) {
        setView('library');
    }
  };

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.2 }}
      onDragEnd={handleDragEnd}
      className="fixed inset-0 z-50 flex flex-col bg-gray-900 text-white overflow-hidden"
    >
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
            {currentSong.coverUrl && (
                <div 
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 scale-125 transition-all duration-1000"
                    style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
                />
            )}
            <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Header / Drag Handle */}
        <div className="relative z-50 p-4 flex items-center justify-between">
            <button 
                onClick={() => setView('library')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition"
            >
                <ArrowDown size={24} />
            </button>
            
            {/* Visualizer Toggles */}
            <div className="flex bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
                <button 
                    onClick={() => setVisualMode('square')}
                    className={`p-2 rounded-full transition ${visualMode === 'square' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
                >
                    <Square size={16} />
                </button>
                <button 
                    onClick={() => setVisualMode('vinyl')}
                    className={`p-2 rounded-full transition ${visualMode === 'vinyl' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
                >
                    <Disc size={16} />
                </button>
                <button 
                    onClick={() => setVisualMode('immersive')}
                    className={`p-2 rounded-full transition ${visualMode === 'immersive' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
                >
                    <Monitor size={16} />
                </button>
            </div>

            <div className="flex gap-2">
                 <button 
                    onClick={handleAnalyzeVibe}
                    disabled={isLoadingAI}
                    className="p-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-full backdrop-blur-md transition"
                >
                    <Sparkles size={20} />
                </button>
                <button 
                    onClick={handleFetchLyrics}
                    disabled={isLoadingAI}
                    className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-full backdrop-blur-md transition"
                >
                    <Mic2 size={20} />
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden">
            
            {/* Visualizer Area */}
            <div className={`w-full ${visualMode === 'immersive' ? 'hidden' : 'md:w-1/2'} flex flex-col items-center justify-center p-8 transition-all duration-500`}>
                <div className="relative">
                    {visualMode === 'vinyl' ? (
                        <motion.div 
                           initial={{ rotate: 0 }}
                           animate={{ rotate: 360 }}
                           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                           className="w-64 h-64 md:w-96 md:h-96 rounded-full shadow-2xl overflow-hidden border-4 border-gray-800 relative bg-black"
                        >
                            {currentSong.coverUrl && <img src={currentSong.coverUrl} className="w-full h-full object-cover opacity-90" alt="Cover" />}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full pointer-events-none"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-black rounded-full border-4 border-gray-800 flex items-center justify-center">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            layoutId={`album-${currentSong.id}`}
                            className="w-64 h-64 md:w-96 md:h-96 rounded-xl shadow-2xl overflow-hidden relative no-drag"
                        >
                             {currentSong.coverUrl ? (
                                 <img src={currentSong.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                             ) : (
                                 <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
                                     <span className="text-6xl">🎵</span>
                                 </div>
                             )}
                        </motion.div>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">{currentSong.title}</h2>
                    <p className="text-lg text-gray-300">{currentSong.artist}</p>
                    <p className="text-sm text-gray-400 mt-1">{currentSong.album}</p>
                </div>

                {aiMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/5 text-sm text-gray-200 max-w-sm"
                    >
                         <div className="flex items-center gap-2 mb-1 text-indigo-400 font-semibold">
                            <Sparkles size={14} /> Vibe Check
                        </div>
                        {aiMessage}
                    </motion.div>
                )}
            </div>

            {/* Lyrics Area */}
            <div 
                ref={scrollContainerRef}
                className={`w-full ${visualMode === 'immersive' ? 'md:w-full px-12 md:px-32' : 'md:w-1/2 px-6 md:px-12'} h-full overflow-y-auto hide-scrollbar py-20 mask-gradient relative`}
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}
            >
                {lines.length > 0 ? (
                    <div className="flex flex-col gap-6 md:gap-8">
                        {lines.map((line, index) => {
                            const isActive = index === activeLineIndex;
                            return (
                                <motion.div
                                    key={index}
                                    id={`lyric-line-${index}`}
                                    initial={false}
                                    animate={{ 
                                        opacity: isActive ? 1 : 0.3, 
                                        scale: isActive ? 1.05 : 0.95,
                                        filter: isActive ? 'blur(0px)' : 'blur(1.5px)',
                                        color: isActive ? '#ffffff' : '#9ca3af',
                                        x: isActive ? 0 : -10
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className={`text-2xl md:text-5xl font-bold cursor-pointer transition-all origin-left leading-tight`}
                                    onClick={() => {
                                        const player = document.querySelector('audio');
                                        if (player) player.currentTime = line.time;
                                    }}
                                >
                                    {line.text}
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                        <p className="text-3xl font-bold text-white mb-2">No Lyrics</p>
                        <p className="mb-8 max-w-xs">Drag & drop an .lrc file here, or click below.</p>
                        
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                             <button 
                                onClick={() => lyricsInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-full font-medium transition"
                            >
                                <Upload size={18} /> Upload LRC
                            </button>
                            <input type="file" ref={lyricsInputRef} onChange={handleFileChange} accept=".lrc,text/plain" className="hidden" />
                            
                            <button 
                                onClick={handleFetchLyrics}
                                disabled={isLoadingAI}
                                className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-500 rounded-full font-medium transition disabled:opacity-50"
                            >
                                {isLoadingAI ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Sparkles size={18} />}
                                Generate with AI
                            </button>
                        </div>
                    </div>
                )}
                <div className="h-[50vh]"></div>
            </div>
        </div>
    </motion.div>
  );
};

export default LyricsView;
