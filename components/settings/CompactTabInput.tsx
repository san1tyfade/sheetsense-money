import React, { memo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useTabValidation } from '../../hooks/useTabValidation';

interface CompactTabInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSync: () => void;
  sheetId: string;
  isSyncing: boolean;
  token?: string;
}

export const CompactTabInput = memo(({ label, value, onChange, onSync, sheetId, isSyncing, token }: CompactTabInputProps) => {
  const status = useTabValidation(sheetId, value, token);

  return (
    <div className="flex flex-col gap-3 p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 hover:border-blue-400 transition-all group shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                status === 'checking' || isSyncing ? 'bg-blue-500 animate-pulse' :
                status === 'valid' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                status === 'invalid' ? 'bg-red-500 animate-bounce' : 'bg-slate-300 dark:bg-slate-700'
            }`} />
            <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.2em] truncate group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">
            {label}
            </label>
        </div>
      </div>
      <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700/50 p-1 pr-1.5 focus-within:border-blue-500/40 transition-all shadow-inner h-12">
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="flex-1 bg-transparent px-3 py-2 text-xs font-black uppercase tracking-widest outline-none text-slate-900 dark:text-slate-200 h-full min-w-0" 
        />
        <button 
          onClick={onSync} 
          disabled={isSyncing || !sheetId} 
          className="w-9 h-9 inline-flex items-center justify-center shrink-0 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 disabled:opacity-30 transition-all active:scale-90 shadow-sm"
          title="Resync Node"
        >
          {isSyncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} strokeWidth={3} className="block" />
          )}
        </button>
      </div>
    </div>
  );
});