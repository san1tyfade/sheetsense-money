
import React, { useRef, useState, useEffect } from 'react';
import { History, Check, Calendar, ChevronDown, Lock } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';

export const GlobalChronometer: React.FC = () => {
  const { selectedYear, setSelectedYear, activeYear, discovery, isReadOnly } = useFinancialStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 active:scale-95 shadow-sm
          ${isReadOnly 
            ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/20' 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:border-blue-500/50'}`}
      >
        <div className={`p-1.5 rounded-lg ${isReadOnly ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-blue-500'}`}>
          {isReadOnly ? <History size={14} /> : <Calendar size={14} />}
        </div>
        <div className="text-left">
          <p className={`text-[8px] font-black uppercase tracking-widest ${isReadOnly ? 'text-white/70' : 'text-slate-400'}`}>
            {isReadOnly ? 'Historical' : 'Active'} Context
          </p>
          <p className="text-xs font-black font-mono leading-none mt-0.5">{selectedYear}</p>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isReadOnly ? 'text-white/50' : 'text-slate-300'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-2xl z-[100] p-3 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-3 pt-2 flex items-center gap-2">
            <History size={12}/> Temporal Directory
          </p>
          <div className="space-y-1">
            {discovery.remoteArchives.map((year: number) => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  selectedYear === year 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {year}
                  {year === activeYear && (
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${selectedYear === year ? 'bg-white text-blue-600' : 'bg-emerald-500 text-white'}`}>Active</span>
                  )}
                </div>
                {selectedYear === year && <Check size={16} />}
              </button>
            ))}
          </div>
          {isReadOnly && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 px-2 pb-1">
              <button 
                onClick={() => { setSelectedYear(activeYear); setIsOpen(false); }}
                className="w-full py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
              >
                Reset to Current Year
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
