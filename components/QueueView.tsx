import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { X, Play, Trash2 } from 'lucide-react';
import { t } from '../utils/i18n';

const QueueView: React.FC = () => {
    const { isQueueOpen, setQueueOpen, queue, currentSong, play, removeFromQueue, settings } = usePlayer();

    return (
        <AnimatePresence>
            {isQueueOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-[calc(100vh-6rem)] md:h-[calc(100vh-6rem)] w-full md:w-96 bg-cardBg border-l border-borderColor shadow-2xl z-40 flex flex-col pt-4 pb-20 md:pb-0 glass-panel"
                >
                    <div className="flex items-center justify-between px-6 pb-4 border-b border-borderColor">
                        <h2 className="text-xl font-bold text-textPrimary">{t(settings.language, 'playQueue')}</h2>
                        <button onClick={() => setQueueOpen(false)} className="text-textSecondary hover:text-textPrimary">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-2">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-2 px-2">{t(settings.language, 'nextUp')}</h3>
                            {queue.length === 0 ? (
                                <div className="text-center text-textSecondary py-8">Queue is empty</div>
                            ) : (
                                <div className="space-y-1">
                                    {queue.map((song, index) => {
                                        const isCurrent = currentSong?.id === song.id;
                                        return (
                                            <div 
                                                key={`${song.id}-${index}`}
                                                className={`group flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition ${isCurrent ? 'bg-white/10' : ''}`}
                                            >
                                                <div 
                                                    className="w-10 h-10 rounded overflow-hidden bg-cardBg flex-shrink-0 relative cursor-pointer"
                                                    onClick={() => play(song)}
                                                >
                                                    {song.coverUrl && <img src={song.coverUrl} className="w-full h-full object-cover" />}
                                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {isCurrent ? (
                                                            <div className="w-3 h-3 bg-spotGreen rounded-full animate-pulse" />
                                                        ) : (
                                                            <Play size={16} className="text-white" fill="white" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-medium truncate ${isCurrent ? 'text-spotGreen' : 'text-textPrimary'}`}>
                                                        {song.title}
                                                    </div>
                                                    <div className="text-xs text-textSecondary truncate">{song.artist}</div>
                                                </div>

                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                                                    className="opacity-0 group-hover:opacity-100 text-textSecondary hover:text-red-400 p-2"
                                                    title={t(settings.language, 'removeFromQueue')}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QueueView;