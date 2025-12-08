import React, { useRef } from 'react';
import { Home, Search, Library, PlusSquare, Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { NavView } from '../types';

const Sidebar: React.FC = () => {
  const { addToQueue, navView, setNavView } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addToQueue(e.target.files);
    }
  };

  const NavItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: NavView }) => (
      <div 
        onClick={() => setNavView(view)}
        className={`flex items-center gap-4 font-medium transition cursor-pointer p-2 rounded-md ${navView === view ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
      >
         <Icon size={24} />
         <span>{label}</span>
      </div>
  );

  return (
    <div className="w-64 bg-black h-full flex flex-col p-6 border-r border-white/5 flex-shrink-0 hidden md:flex">
      <div className="mb-8 flex items-center gap-2">
         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-[10px] border-l-black border-y-[6px] border-y-transparent ml-1"></div>
         </div>
         <h1 className="text-2xl font-bold tracking-tight">Muse</h1>
      </div>

      <nav className="flex flex-col gap-2 mb-8">
        <NavItem icon={Home} label="Home" view="home" />
        <NavItem icon={Search} label="Search" view="search" />
        <NavItem icon={Library} label="Your Library" view="library" />
      </nav>

      <div className="space-y-4">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 text-gray-400 hover:text-white transition font-medium w-full text-left p-2"
        >
           <div className="bg-gray-300 p-1 rounded-sm text-black">
               <PlusSquare size={20} />
           </div>
           <span>Import Music</span>
        </button>
        <div className="flex items-center gap-4 text-gray-400 hover:text-white transition font-medium cursor-pointer p-2">
           <div className="bg-gradient-to-br from-indigo-700 to-blue-300 p-1 rounded-sm text-white opacity-70">
               <Heart size={20} fill="white" />
           </div>
           <span>Liked Songs</span>
        </div>
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
         <p className="text-xs text-gray-500 mb-2">Drag & Drop audio + .lrc</p>
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
        accept="audio/*,.lrc,.flac" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Sidebar;
