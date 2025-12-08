import React, { useRef } from 'react';
import { Home, Search, Library, PlusSquare, Heart, Upload } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const Sidebar: React.FC = () => {
  const { addToQueue } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addToQueue(e.target.files);
    }
  };

  return (
    <div className="w-64 bg-black h-full flex flex-col p-6 border-r border-white/5 flex-shrink-0 hidden md:flex">
      <div className="mb-8 flex items-center gap-2">
         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-[10px] border-l-black border-y-[6px] border-y-transparent ml-1"></div>
         </div>
         <h1 className="text-2xl font-bold tracking-tight">Muse</h1>
      </div>

      <nav className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-4 text-gray-300 hover:text-white font-medium transition cursor-pointer">
           <Home size={24} />
           <span>Home</span>
        </div>
        <div className="flex items-center gap-4 text-gray-300 hover:text-white font-medium transition cursor-pointer">
           <Search size={24} />
           <span>Search</span>
        </div>
        <div className="flex items-center gap-4 text-gray-300 hover:text-white font-medium transition cursor-pointer">
           <Library size={24} />
           <span>Your Library</span>
        </div>
      </nav>

      <div className="space-y-4">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 text-gray-300 hover:text-white transition font-medium w-full text-left"
        >
           <div className="bg-gray-300 p-1 rounded-sm text-black">
               <PlusSquare size={20} />
           </div>
           <span>Import Music</span>
        </button>
        <div className="flex items-center gap-4 text-gray-300 hover:text-white transition font-medium cursor-pointer">
           <div className="bg-gradient-to-br from-indigo-700 to-blue-300 p-1 rounded-sm text-white opacity-70">
               <Heart size={20} fill="white" />
           </div>
           <span>Liked Songs</span>
        </div>
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
         <p className="text-xs text-gray-500 mb-2">Drag & Drop files supported</p>
         <button 
           onClick={() => fileInputRef.current?.click()}
           className="text-xs border border-gray-600 rounded-full px-3 py-1 text-gray-400 hover:border-white hover:text-white transition"
         >
           Browse Local Files
         </button>
      </div>

      <input 
        type="file" 
        multiple 
        accept="audio/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Sidebar;
