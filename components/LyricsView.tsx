import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrc, isLrcFormat } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LyricLine } from '../types';
import { Sparkles, ArrowLeft, Mic2 } from 'lucide-react';
import { fetchLyricsWithGemini, analyzeSongVibe } from '../services/geminiService';

const LyricsView: React.FC = () => {
  const { currentSong, currentTime, setView, updateSongMetadata } = usePlayer();
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSong) return;
    
    if (currentSong.lyrics && isLrcFormat(currentSong.lyrics)) {
      setLines(parseLrc(currentSong.lyrics));
      setAiMessage(null);
    } else if (currentSong.lyrics) {
      // Plain text fallback
      setLines([{ time: 0, text: currentSong.lyrics }]);
      setAiMessage(null);
    } else {
      setLines([]);
    }
  }, [currentSong]);

  // Sync active line
  useEffect(() => {
    if (lines.length === 0) return;
    
    // Find the current line based on time
    let index = lines.findIndex(line => line.time > currentTime) - 1;
    // Handle end of song or last line
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

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-0 z-40 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden"
    >
        {/* Dynamic Background */}
        <div className="absolute inset-0 opacity-40 blur-3xl pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-900 to-purple-900 animate-pulse-slow"></div>
        </div>

        {/* Header */}
        <div className="relative z-50 p-6 flex items-center justify-between">
            <button 
                onClick={() => setView('library')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="text-center">
                <h2 className="text-xl font-bold text-white">{currentSong.title}</h2>
                <p className="text-gray-400">{currentSong.artist}</p>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={handleAnalyzeVibe}
                    disabled={isLoadingAI}
                    className="p-3 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-full backdrop-blur-md transition flex items-center gap-2"
                    title="Ask AI for Vibe Check"
                >
                    <Sparkles size={20} />
                </button>
                <button 
                    onClick={handleFetchLyrics}
                    disabled={isLoadingAI}
                    className="p-3 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-full backdrop-blur-md transition"
                    title="Generate Lyrics with AI"
                >
                    <Mic2 size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden">
            {/* Album Art (Left/Top) */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8">
                <motion.div 
                    layoutId={`album-${currentSong.id}`}
                    className="w-64 h-64 md:w-96 md:h-96 rounded-lg shadow-2xl overflow-hidden relative"
                >
                     {currentSong.coverUrl ? (
                         <img src={currentSong.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                     ) : (
                         <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
                             <span className="text-6xl">🎵</span>
                         </div>
                     )}
                </motion.div>
                {aiMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-10 left-10 right-10 md:left-20 md:right-auto md:w-80 p-4 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 text-sm text-gray-200"
                    >
                        <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold">
                            <Sparkles size={14} /> AI Insight
                        </div>
                        {aiMessage}
                    </motion.div>
                )}
            </div>

            {/* Lyrics Area (Right/Bottom) */}
            <div 
                ref={scrollContainerRef}
                className="w-full md:w-1/2 h-full overflow-y-auto hide-scrollbar px-6 md:px-20 py-20 mask-gradient"
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
            >
                {lines.length > 0 ? (
                    <div className="flex flex-col gap-6">
                        {lines.map((line, index) => {
                            const isActive = index === activeLineIndex;
                            return (
                                <motion.div
                                    key={index}
                                    id={`lyric-line-${index}`}
                                    initial={{ opacity: 0.5, scale: 0.9 }}
                                    animate={{ 
                                        opacity: isActive ? 1 : 0.4, 
                                        scale: isActive ? 1.05 : 1,
                                        filter: isActive ? 'blur(0px)' : 'blur(1px)',
                                        color: isActive ? '#ffffff' : '#9ca3af'
                                    }}
                                    transition={{ duration: 0.4 }}
                                    className={`text-2xl md:text-4xl font-bold cursor-pointer transition-all duration-500 origin-left`}
                                    onClick={() => {
                                        // Seek on click
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
                        <p className="text-2xl font-semibold mb-4">No Lyrics Available</p>
                        <p className="mb-6">Import an .lrc file or ask Gemini to write them.</p>
                        {isLoadingAI && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>}
                    </div>
                )}
                 {/* Padding for bottom scrolling */}
                <div className="h-[50vh]"></div>
            </div>
        </div>
    </motion.div>
  );
};

export default LyricsView;
