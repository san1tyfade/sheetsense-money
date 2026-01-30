
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface YearContextBadgeProps {
  year: number | string;
  onClick?: () => void;
  showChevron?: boolean;
}

export const YearContextBadge: React.FC<YearContextBadgeProps> = ({ year, onClick, showChevron }) => {
  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={`w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group transition-all duration-300 ${onClick ? 'active:scale-95 cursor-pointer' : 'cursor-default'}`}
    >
      <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors"></div>
      <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter relative z-10">{year}</span>
      <span className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1 flex items-center gap-1">
        Chapter {showChevron && <ChevronDown size={10} className="transition-transform group-hover:translate-y-0.5" />}
      </span>
    </button>
  );
};
