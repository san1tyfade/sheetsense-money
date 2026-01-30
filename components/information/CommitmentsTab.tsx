
import React, { useMemo } from 'react';
import { Subscription, DebtEntry } from '../../types';
import { CreditCard, Flame, TrendingDown, Plus, Pencil, Trash2, Terminal, Activity } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { FinancialEngine } from '../../services/math/FinancialEngine';
import { GlassCard } from '../core-ui/GlassCard';
import { InstitutionalTable, InstitutionalTableHead, InstitutionalTableBody } from '../core-ui/InstitutionalTable';

interface CommitmentsTabProps {
  subscriptions: Subscription[];
  debtEntries: DebtEntry[];
  onAdd: () => void;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => Promise<void>;
  isLoading: boolean;
  isReadOnly: boolean;
}

export const CommitmentsTab: React.FC<CommitmentsTabProps> = ({ 
  subscriptions, debtEntries, onAdd, onEdit, onDelete, isLoading, isReadOnly 
}) => {

  const activeDebts = useMemo(() => {
    if (!debtEntries || debtEntries.length === 0) return [];
    const today = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = today.substring(0, 7);
    const sorted = [...debtEntries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const entry = sorted.find(d => d.date?.startsWith(currentMonthPrefix)) || sorted.find(d => d.date && d.date <= today) || sorted[sorted.length - 1];
    return entry ? [entry] : [];
  }, [debtEntries]);

  const subStats = useMemo(() => {
    const active = subscriptions.filter(s => s.active);
    const cost = active.reduce((acc, s) => acc + FinancialEngine.calculateMonthlyBurn(s.cost, s.period), 0);
    return { count: active.length, monthlyCost: cost };
  }, [subscriptions]);

  const totalMonthlyBurn = subStats.monthlyCost + (activeDebts.reduce((acc, d) => acc + (d.monthlyPayment || 0), 0));

  return (
    <div className="space-y-12 animate-fade-in tabular-nums">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-slate-950 p-12 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden group border-2 border-slate-900">
          <Flame size={180} className="absolute -right-12 -bottom-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 fill-white group-hover:opacity-20" />
          <div className="relative z-10 space-y-10">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Resource Drain Velocity</p>
              <h3 className="text-4xl sm:text-6xl font-black tracking-tighter text-white flex items-baseline">
                {isLoading ? "---" : formatBaseCurrency(totalMonthlyBurn).replace(/\.00$/, '')}
                <span className="text-lg sm:text-xl text-blue-500 font-black ml-4 uppercase tracking-[0.2em]">/ MO</span>
              </h3>
            </div>
            <div className="flex gap-4 sm:gap-8">
              <div className="bg-white/5 px-6 py-4 sm:px-8 sm:py-5 rounded-[2rem] border border-white/5 backdrop-blur-sm flex-1 sm:flex-initial">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Committed Subs</p>
                <p className="text-base sm:text-xl font-black font-mono text-indigo-400 truncate">{formatBaseCurrency(subStats.monthlyCost).replace(/\.00$/, '')}</p>
              </div>
              <div className="bg-white/5 px-6 py-4 sm:px-8 sm:py-5 rounded-[2rem] border border-white/5 backdrop-blur-sm flex-1 sm:flex-initial">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Debt Servicing</p>
                <p className="text-base sm:text-xl font-black font-mono text-rose-400 truncate">{formatBaseCurrency(totalMonthlyBurn - subStats.monthlyCost).replace(/\.00$/, '')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <GlassCard className="p-12 flex flex-col justify-center">
          <div className="flex items-center gap-6 mb-8">
            <div className="p-5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-[2rem] shadow-inner"><Activity size={32} /></div>
            <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">Flow Integrity</h4>
                <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-[0.3em]">{subStats.count} ACTIVE EXTERNAL NODES</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold opacity-80">
            Automated monitoring of monthly outflow ensures resource assignment remains focused on high-utility interactions and critical debt servicing obligations.
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase tracking-tighter">
              <TrendingDown size={24} className="text-rose-500" /> Liabilities Matrix
            </h3>
          </div>
          <InstitutionalTable>
            <InstitutionalTableHead>
                <tr>
                  <th className="px-10 py-6">Instrument Identity</th>
                  <th className="px-10 py-6 text-right">Node Settlement</th>
                </tr>
            </InstitutionalTableHead>
            <InstitutionalTableBody>
                {activeDebts.map((d) => (
                  <tr key={d.id} className="hover:bg-rose-500/[0.03] transition-colors group">
                    <td className="px-10 py-10 text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{d.name}</td>
                    <td className="px-10 py-10 text-right font-black text-rose-500 font-mono text-2xl ghost-blur tracking-tighter">{formatBaseCurrency(d.amountOwed)}</td>
                  </tr>
                ))}
                {activeDebts.length === 0 && (
                  <tr><td colSpan={2} className="p-20 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] italic opacity-40">Zero Debt Nodes Detected</td></tr>
                )}
            </InstitutionalTableBody>
          </InstitutionalTable>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase tracking-tighter">
              <CreditCard size={24} className="text-indigo-500" /> Subscription Registry
            </h3>
            {!isReadOnly && (
              <button onClick={onAdd} className="bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95">
                <Plus size={16} className="inline mr-2" strokeWidth={3} /> New Registry Entry
              </button>
            )}
          </div>
          <InstitutionalTable>
            <InstitutionalTableHead>
                <tr>
                  <th className="px-10 py-6">Interaction Node</th>
                  <th className="px-10 py-6 text-right">Drain Gradient</th>
                  <th className="px-10 py-6 w-24"></th>
                </tr>
            </InstitutionalTableHead>
            <InstitutionalTableBody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-widest text-sm uppercase">
                        {s.name} 
                        {!s.active && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-black uppercase tracking-tighter">Standby</span>}
                      </div>
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-2"><Terminal size={10} /> {s.category} // {s.period}</div>
                    </td>
                    <td className="px-10 py-8 text-right font-black text-slate-900 dark:text-white font-mono text-lg ghost-blur tracking-tighter">{formatBaseCurrency(s.cost)}</td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {!isReadOnly && (
                          <>
                            <button onClick={() => onEdit(s)} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-sm active:scale-90"><Pencil size={14} /></button>
                            <button onClick={() => onDelete(s)} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-90"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr><td colSpan={3} className="p-20 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] italic opacity-40">Zero Subscription Nodes Identified</td></tr>
                )}
            </InstitutionalTableBody>
          </InstitutionalTable>
        </div>
      </div>
    </div>
  );
};
