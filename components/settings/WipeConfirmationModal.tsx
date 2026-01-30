import React, { useState } from 'react';
import { ShieldAlert, X, Loader2, Trash2, AlertTriangle, Terminal, Save } from 'lucide-react';

interface WipeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const WipeConfirmationModal: React.FC<WipeConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (confirmationText.toUpperCase() !== 'PURGE') return;
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <ShieldAlert size={20} />
            </div>
            Security Override
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl space-y-4">
              <div className="flex items-start gap-4 text-left">
                <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                  This protocol will permanently delete all local IndexedDB archives, financial chapters, and neural memory. 
                  <span className="block mt-2 font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Action is irreversible.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Verify Authorization (Type "PURGE")</label>
              <input 
                type="text" 
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="PURGE"
                disabled={isProcessing}
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-center text-lg font-black font-mono tracking-[0.2em] outline-none focus:border-rose-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </div>

            <button 
                onClick={handleExecute}
                disabled={isProcessing || confirmationText.toUpperCase() !== 'PURGE'}
                className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-rose-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none"
            >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Execute Atomic Purge
            </button>
            
            <button 
                onClick={onClose}
                disabled={isProcessing}
                className="w-full py-4 bg-transparent text-slate-400 dark:text-slate-500 font-black uppercase text-[9px] tracking-[0.3em] hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
                Abort Protocol
            </button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 flex justify-center border-t border-slate-100 dark:border-slate-800">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
             <Terminal size={10} /> system_lock_override
           </span>
        </div>
      </div>
    </div>
  );
};
