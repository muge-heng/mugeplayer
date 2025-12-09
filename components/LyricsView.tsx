import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrc, isLrcFormat, formatTime } from '../utils';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { LyricLine } from '../types';
import { Sparkles, ArrowDown, Mic2, Disc, Square, Monitor, Upload, Wind, Play, Pause, SkipBack, SkipForward, Zap, CassetteTape, Heart, ListMusic, Shuffle, Repeat } from 'lucide-react';
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
      play, pause, resume, next, prev, isPlaying, seek,
      toggleLike, setQueueOpen, isQueueOpen, shuffle, toggleShuffle, repeat, toggleRepeat
  } = usePlayer();
  
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Load and Parse Lyrics
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

  // Sync Active Line
  useEffect(() => {
    if (lines.length === 0) return;
    let index = lines.findIndex(line => line.time > currentTime) - 1;
    // Keep the last line active if we are past the last timestamp
    if (index === -2) index = lines.length - 1;
    if (index < 0) index = 0;
    
    if (index !== activeLineIndex) {
        setActiveLineIndex(index);
    }
  }, [currentTime, lines]);

  // Handle Precise Centered Scrolling
  useEffect(() => {
     if (activeLineIndex >= 0 && containerRef.current) {
        const activeEl = document.getElementById(`lyric-line-${activeLineIndex}`);
        if (activeEl) {
            const containerHeight = containerRef.current.clientHeight;
            const elOffset = activeEl.offsetTop;
            const elHeight = activeEl.clientHeight;
            
            const targetScroll = (containerHeight / 2) - (elOffset + elHeight / 2);

            controls.start({
                y: targetScroll,
                transition: { 
                    type: "spring", 
                    stiffness: 180, 
                    damping: 25, 
                    mass: 0.8 
                }
            });
        }
     }
  }, [activeLineIndex, lines, controls]);

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

  // Helper for generating styles based on mode
  const getLineStyles = (isActive: boolean, dist: number) => {
      const mode = settings.lyricEffect;
      const baseStyles: any = { opacity: 0.3, scale: 0.95, filter: 'none', x: 0 };
      
      if (isActive) {
          baseStyles.opacity = 1;
          baseStyles.scale = 1.05;
          baseStyles.color = 'white';
      } else {
          if (dist === 1) baseStyles.opacity = 0.7;
          else if (dist === 2) baseStyles.opacity = 0.4;
      }

      switch (mode) {
          case 'blur':
              if (!isActive) baseStyles.filter = `blur(${Math.min(dist * 2, 8)}px)`;
              if (isActive) baseStyles.scale = 1.1;
              break;
          case 'glow':
              if (isActive) {
                  baseStyles.textShadow = "0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)";
                  baseStyles.scale = 1.1;
              }
              break;
          case 'kinetic':
              if (isActive) {
                  baseStyles.x = 40; 
                  baseStyles.scale = 1.2;
              } else {
                  baseStyles.x = 0;
                  baseStyles.opacity = 0.2; 
              }
              break;
          case 'standard':
          default:
              baseStyles.scale = isActive ? 1.05 : 1;
              break;
      }
      return baseStyles;
  };

  if (!currentSong) return null;

  // Granular Hyper Settings
  const hyper = settings.hyperSettings || { enableChromatic: true, enableNoise: true, enableGlow: true };

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
      className={`fixed inset-0 z-[60] flex flex-col bg-gray-950 text-white overflow-hidden shadow-2xl ${settings.enableHyperMode ? 'hyper-mode' : ''}`}
    >
        {/* CSS for Hyper Mode - Dynamic based on Granular settings */}
        {settings.enableHyperMode && (
             <style>{`
                ${hyper.enableNoise ? `
                .hyper-mode::before {
                    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
                    mix-blend-mode: overlay;
                }` : ''}
                
                ${hyper.enableChromatic ? `
                .hyper-text { text-shadow: 2px 0 red, -2px 0 cyan; letter-spacing: 0.05em; }
                ` : ''}

                ${hyper.enableGlow ? `
                .hyper-glow { box-shadow: 0 0 50px rgba(0, 255, 255, 0.2); }
                ` : ''}
             `}</style>
        )}

        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
            {currentSong.coverUrl && (
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-30 scale-125 blur-[100px]"
                    style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
                />
            )}
            <div className={`absolute inset-0 bg-black/40 ${settings.enableHyperMode ? 'bg-black/70' : ''}`} />
            {settings.enableParticles && <Particles />}
        </div>

        {/* Top Gradient for Status Bar Immersion */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-40 pointer-events-none" />

        {/* Drag Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full z-50 cursor-grab active:cursor-grabbing hover:bg-white/40 transition"/>

        {/* Floating Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-6 pt-8 flex items-center justify-between pointer-events-none">
            <button onClick={() => setPlayerOpen(false)} className="pointer-events-auto p-3 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-xl transition group border border-white/5">
                <ArrowDown size={20} className="group-hover:translate-y-1 transition-transform text-gray-200"/>
            </button>
            
            {/* Visualizer Toggles */}
            <div className="pointer-events-auto flex bg-black/20 backdrop-blur-2xl rounded-full p-1 border border-white/5 shadow-2xl overflow-x-auto max-w-[200px] md:max-w-none hide-scrollbar">
                <button onClick={() => setVisualMode('square')} className={`p-2 rounded-full transition ${visualMode === 'square' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Square size={16} /></button>
                <button onClick={() => setVisualMode('vinyl')} className={`p-2 rounded-full transition ${visualMode === 'vinyl' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Disc size={16} /></button>
                <button onClick={() => setVisualMode('cassette')} className={`p-2 rounded-full transition ${visualMode === 'cassette' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><CassetteTape size={16} /></button>
                <button onClick={() => setVisualMode('immersive')} className={`p-2 rounded-full transition ${visualMode === 'immersive' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Monitor size={16} /></button>
                <button onClick={() => setVisualMode('particles')} className={`p-2 rounded-full transition ${visualMode === 'particles' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><Wind size={16} /></button>
                {settings.enableHyperMode && <button onClick={() => setVisualMode('hyper')} className={`p-2 rounded-full transition ${visualMode === 'hyper' ? 'bg-white/10 text-cyan-300 shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-cyan-400'}`}><Zap size={16} /></button>}
            </div>

            <div className="pointer-events-auto flex gap-3">
                 <button onClick={handleAnalyzeVibe} disabled={isLoadingAI} className="p-3 bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-300 rounded-full backdrop-blur-xl transition border border-indigo-500/20"><Sparkles size={18} /></button>
                <button onClick={handleFetchLyrics} disabled={isLoadingAI} className="p-3 bg-green-500/10 hover:bg-green-500/30 text-green-300 rounded-full backdrop-blur-xl transition border border-green-500/20"><Mic2 size={18} /></button>
            </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden mt-0">
            
            {/* Left/Top Area: Album Art & Controls */}
            <div className={`w-full ${visualMode === 'immersive' ? 'hidden' : 'md:w-[45%]'} flex flex-col items-center justify-center p-8 transition-all duration-500 relative z-20`}>
                <div className="relative mt-12 md:mt-0">
                    {visualMode === 'vinyl' ? (
                        <motion.div 
                           animate={{ rotate: isPlaying ? 360 : 0 }}
                           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                           className="w-64 h-64 md:w-[28rem] md:h-[28rem] rounded-full shadow-2xl overflow-hidden border-8 border-gray-900/50 relative bg-black"
                        >
                            {currentSong.coverUrl && <img src={currentSong.coverUrl} className="w-full h-full object-cover opacity-90" alt="Cover" />}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full pointer-events-none"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-full pointer-events-none rotate-45"></div>
                        </motion.div>
                    ) : visualMode === 'cassette' ? (
                        <div className="w-72 h-48 md:w-[32rem] md:h-[20rem] bg-gray-900 rounded-xl shadow-2xl border-4 border-gray-700 relative flex items-center justify-center overflow-hidden">
                             {/* Tape Texture */}
                             <div className="absolute inset-0 bg-neutral-800" style={{backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '4px 4px'}}></div>
                             {/* Label */}
                             <div className="absolute top-2 left-2 right-2 bottom-12 bg-[#eee] rounded-lg shadow-inner overflow-hidden flex flex-col items-center justify-start pt-2">
                                  <div className="w-full h-8 bg-red-500 absolute top-0 opacity-80"></div>
                                  <div className="relative z-10 text-black font-mono font-bold uppercase tracking-widest mt-1 opacity-70">Mixtape</div>
                                  <div className="mt-8 text-black font-bold text-center px-4 leading-tight opacity-90 font-serif">{currentSong.title}</div>
                                  <div className="text-black text-xs font-mono">{currentSong.artist}</div>
                             </div>
                             {/* Window */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-16 bg-transparent border-2 border-gray-400 rounded-full flex items-center justify-between px-4 z-20">
                                  {/* Spools */}
                                  <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-10 h-10 bg-white rounded-full border-4 border-gray-400 flex items-center justify-center relative">
                                       <div className="w-full h-1 bg-gray-400 absolute"></div><div className="h-full w-1 bg-gray-400 absolute"></div>
                                  </motion.div>
                                  <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-10 h-10 bg-white rounded-full border-4 border-gray-400 flex items-center justify-center relative">
                                       <div className="w-full h-1 bg-gray-400 absolute"></div><div className="h-full w-1 bg-gray-400 absolute"></div>
                                  </motion.div>
                             </div>
                             {/* Bottom Tape Head */}
                             <div className="absolute bottom-0 w-40 h-12 bg-gray-800 rounded-t-2xl border-t-2 border-gray-600"></div>
                        </div>
                    ) : (
                        <motion.div 
                            layoutId={`album-cover-${currentSong.id}`}
                            className={`w-64 h-64 md:w-[28rem] md:h-[28rem] rounded-2xl shadow-2xl overflow-hidden relative ${settings.enableHyperMode && hyper.enableGlow ? 'shadow-cyan-500/50 hyper-glow' : 'shadow-black/50'}`}
                            style={{ transform: "translateZ(0)" }}
                        >
                             {currentSong.coverUrl ? (
                                 <img src={currentSong.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                             ) : (
                                 <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center text-6xl">🎵</div>
                             )}
                        </motion.div>
                    )}
                </div>

                <div className="mt-12 text-center px-6 w-full max-w-lg">
                    <h2 className={`text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight truncate drop-shadow-lg ${settings.enableHyperMode && hyper.enableChromatic ? 'hyper-text' : ''}`}>{currentSong.title}</h2>
                    <p className="text-xl text-gray-300 font-medium truncate drop-shadow-md">{currentSong.artist}</p>
                    
                    {/* Floating Controls */}
                    <div className="mt-8 flex flex-col gap-6 p-4 rounded-3xl bg-black/20 backdrop-blur-md border border-white/5">
                         {/* Progress Bar */}
                         <div className="group relative w-full h-1 bg-white/20 rounded-full cursor-pointer">
                            <div 
                                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100 ease-out"
                                style={{ width: `${(currentTime / (currentSong.duration || 1)) * 100}%` }}
                            />
                            <div 
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `${(currentTime / (currentSong.duration || 1)) * 100}%` }}
                            />
                            <input 
                                type="range" 
                                min="0" 
                                max={currentSong.duration || 0} 
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-300 font-medium px-1 -mt-3">
                             <span>{formatTime(currentTime)}</span>
                             <span>{formatTime(currentSong.duration)}</span>
                        </div>
                        
                        {/* Playback Buttons */}
                        <div className="flex items-center justify-center gap-10">
                             <button onClick={prev} className="p-2 hover:text-white text-gray-300 transition hover:scale-110 active:scale-95"><SkipBack size={32} fill="currentColor"/></button>
                             <button onClick={() => isPlaying ? pause() : resume()} className="p-4 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10">
                                 {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1"/>}
                             </button>
                             <button onClick={() => next()} className="p-2 hover:text-white text-gray-300 transition hover:scale-110 active:scale-95"><SkipForward size={32} fill="currentColor"/></button>
                        </div>

                        {/* Advanced Controls (Settings Toggle) */}
                        {settings.showAdvancedPlayerControls && (
                            <div className="flex items-center justify-around border-t border-white/10 pt-4 mt-2">
                                <button onClick={() => toggleLike(currentSong.id)} className={`${currentSong.isLiked ? 'text-spotGreen' : 'text-gray-400 hover:text-white'}`}>
                                    <Heart size={20} fill={currentSong.isLiked ? "currentColor" : "none"} />
                                </button>
                                <button onClick={toggleShuffle} className={`${shuffle ? 'text-spotGreen' : 'text-gray-400 hover:text-white'}`}>
                                    <Shuffle size={18} />
                                </button>
                                <button onClick={toggleRepeat} className={`relative ${repeat !== 'off' ? 'text-spotGreen' : 'text-gray-400 hover:text-white'}`}>
                                    <Repeat size={18} />
                                    {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                                </button>
                                <button onClick={() => { setPlayerOpen(false); setQueueOpen(true); }} className="text-gray-400 hover:text-white">
                                    <ListMusic size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {aiMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-indigo-500/10 backdrop-blur-md rounded-xl border border-indigo-500/20 text-sm text-indigo-100 max-w-sm text-center shadow-lg"
                    >
                         <div className="flex items-center justify-center gap-2 mb-1 text-indigo-300 font-bold tracking-wide uppercase text-xs"><Sparkles size={12} /> AI Insight</div>
                        {aiMessage}
                    </motion.div>
                )}
            </div>

            {/* Right Area: Lyrics */}
            <div 
                ref={containerRef}
                className={`w-full ${visualMode === 'immersive' ? 'md:w-full px-8 md:px-32' : 'md:w-[55%] px-6 md:px-16'} h-full overflow-hidden relative mask-gradient-v`}
                style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}
                onWheel={(e) => e.stopPropagation()}
            >
                {lines.length > 0 ? (
                    <motion.div 
                        animate={controls} 
                        className="flex flex-col items-start gap-6 py-[50vh] w-full"
                    >
                        {lines.map((line, index) => {
                            const isActive = index === activeLineIndex;
                            const dist = Math.abs(index - activeLineIndex);
                            const styles = getLineStyles(isActive, dist);
                            
                            return (
                                <motion.div
                                    key={index}
                                    id={`lyric-line-${index}`}
                                    className={`w-full origin-left transition-all duration-700 ease-out cursor-pointer group`}
                                    initial={false}
                                    animate={styles}
                                    onClick={() => {
                                        const player = document.querySelector('audio');
                                        if (player) player.currentTime = line.time;
                                    }}
                                >
                                    <span 
                                        className={`
                                            font-bold leading-tight tracking-tight transition-all duration-500 block
                                            ${isActive ? 'text-white' : 'text-gray-300 hover:text-gray-100'} 
                                            ${settings.enableHyperMode && isActive && hyper.enableChromatic ? 'hyper-text' : ''}
                                        `}
                                        style={{ 
                                            fontSize: `${settings.lyricFontSize || 24}px`,
                                            fontFamily: settings.lyricFontFamily || 'Inter, sans-serif'
                                        }}
                                    >
                                        {line.text}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center z-30 relative">
                        <p className="text-3xl font-bold text-white mb-2">{t(settings.language, 'noLyrics')}</p>
                        <p className="text-gray-500 mb-8 max-w-xs">{t(settings.language, 'dragDrop')}</p>
                        
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                             <button onClick={() => lyricsInputRef.current?.click()} className="flex items-center justify-center gap-3 py-4 px-8 bg-white/5 hover:bg-white/10 rounded-full font-bold transition border border-white/5 backdrop-blur-md hover:scale-105 active:scale-95"><Upload size={20} /> {t(settings.language, 'uploadLrc')}</button>
                            <input type="file" ref={lyricsInputRef} onChange={(e) => { if(e.target.files) uploadLyrics(e.target.files[0]) }} accept=".lrc,text/plain" className="hidden" />
                            <button onClick={handleFetchLyrics} disabled={isLoadingAI} className="flex items-center justify-center gap-3 py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-full font-bold transition disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg shadow-green-900/30">
                                {isLoadingAI ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <Sparkles size={20} />} 
                                {t(settings.language, 'generateAi')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </motion.div>
  );
};

export default LyricsView;