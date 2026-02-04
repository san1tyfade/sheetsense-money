import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, StatementFormat } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { InstitutionalStatCard } from '../core-ui/InstitutionalStatCard';
import { Activity, CreditCard, Layers, Zap, LayoutGrid, Terminal, TrendingUp, Sparkles, Box } from 'lucide-react';
import { PrivacyValue } from '../core-ui/PrivacyValue';
import { GlassCard } from '../core-ui/GlassCard';

interface StatementDashboardProps {
  transactions: Transaction[];
  balance: number;
  sourceName?: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const StatementDashboard: React.FC<StatementDashboardProps> = ({ transactions, balance, sourceName }) => {
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.amount > 0 && t.type !== 'Payment') {
        const cat = t.category || 'Uncategorized';
        map[cat] = (map[cat] || 0) + t.amount;
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
    .slice(0, 4);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Prime Signal Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <InstitutionalStatCard 
            title="Ported Outflow" 
            value={totalCalculatedSpending} 
            icon={CreditCard} 
            variant="emerald" 
            originLabel={sourceName}
            subValue="Extracted Stream"
        />
        <InstitutionalStatCard title="Audit Depth" value={transactions.length} icon={Layers} variant="purple" isCurrency={false} precision={0} subValue="Extracted Events" />
        <InstitutionalStatCard title="High Contrast" value={topTransactions[0]?.amount || 0} icon={Zap} variant="rose" subValue="Peak Node Impact" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 px-2">
        {/* Allocation Geometry */}
        <div className="xl:col-span-8">
            <div className="bg-slate-950 p-10 rounded-[3rem] border border-slate-900 shadow-2xl relative overflow-hidden min-h-[520px] flex flex-col">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
                
                <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Yield Destruction</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Capital Distribution Audit</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl text-blue-500 border border-white/5"><Sparkles size={20} /></div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                    <div className="h-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={categoryData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={90} 
                                    outerRadius={120} 
                                    paddingAngle={6} 
                                    dataKey="value" 
                                    stroke="none"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} className="hover:fill-opacity-100 transition-all duration-300 outline-none" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', backgroundColor: '#0f172a', padding: '1rem' }} 
                                    itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }} 
                                    formatter={(value: number) => [formatBaseCurrency(value), '']} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Volume</p>
                            <p className="text-2xl font-black text-white font-mono tracking-tighter">
                                <PrivacyValue value={totalCalculatedSpending} />
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {categoryData.slice(0, 5).map((item, index) => (
                            <div key={item.name} className="group/row">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[140px]">{item.name}</span>
                                    </div>
                                    <PrivacyValue value={item.value} className="text-xs font-black text-white font-mono" />
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(item.value / (totalCalculatedSpending || 1)) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between opacity-40 relative z-10">
                    <div className="flex items-center gap-3">
                        <Terminal size={12} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Ingestion_Matrix_Stable</span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{new Date().toLocaleDateString()}</span>
                </div>
            </div>
        </div>

        {/* High Magnitude Buffer */}
        <div className="xl:col-span-4">
            <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col h-full group">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-3.5 bg-rose-600/10 rounded-2xl text-rose-600 border border-rose-600/20 shadow-inner">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Anomalies</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">High Magnitude Hits</p>
                    </div>
                </div>
                
                <div className="space-y-4 flex-1">
                    {topTransactions.map((t) => (
                        <div key={t.id} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all group/hit shadow-inner">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight leading-tight mb-3">{t.description}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t.category}</span>
                                </div>
                                <PrivacyValue value={t.amount} className="text-sm font-black text-slate-900 dark:text-white font-mono" />
                            </div>
                        </div>
                    ))}
                    {topTransactions.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                            <Zap size={40} className="mb-4" />
                            <p className="text-[8px] font-black uppercase tracking-[0.4em]">Zero Spike Detections</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Global Threshold Monitoring Active</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};