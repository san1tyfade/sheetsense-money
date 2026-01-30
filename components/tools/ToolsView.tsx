import React from 'react';
import { MortgageModule } from '../MortgageModule';
import { Terminal } from 'lucide-react';

export const ToolsView: React.FC = () => {
  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <header className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
                  Intelligence <span className="text-blue-600 dark:text-blue-400">Tools</span>
                </h2>
                
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group">
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors"></div>
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter relative z-10">01</span>
                        <span className="text-[8px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1">Utility</span>
                    </div>
                </div>
            </div>

            <nav className="flex items-center gap-3 text-base font-black tracking-tight">
                <button 
                  className="transition-all duration-300 text-slate-900 dark:text-white scale-105 underline decoration-blue-500 decoration-4 underline-offset-[12px] uppercase"
                >
                  Mortgage
                </button>
            </nav>
        </div>
      </header>

      <div className="w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MortgageModule />
          </div>
      </div>

      <footer className="pt-10 flex justify-center pb-20 opacity-40">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
             <Terminal size={14} className="text-blue-500" /> Logical Tool Instance Build v2.7.0
          </div>
      </footer>
    </div>
  );
};