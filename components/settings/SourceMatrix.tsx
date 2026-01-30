
import React from 'react';
import { SheetConfig, SyncStatus } from '../../types';
import { Layers, RefreshCw, Loader2, CheckCircle2, AlertCircle, DollarSign, History, Globe, Terminal, BookOpen } from 'lucide-react';
import { CompactTabInput } from './CompactTabInput';

interface SourceMatrixProps {
  config: SheetConfig;
  onConfigChange: (c: SheetConfig) => void;
  sync: (tabs?: any) => Promise<void>;
  isSyncing: boolean;
  syncingTabs: Set<string>;
  syncStatus: SyncStatus;
  token?: string;
}

export const SourceMatrix: React.FC<SourceMatrixProps> = ({ 
  config, onConfigChange, sync, isSyncing, syncingTabs, syncStatus, token 
}) => {
  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[3.5rem] p-8 sm:p-12 shadow-sm space-y-12 sm:space-y-16">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8 border-b border-slate-100 dark:border-slate-700/50 pb-8 sm:pb-12">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="p-3.5 sm:p-4 lg:p-5 bg-indigo-600 text-white rounded-2xl lg:rounded-[2rem] shadow-xl shadow-indigo-600/20 shrink-0">
                <Globe size={24} className="sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight truncate">Connectivity Matrix</h3>
              <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1 sm:mt-2 lg:mt-3">Logical Infrastructure mapping</p>
            </div>
          </div>
          <button 
            onClick={() => sync()} 
            disabled={isSyncing} 
            className="w-full sm:w-auto bg-slate-950 dark:bg-slate-100 dark:text-slate-900 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] inline-flex items-center justify-center gap-3 sm:gap-4 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSyncing ? (
                <Loader2 size={16} className="animate-spin" />
            ) : (
                <RefreshCw size={16} strokeWidth={3} className="block" />
            )} 
            <span>Synchronize All Nodes</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-16">
          {[
            { t: 'Investment Core', i: Layers, k: ['assets', 'investments', 'trades'] },
            { t: 'Flow Ledger', i: DollarSign, k: ['income', 'expenses', 'subscriptions', 'debt'] },
            { t: 'Chronos Logs', i: History, k: ['accounts', 'logData', 'portfolioLog'] },
            { t: 'Traceability', i: BookOpen, k: ['journal'] }
          ].map(cat => (
            <div key={cat.t} className="space-y-8 sm:space-y-10">
              <div className="flex items-center gap-4 px-2 h-8">
                  <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-indigo-500 shadow-inner inline-flex items-center justify-center"><cat.i size={16} /></div>
                  <h4 className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] pt-0.5">{cat.t}</h4>
              </div>
              <div className="space-y-4 sm:space-y-6">
                {cat.k.map(key => (
                  <CompactTabInput 
                    key={key} 
                    label={key} 
                    value={(config.tabNames as any)[key]} 
                    onChange={(v: string) => onConfigChange({ ...config, tabNames: { ...config.tabNames, [key]: v } })} 
                    onSync={() => sync([key as any])} 
                    sheetId={config.sheetId} 
                    isSyncing={syncingTabs.has(key)} 
                    token={token}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {syncStatus && (
          <div className={`p-6 sm:p-8 rounded-[2.5rem] border-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-2 ${syncStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : syncStatus.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-500/20 text-amber-600' : 'bg-red-50 dark:bg-red-500/5 border-red-500/20 text-red-600'}`}>
            <div className={`p-2.5 sm:p-3 rounded-2xl bg-current bg-opacity-10 shadow-inner inline-flex items-center justify-center`}>
                {syncStatus.type === 'success' ? <CheckCircle2 size={20} className="sm:w-6 sm:h-6" /> : <AlertCircle size={20} className="sm:w-6 sm:h-6" />} 
            </div>
            <div className="flex-1 flex flex-col gap-1">
                <span className="text-[7px] sm:text-[8px] font-black opacity-60 flex items-center gap-2"><Terminal size={10} /> Inbound Signal Processed</span>
                {syncStatus.msg}
            </div>
            <div className="shrink-0 hidden md:block">
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
            </div>
          </div>
        )}
      </div>
  );
};
