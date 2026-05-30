import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const FeedbackModal: React.FC = () => {
    const { feedback, closeFeedback } = usePlayer();

    if (!feedback.isVisible) return <AnimatePresence />;

    const isConfirm = feedback.type === 'confirm';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-cardBg/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative glass-panel"
                >
                    {/* Header Icon */}
                    <div className="flex justify-center pt-8 pb-4">
                        <div className={`p-4 rounded-2xl ${isConfirm ? 'bg-blue-500/10 text-blue-400' : 'bg-spotGreen/10 text-spotGreen'}`}>
                            {isConfirm ? <HelpCircle size={32} /> : <CheckCircle size={32} />}
                        </div>
                    </div>

                    <div className="px-8 pb-8 text-center">
                        <h3 className="text-xl font-bold text-textPrimary mb-2">{feedback.title}</h3>
                        <p className="text-textSecondary text-sm leading-relaxed">
                            {feedback.message}
                        </p>
                    </div>

                    <div className="flex border-t border-white/5 bg-white/5">
                        {isConfirm && (
                            <button
                                onClick={() => {
                                    if (feedback.onCancel) feedback.onCancel();
                                    closeFeedback();
                                }}
                                className="flex-1 py-4 text-sm font-bold text-textSecondary hover:bg-white/5 transition border-r border-white/5"
                            >
                                取消
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (feedback.onConfirm) feedback.onConfirm();
                                closeFeedback();
                            }}
                            className={`flex-1 py-4 text-sm font-bold transition hover:bg-white/5 ${isConfirm ? 'text-blue-400' : 'text-spotGreen'}`}
                        >
                            {isConfirm ? '确定' : '知道了'}
                        </button>
                    </div>

                    <button
                        onClick={closeFeedback}
                        className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary p-1"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FeedbackModal;
