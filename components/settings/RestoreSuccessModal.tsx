
import React from 'react';
import { CheckCircle2, RefreshCw, PartyPopper } from 'lucide-react';

interface RestoreSuccessModalProps {
  onReload: () => void;
}

export const RestoreSuccessModal: React.FC<RestoreSuccessModalProps> = ({ onReload }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 p-10 text-center space-y-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            <div className="relative flex justify-center">
                <div className="absolute -top-4 -right-4 animate-bounce">
                    <PartyPopper size={32} className="text-amber-500" />
                </div>
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center shadow-inner ring-8 ring-emerald-500/5">
                    <CheckCircle2 size={56} strokeWidth={2} />
                </div>
            </div>
            
            <div className="space-y-3">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Vault Restored</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Success! Your local database has been successfully synchronized with the backup payload.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Initialization Required</p>
                    <p className="text-[11px] text-slate-400 mt-1">A hard reload is needed to hydrate the application with the new state.</p>
                </div>
            </div>

            <button 
                onClick={onReload}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-5 rounded-2xl uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all group"
            >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> 
                Finalize & Reload
            </button>
        </div>
    </div>
  );
};
