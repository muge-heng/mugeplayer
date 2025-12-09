import React from 'react';
import { Home, Search, Library, Settings } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { NavView } from '../types';

const MobileNav: React.FC = () => {
  const { navView, setNavView, isPlayerOpen } = usePlayer();

  const NavItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: NavView }) => (
    <button
      onClick={() => setNavView(view)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${
        navView === view ? 'text-spotGreen' : 'text-textSecondary hover:text-textPrimary'
      }`}
    >
      <Icon size={22} strokeWidth={navView === view ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-playerBg border-t border-borderColor flex items-center justify-around z-[45] md:hidden pb-safe glass-panel backdrop-blur-xl">
      <NavItem icon={Home} label="Home" view="home" />
      <NavItem icon={Search} label="Search" view="search" />
      <NavItem icon={Library} label="Library" view="library" />
      <NavItem icon={Settings} label="Settings" view="settings" />
    </div>
  );
};

export default MobileNav;