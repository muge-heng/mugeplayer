import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrc, isLrcFormat, formatTime } from '../utils';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { LyricLine } from '../types';
import { Sparkles, ArrowDown, Mic2, Disc, Square, Monitor, Upload, Wind, Play, Pause, SkipBack, SkipForward, Zap } from 'lucide-react';
import { fetchLyricsWithGemini, analyzeSongVibe } from '../services/geminiService';
import { t } from '../utils/i18n';

const Particles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        const particles: any[] = [];
        for(let i=0; i<60; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1, alpha: Math.random() * 0.5 + 0.1
            });
        }
        let animationFrameId: number;
        const render = () => {
            ctx.clearRect(0,0,w,h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0) p.x = w; if(p.x > w) p.x = 0;
                if(p.y < 0) p.y = h; if(p.y > h) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();
            });
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-30 z-0" />;
}

const LyricsView: React.FC = () => {
  const { 
      currentSong, currentTime, setPlayerOpen, updateSongMetadata, 
      visualMode, setVisualMode, uploadLyrics, settings, 
      play, pause, resume, next, prev, isPlaying, seek
  } = usePlayer();
  
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

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
    if (index < 0) index = 0;
    if (index !== activeLineIndex) setActiveLineIndex(index);
  }, [currentTime, lines]);

  useEffect(() => {
     if (activeLineIndex >= 0 && containerRef.current) {
        const LINE_HEIGHT_ESTIMATE = 80;
        const containerHeight = containerRef.current.clientHeight;
        const targetScroll = (activeLineIndex * LINE_HEIGHT_ESTIMATE) - (containerHeight / 2) + (LINE_HEIGHT_ESTIMATE / 2);
        controls.start({
            y: -Math.max(0, targetScroll),
            transition: { type: "spring", stiffness: 40, damping: 20 }
        });
     }
  }, [activeLineIndex, controls]);

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

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 150 || info.velocity.y > 200) setPlayerOpen(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      seek(Number(e.target.value));
  };

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.2 }}
      onDragEnd={handleDragEnd}
      className={`fixed inset-0 z-[60] flex flex-col bg-gray-900 text-white overflow-hidden shadow-2xl ${settings.enableHyperMode ? 'hyper-mode' : ''}`}
    >
        {/* CSS for Hyper Mode - Removed position: relative to fix layout bug */}
        {settings.enableHyperMode && (
             <style>{`
                .hyper-mode::before {
                    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
                    mix-blend-mode: overlay;
                }
                .hyper-text { text-shadow: 2px 0 red, -2px 0 cyan; letter-spacing: 0.05em; }
             `}</style>
        )}

        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
            {currentSong.coverUrl && (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-40 scale-110 blur-3xl"
                    style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
                />
            )}
            <div className={`absolute inset-0 bg-black/50 ${settings.enableHyperMode ? 'bg-black/70' : ''}`} />
            {settings.enableParticles && <Particles />}
        </div>

        {/* Drag Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full z-50 cursor-grab active:cursor-grabbing"/>

        {/* Header */}
        <div className="relative z-50 p-6 flex items-center justify-between mt-4">
            <button onClick={() => setPlayerOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition group">
                <ArrowDown size={24} className="group-hover:translate-y-1 transition-transform"/>
            </button>
            
            <div className="flex bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/10">
                <button onClick={() => setVisualMode('square')} className={`p-2 rounded-full transition ${visualMode === 'square' ? 'bg-white/20 text-white' : 'text-gray-400'}`}><Square size={18} /></button>
                <button onClick={() => setVisualMode('vinyl')} className={`p-2 rounded-full transition ${visualMode === 'vinyl' ? 'bg-white/20 text-white' : 'text-gray-400'}`}><Disc size={18} /></button>
                <button onClick={() => setVisualMode('immersive')} className={`p-2 rounded-full transition ${visualMode === 'immersive' ? 'bg-white/20 text-white' : 'text-gray-400'}`}><Monitor size={18} /></button>
                <button onClick={() => setVisualMode('particles')} className={`p-2 rounded-full transition ${visualMode === 'particles' ? 'bg-white/20 text-white' : 'text-gray-400'}`}><Wind size={18} /></button>
                {settings.enableHyperMode && <button onClick={() => setVisualMode('hyper')} className={`p-2 rounded-full transition ${visualMode === 'hyper' ? 'bg-white/20 text-cyan-300' : 'text-gray-400'}`}><Zap size={18} /></button>}
            </div>

            <div className="flex gap-2">
                 <button onClick={handleAnalyzeVibe} disabled={isLoadingAI} className="p-3 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-full backdrop-blur-md transition"><Sparkles size={20} /></button>
                <button onClick={handleFetchLyrics} disabled={isLoadingAI} className="p-3 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-full backdrop-blur-md transition"><Mic2 size={20} /></button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden">
            
            {/* Visualizer Area */}
            <div className={`w-full ${visualMode === 'immersive' ? 'hidden' : 'md:w-1/2'} flex flex-col items-center justify-center p-8 transition-all duration-500`}>
                <div className="relative">
                    {visualMode === 'vinyl' ? (
                        <motion.div 
                           animate={{ rotate: isPlaying ? 360 : 0 }}
                           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                           className="w-64 h-64 md:w-96 md:h-96 rounded-full shadow-2xl overflow-hidden border-8 border-gray-900 relative bg-black"
                        >
                            {currentSong.coverUrl && <img src={currentSong.coverUrl} className="w-full h-full object-cover opacity-90" alt="Cover" />}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full pointer-events-none"></div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            layoutId={`album-cover-${currentSong.id}`}
                            className={`w-64 h-64 md:w-96 md:h-96 rounded-2xl shadow-2xl overflow-hidden relative ${settings.enableHyperMode ? 'shadow-cyan-500/50' : ''}`}
                        >
                             {currentSong.coverUrl ? (
                                 <img src={currentSong.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                             ) : (
                                 <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center text-6xl">🎵</div>
                             )}
                        </motion.div>
                    )}
                </div>

                <div className="mt-8 text-center px-4 w-full max-w-md">
                    <h2 className={`text-3xl font-bold text-white mb-2 tracking-tight truncate ${settings.enableHyperMode ? 'hyper-text' : ''}`}>{currentSong.title}</h2>
                    <p className="text-xl text-gray-300 font-medium truncate">{currentSong.artist}</p>
                    
                    {/* Controls in Lyrics View */}
                    <div className="mt-8 flex flex-col gap-4">
                         <input 
                            type="range" 
                            min="0" 
                            max={currentSong.duration || 0} 
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-400">
                             <span>{formatTime(currentTime)}</span>
                             <span>{formatTime(currentSong.duration)}</span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-8 mt-2">
                             <button onClick={prev} className="p-2 hover:text-white text-gray-300 transition hover:scale-110"><SkipBack size={32} fill="currentColor"/></button>
                             <button onClick={() => isPlaying ? pause() : resume()} className="p-4 bg-white text-black rounded-full hover:scale-105 transition shadow-lg">
                                 {isPlaying ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor" className="ml-1"/>}
                             </button>
                             <button onClick={next} className="p-2 hover:text-white text-gray-300 transition hover:scale-110"><SkipForward size={32} fill="currentColor"/></button>
                        </div>
                    </div>
                </div>

                {aiMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/5 text-sm text-gray-200 max-w-sm text-center"
                    >
                         <div className="flex items-center justify-center gap-2 mb-1 text-indigo-400 font-semibold"><Sparkles size={14} /> AI Insight</div>
                        {aiMessage}
                    </motion.div>
                )}
            </div>

            {/* Lyrics Area */}
            <div 
                ref={containerRef}
                className={`w-full ${visualMode === 'immersive' ? 'md:w-full px-12 md:px-32' : 'md:w-1/2 px-6 md:px-12'} h-full overflow-hidden relative mask-gradient py-10`}
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }}
                onWheel={(e) => e.stopPropagation()}
            >
                {lines.length > 0 ? (
                    <motion.div animate={controls} className="flex flex-col items-start gap-0 pt-[40vh]">
                        {lines.map((line, index) => {
                            const isActive = index === activeLineIndex;
                            const isNear = Math.abs(index - activeLineIndex) <= 2;
                            
                            // Define Animation Variants
                            const getVariants = () => {
                                const base = {
                                    opacity: isActive ? 1 : isNear ? 0.6 : 0.2,
                                    scale: isActive ? 1.05 : 0.95,
                                    filter: isActive ? 'blur(0px)' : 'none',
                                    x: isActive ? 20 : 0,
                                    textShadow: 'none'
                                };

                                if (settings.lyricEffect === 'blur') {
                                    base.filter = isActive ? 'blur(0px)' : 'blur(4px)';
                                }
                                if (settings.lyricEffect === 'glow' && isActive) {
                                    base.textShadow = '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)';
                                }
                                if (settings.lyricEffect === 'kinetic') {
                                    base.scale = isActive ? 1.2 : 0.8;
                                    base.x = isActive ? 40 : 0;
                                }
                                
                                return base;
                            };

                            return (
                                <motion.div
                                    key={index}
                                    className={`py-4 w-full cursor-pointer transition-colors duration-500`}
                                    animate={getVariants()}
                                    onClick={() => {
                                        const player = document.querySelector('audio');
                                        if (player) player.currentTime = line.time;
                                    }}
                                >
                                    <span className={`text-3xl md:text-5xl font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-400'} ${settings.enableHyperMode && isActive ? 'hyper-text' : ''}`}>
                                        {line.text}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                        <p className="text-3xl font-bold text-white mb-2">{t(settings.language, 'noLyrics')}</p>
                        <div className="flex flex-col gap-3 w-full max-w-xs mt-8">
                             <button onClick={() => lyricsInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-full font-medium transition"><Upload size={18} /> {t(settings.language, 'uploadLrc')}</button>
                            <input type="file" ref={lyricsInputRef} onChange={(e) => { if(e.target.files) uploadLyrics(e.target.files[0]) }} accept=".lrc,text/plain" className="hidden" />
                            <button onClick={handleFetchLyrics} disabled={isLoadingAI} className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-500 rounded-full font-medium transition disabled:opacity-50">{isLoadingAI ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <Sparkles size={18} />} {t(settings.language, 'generateAi')}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </motion.div>
  );
};

export default LyricsView;
