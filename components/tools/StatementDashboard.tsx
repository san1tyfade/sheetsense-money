
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { StatsCard } from '../dashboard/DashboardStats';
import { Activity, CreditCard, Layers, Zap, LayoutGrid } from 'lucide-react';

interface StatementDashboardProps {
  transactions: Transaction[];
  balance: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const StatementDashboard: React.FC<StatementDashboardProps> = ({ transactions, balance }) => {
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.amount > 0 && t.type !== 'Payment') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalCalculatedSpending = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.value, 0);
  }, [categoryData]);

  const topTransactions = [...transactions]
    .filter(t => t.amount > 0 && t.type !== 'Payment')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Level Signal Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        <StatsCard title="Ported Outflow" value={totalCalculatedSpending} icon={CreditCard} color="emerald" isLoading={false} isHistorical={false} />
        <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col justify-between group transition-all duration-500 hover:shadow-xl">
             <div className="space-y-6">
                <div className="p-4 bg-purple-600/10 rounded-2xl text-purple-600 shadow-inner group-hover:scale-110 transition-transform duration-500 self-start w-fit">
                    <Layers size={28} />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Logic Events</p>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white ghost-blur tracking-tighter leading-none">
                        {transactions.length} <span className="text-xl text-slate-400 uppercase tracking-widest font-black ml-2">Tx</span>
                    </h3>
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">Captured in Buffer</span>
             </div>
        </div>
      </div>

      {/* Category Summary Matrix (Institutional Layout) */}
      <div className="px-2 space-y-8">
        <div className="flex items-center gap-4">
            <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Category Summary</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryData.map((item, index) => {
                const share = totalCalculatedSpending > 0 ? (item.value / totalCalculatedSpending) * 100 : 0;
                const color = COLORS[index % COLORS.length];
                
                return (
                    <div key={item.name} className="bg-white dark:bg-slate-800/40 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: color, color }}></div>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{item.name}</span>
                        </div>
                        <div className="mb-8">
                            <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-mono ghost-blur">
                                {formatBaseCurrency(item.value).replace(/\.00$/, '')}
                            </h4>
                        </div>
                        <div className="pt-6 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Share of Spend</span>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">{share.toFixed(1)}%</span>
                        </div>
                    </div>
                );
            })}
            {categoryData.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] opacity-30 uppercase font-black text-[10px] tracking-[0.4em] italic">
                    Establish Category Logic to Hydrate Matrix
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-2">
        {/* Visualization Component */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col h-[500px] relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="p-3.5 bg-indigo-600/10 rounded-2xl text-indigo-600 border border-indigo-600/20 shadow-inner">
                  <Zap size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Yield Destruction</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Allocation Map</p>
              </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={85} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} className="hover:fill-opacity-100 transition-all duration-300 outline-none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', backgroundColor: '#0f172a', padding: '1rem' }} itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }} formatter={(value: number) => [formatBaseCurrency(value), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Total Volume</p>
                 <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatBaseCurrency(totalCalculatedSpending).replace(/\.00$/, '')}</p>
              </div>
            </div>
            <div className="space-y-5">
              {categoryData.slice(0, 5).map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{item.name}</span>
                    <span className="text-slate-900 dark:text-white font-mono">{formatBaseCurrency(item.value).replace(/\.00$/, '')}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden p-0.5">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(item.value / (totalCalculatedSpending || 1)) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}></div>
                  </div>
                </div>
              ))}
              {categoryData.length > 5 && (
                <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-[0.2em] pt-4 opacity-60 italic">
                  + {categoryData.length - 5} Supplemental Vectors Detected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* High Magnitude Transactions */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col h-[500px] group">
          <div className="flex items-center gap-4 mb-10">
              <div className="p-3.5 bg-rose-600/10 rounded-2xl text-rose-600 border border-rose-600/20 shadow-inner">
                  <Activity size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">High Magnitude Hits</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Threshold Analysis</p>
              </div>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-1">
            {topTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all group/hit shadow-inner">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight group-hover/hit:text-blue-500 transition-colors">{t.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">{t.date}</span>
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{t.category}</span>
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white font-mono ghost-blur">{formatBaseCurrency(t.amount).replace(/\.00$/, '')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
