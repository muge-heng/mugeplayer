import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DownloadCloud, Loader2, Zap, Cloud } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { t } from '../utils/i18n';

const NeteaseImportModal: React.FC = () => {
    const { isNeteaseImportOpen, setNeteaseImportOpen, importNeteasePlaylist, settings } = usePlayer();
    const [playlistId, setPlaylistId] = useState('8792942606');
    const [loading, setLoading] = useState(false);
    const [importType, setImportType] = useState<'standard' | 'vip'>('standard');

    if (!isNeteaseImportOpen) return null;

    const handleImport = async (type: 'standard' | 'vip' = 'standard') => {
        if (!playlistId.trim()) return;

        setLoading(true);
        setImportType(type);
        try {
            await importNeteasePlaylist(playlistId.trim(), type === 'vip' ? 'meting' : undefined);
            setNeteaseImportOpen(false);
        } catch (e) {
            // Already handled in context
        } finally {
            setLoading(false);
        }
    };

    const isMeting = settings.neteaseSource === 'meting';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-cardBg/80 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10 glass-panel"
                >
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3 text-textPrimary">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <DownloadCloud className="text-blue-400" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">{t(settings.language, 'neteaseImport')}</h2>
                        </div>
                        <button
                            onClick={() => setNeteaseImportOpen(false)}
                            className="bg-white/5 p-2 rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/10 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-3 ml-1">{settings.language === 'zh' ? '歌单 ID' : 'Playlist ID'}</label>
                            <input
                                autoFocus
                                type="text"
                                value={playlistId}
                                onChange={e => setPlaylistId(e.target.value)}
                                placeholder="例如: 8792942606"
                                className="w-full bg-[#1a1a1b] text-textPrimary py-4 px-6 rounded-2xl border border-borderColor outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono text-center text-2xl tracking-widest"
                            />
                        </div>

                        <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 text-[11px] text-textSecondary leading-relaxed flex gap-3">
                            <div className="mt-0.5"><Zap size={14} className="text-amber-400" /></div>
                            <p>{settings.language === 'zh' ? '提示：歌曲链接均通过所选接口动态生成。VIP 接口支持解析并同步受限曲目，国内速度飞快。' : 'Tip: Songs are resolved via the selected interface. VIP interface supports restricted tracks and offers fast transfer speeds.'}</p>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            {isMeting && (
                                <button
                                    onClick={() => handleImport('vip')}
                                    disabled={loading || !playlistId.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading && importType === 'vip' ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            {t(settings.language, 'processing')}
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={20} />
                                            {t(settings.language, 'vipImport')}
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={() => handleImport('standard')}
                                disabled={loading || !playlistId.trim()}
                                className={`w-full py-4 ${isMeting ? 'bg-white/5 border border-white/10 text-textPrimary' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'} font-bold rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                            >
                                {loading && importType === 'standard' ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        {t(settings.language, 'processing')}
                                    </>
                                ) : (
                                    <>
                                        {isMeting ? <Cloud size={20} /> : <DownloadCloud size={20} />}
                                        {isMeting ? (settings.language === 'zh' ? '标准导入' : 'Standard Import') : t(settings.language, 'confirm')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NeteaseImportModal;
