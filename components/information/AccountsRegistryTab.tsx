import React from 'react';
import { BankAccount } from '../../types';
import { Landmark, Plus, Pencil, Trash2, Wallet, Terminal, ShieldCheck } from 'lucide-react';

interface AccountsRegistryTabProps {
  accounts: BankAccount[];
  onAdd: () => void;
  onEdit: (acc: BankAccount) => void;
  onDelete: (acc: BankAccount) => Promise<void>;
  isReadOnly: boolean;
}

export const AccountsRegistryTab: React.FC<AccountsRegistryTabProps> = ({ accounts, onAdd, onEdit, onDelete, isReadOnly }) => {
  return (
    <div className="space-y-10 animate-fade-in tabular-nums">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase tracking-tighter">
          <Landmark size={28} className="text-emerald-500" /> INSTITUTIONAL VAULT
        </h3>
        {!isReadOnly && (
          <button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
            <Plus size={18} className="inline mr-2" strokeWidth={3} /> Provision Node
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-10 rounded-[3rem] shadow-sm hover:border-emerald-500/30 transition-all group relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              {!isReadOnly && (
                <div className="flex gap-2">
                  <button onClick={() => onEdit(acc)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl active:scale-90 transition-all shadow-sm"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(acc)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-xl active:scale-90 transition-all shadow-sm"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>

            <div className="flex items-center gap-6 mb-10 relative z-10">
              <div className="p-5 bg-slate-100 dark:bg-slate-950 rounded-[1.75rem] shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Landmark size={32} className="text-slate-400 group-hover:text-emerald-500" />
              </div>
              <div>
                <h4 className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{acc.institution}</h4>
                <div className="flex items-center gap-2 mt-3">
                   <ShieldCheck size={10} className="text-emerald-500" />
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em]">{acc.type}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-5 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                <div className="flex items-center gap-3">
                  <Wallet size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{acc.paymentType}</span>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">• {acc.accountNumber}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 flex items-center gap-2">
                    <Terminal size={10} /> Identity Payload
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed italic line-clamp-2" title={acc.purpose}>
                    {acc.purpose || 'Null annotation string'}
                  </p>
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3.5rem] opacity-30 uppercase font-black text-[10px] tracking-[0.4em] italic">
            Zero Institutional Identity Nodes provisioned
          </div>
        )}
      </div>
    </div>
  );
};
