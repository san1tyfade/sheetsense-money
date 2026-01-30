
import React from 'react';
import { UploadCloud } from 'lucide-react';

export const DirtyGlyph: React.FC<{ active?: boolean }> = ({ active }) => {
  if (!active) return null;
  
  return (
    <div className="absolute top-2 left-2 z-30 group/dirty animate-in zoom-in duration-500">
      <div className="relative">
        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b] animate-pulse" />
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping opacity-30" />
        
        {/* Tooltip */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded border border-slate-700 opacity-0 group-hover/dirty:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Uplink Pending
        </div>
      </div>
    </div>
  );
};
