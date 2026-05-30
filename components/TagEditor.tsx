import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Plus, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { t } from '../utils/i18n';

interface TagEditorProps {
    songId: string;
    onClose: () => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ songId, onClose }) => {
    const { library, updateSongTags, tagSongsWithAi, settings } = usePlayer();
    const song = library.find(s => s.id === songId);
    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (song) {
            setTags(song.tags || []);
        }
    }, [song]);

    if (!song) return null;

    const handleAddTag = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
            setInputValue('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleSave = () => {
        updateSongTags(songId, tags);
        onClose();
    };

    const handleAiReTag = async () => {
        await tagSongsWithAi([songId]);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl glass-panel"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <Tag className="text-cyan-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{t(settings.language, 'editTags')}</h2>
                            <p className="text-xs text-textSecondary truncate max-w-[200px]">{song.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-textSecondary transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Tag Cloud */}
                    <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-black/20 rounded-xl border border-white/5">
                        {tags.length > 0 ? (
                            tags.map(tag => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-full border border-cyan-500/20 group hover:bg-cyan-500/20 transition-all cursor-default"
                                >
                                    #{tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-red-400 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-textSecondary text-xs italic">
                                {t(settings.language, 'noTags')}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t(settings.language, 'tagPlaceholder')}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
                        />
                        <button
                            onClick={handleAddTag}
                            className="p-2.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-xl border border-cyan-500/20 transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={handleAiReTag}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all active:scale-95"
                        >
                            <Sparkles size={16} className="text-cyan-400" />
                            {t(settings.language, 'aiPerception')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                        >
                            {t(settings.language, 'saveTags')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TagEditor;
