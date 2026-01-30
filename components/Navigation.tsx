import React from 'react';
import { ViewState } from '../types';
import { 
  RefreshCw, Clock, Lock, Eye, EyeOff, Moon, Sun, Search, UploadCloud, Activity, Layers, Settings 
} from 'lucide-react';
import { useFinancialStore } from '../context/FinancialContext';
import { VIEW_METADATA, DIRECTORATES } from '../config/ViewMetadata';
import { haptics } from '../services/infrastructure/HapticService';

export const Navigation: React.FC = () => {
  const store = useFinancialStore();
  const { 
    currentView, setView, sync, commitDelta, isDirty, dirtyCount, 
    isSyncing, lastUpdated, isDarkMode, setIsDarkMode, authSession, 
    isGhostMode, setIsGhostMode, setIsSearchOpen 
  } = store;
  
  const isLoggedIn = !!authSession;
  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const toggleGhostMode = () => setIsGhostMode(prev => !prev);
  
  const handleSyncAction = () => {
      haptics.pulse('light');
      if (isDirty) commitDelta();
      else sync();
  };

  const viewArray = Object.values(VIEW_METADATA);

  return (
    <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 md:w-72 md:h-screen md:border-r md:border-b-0 flex-shrink-0 flex md:flex-col fixed md:sticky md:top-0 z-50 w-full bottom-0 md:bottom-auto transition-colors duration-500 tabular-nums">
      <div className="flex-1 flex flex-row md:flex-col overflow-hidden">
        <div className="p-8 hidden md:block border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center justify-center mb-8">
                <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none text-center">
                  Sheetsense
                </h1>
            </div>
            
            <div className="space-y-4">
                <button 
                    onClick={() => { haptics.click('soft'); setIsSearchOpen(true); }}
                    className="w-full flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-inner group"
                >
                    <Search size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Discovery Matrix</span>
                    <span className="ml-auto text-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded opacity-40">/</span>
                </button>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleGhostMode}
                        className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${isGhostMode ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500/30'}`}
                        title="Toggle Ghost Mode (Blur)"
                    >
                        {isGhostMode ? <EyeOff size={16} /> : <Eye size={16} />}
                        <span className="text-[8px] font-black uppercase tracking-widest">Privacy</span>
                    </button>
                    <button 
                        onClick={toggleTheme}
                        className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-500/30 transition-all shadow-sm"
                        title="Cycle Theme Matrix"
                    >
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        <span className="text-[8px] font-black uppercase tracking-widest">Theme</span>
                    </button>
                </div>
            </div>
        </div>

        <div className="flex md:flex-col w-full justify-between md:justify-start px-2 md:px-6 py-2 md:py-8 overflow-x-auto md:overflow-y-auto no-scrollbar md:space-y-8">
            {DIRECTORATES.map((dir) => (
              <div key={dir.id} className="flex flex-row md:flex-col items-center md:items-start">
                <div className="hidden md:flex items-center gap-3 px-3 mb-3 text-slate-400">
                  <dir.icon size={12} className="opacity-50" />
                  <span className="text-[9px] font-black uppercase tracking-[0.4em]">{dir.id}</span>
                </div>
                <div className="flex flex-row md:flex-col gap-1">
                  {viewArray.filter(v => v.directorate === dir.id).map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    const isLocked = item.protected && !isLoggedIn;

                    return (
                      <button
                        key={item.id}
                        id={`nav-${item.id.toLowerCase()}`}
                        onClick={() => !isLocked && setView(item.id)}
                        className={`flex flex-col md:flex-row items-center md:space-x-4 p-3 md:px-4 md:py-3 rounded-xl transition-all duration-300 flex-shrink-0 relative group
                          ${isActive 
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-lg' 
                            : isLocked
                            ? 'opacity-30 cursor-not-allowed grayscale'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                      >
                        <div className="relative">
                          <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                          {isLocked && <Lock size={8} className="absolute -top-1 -right-1" />}
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1 md:mt-0">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="md:hidden w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-4 opacity-50" />
              </div>
            ))}
        </div>
      </div>

      <div className="hidden md:block p-6 border-t border-slate-100 dark:border-slate-900 space-y-4">
        <button 
            id="desktop-sync-btn"
            onClick={handleSyncAction}
            disabled={isSyncing}
            className={`w-full flex items-center justify-center space-x-3 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border-2
            ${isSyncing ? 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400 cursor-wait' : 
              isDirty ? 'bg-amber-500 border-amber-400 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/20' :
              'bg-white dark:bg-slate-950 border-slate-900 dark:border-white text-slate-950 dark:text-white hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 active:scale-95 shadow-xl'}`}
        >
            {isDirty && !isSyncing ? <UploadCloud size={14} strokeWidth={3} className="animate-bounce" /> : <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} strokeWidth={3} />}
            <span>{isSyncing ? "Transmitting" : isDirty ? `Commit Delta [${dirtyCount}]` : "Sync Architecture"}</span>
        </button>
        {lastUpdated && (
            <div className="flex flex-col items-center gap-1.5 opacity-40">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                    <Clock size={10} /> Last Uplink
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        )}
      </div>
    </nav>
  );
};