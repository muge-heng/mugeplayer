import React from 'react';
import { usePlayer } from '../context/PlayerContext';

const AuroraBackground: React.FC = () => {
    const { settings } = usePlayer();
    const theme = settings.theme;

    // Only render for aurora themes
    if (theme !== 'aurora-dark' && theme !== 'aurora-light') return null;

    const isDark = theme === 'aurora-dark';

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 opacity-100">
            {/* 
               Animation Definitions mapped from index.html keyframes 
               Inline styles used here for specific blob positioning and colors derived from the inspiration
            */}
            
            {/* Blob 1 */}
            <div 
                className="absolute rounded-full mix-blend-multiply filter blur-[80px] md:blur-[100px] opacity-60 animate-[aurora-move1_25s_infinite_alternate]"
                style={{
                    backgroundColor: isDark ? '#818cf8' : '#a5f3fc', // Indigo vs Cyan
                    width: '50vmax',
                    height: '50vmax',
                    top: '-10%',
                    left: '-10%',
                }}
            />

            {/* Blob 2 */}
            <div 
                className="absolute rounded-full mix-blend-multiply filter blur-[80px] md:blur-[100px] opacity-60 animate-[aurora-move2_30s_infinite_alternate]"
                style={{
                    backgroundColor: isDark ? '#c084fc' : '#fbcfe8', // Purple vs Pink
                    width: '40vmax',
                    height: '40vmax',
                    bottom: '-10%',
                    right: '-10%',
                    animationDelay: '-5s'
                }}
            />

            {/* Blob 3 */}
            <div 
                className="absolute rounded-full mix-blend-multiply filter blur-[80px] md:blur-[100px] opacity-60 animate-[aurora-move3_20s_infinite_alternate]"
                style={{
                    backgroundColor: isDark ? '#fb7185' : '#d8b4fe', // Rose vs Purple
                    width: '35vmax',
                    height: '35vmax',
                    top: '40%',
                    left: '40%',
                    animationDelay: '-10s'
                }}
            />
        </div>
    );
};

export default AuroraBackground;
