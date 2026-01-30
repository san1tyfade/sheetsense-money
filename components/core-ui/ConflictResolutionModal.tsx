
import React from 'react';
import { SyncConflict, ViewState } from '../../types';
import { AlertTriangle, Database, Cloud, ArrowRight, Check, Terminal, X, Zap } from 'lucide-react';

interface ConflictResolutionModalProps {
  conflict: SyncConflict;
  onResolve: (action: 'OVERWRITE' | 'MERGE') => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ conflict, onResolve, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500/5 flex justify-between items-center">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                    <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Integrity Breach</h3>
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-1">Multi-Node Out-of-Sync Detected</p>
                </div>
            </div>
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
        </div>

        <div className="p-10 space-y-10">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                Cloud repository for <span className="text-blue-500 font-black">"{conflict.tab.toUpperCase()}"</span> has been modified by another device. You have <span className="text-amber-500 font-black">{conflict.dirtyCount} local changes</span> that conflict with the remote version.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => onResolve('MERGE')}
                  className="p-8 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-emerald-500/50 transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl w-fit mb-6 shadow-inner"><Database size={20} /></div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Safe Merge</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase leading-relaxed">Pull remote data first, then re-apply your local delta.</p>
                </button>

                <button 
                  onClick={() => onResolve('OVERWRITE')}
                  className="p-8 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-blue-500/50 transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl w-fit mb-6 shadow-inner"><Cloud size={20} /></div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Force Uplink</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase leading-relaxed">Broadcast local state as the source of truth. Remote changes will be lost.</p>
                </button>
            </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                <Terminal size={10} /> resolution_protocol_active
            </span>
        </div>
      </div>
    </div>
  );
};
