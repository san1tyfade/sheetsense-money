import React, { useMemo, useState } from 'react';
import { IncomeEntry, ExpenseEntry, LedgerData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Sankey, Layer, Rectangle, Cell } from 'recharts';
import { BadgeDollarSign, TrendingUp, CreditCard, Activity, GitMerge, BarChart2, X, Terminal, Zap, LayoutGrid, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { FinancialEngine } from '../../services/math/FinancialEngine';
import { transformSankeyData, transformDetailedTrendData } from '../../services/analytics/transformers';
import { AnalyticsCard, StatHighlight, StandardTooltip } from '../analytics/AnalyticsPrimitives';
import { useChartTheme } from '../../hooks/useChartTheme';

interface IncomeAnalysisProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  detailedExpenses?: LedgerData;
  isLoading?: boolean;
  isDarkMode?: boolean;
  selectedYear?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const SankeyNode = ({ x, y, width, height, index, payload, isDarkMode, selectedCategory, onNodeClick, isLastColumn }: any) => {
    if (!payload || !payload.name) return null;
    const isLeft = x < 200;
    const isSelected = selectedCategory === payload.name;
    const isTotal = payload.name === 'Total Spending';
    
    return (
        <Layer key={`node-${index}`}>
            <Rectangle 
                x={x} y={y} width={width} height={height} 
                fill={payload.color || "#3b82f6"} 
                fillOpacity={isSelected || isTotal ? 1 : 0.7} 
                radius={[4, 4, 4, 4]}
                stroke={isSelected ? (isDarkMode ? '#fff' : '#000') : 'none'}
                strokeWidth={2}
                className="cursor-pointer hover:fill-opacity-100 transition-all duration-300"
                onClick={() => onNodeClick && onNodeClick(payload)}
            />
             <text
                x={isLeft ? x + width + 12 : x - 12} y={y + height / 2} dy={4}
                textAnchor={isLeft ? 'start' : 'end'}
                fontSize={11} fill={isDarkMode ? "#94a3b8" : "#64748b"}
                fontWeight="900"
                className="uppercase tracking-[0.1em]"
                style={{ pointerEvents: 'none' }}
            >
                {payload.name}
            </text>
        </Layer>
    );
};

export const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ 
    incomeData, expenseData, detailedExpenses, isLoading = false, isDarkMode = true, selectedYear = new Date().getFullYear()
}) => {
  const [expenseFilter, setExpenseFilter] = useState<string>('All');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const theme = useChartTheme(isDarkMode!);

  const isCurrentYear = selectedYear === new Date().getFullYear();
  const periodLabel = isCurrentYear ? "YTD" : "Full Year";
  const monthsList = detailedExpenses?.months || [];

  const stats = useMemo(() => FinancialEngine.calculatePeriodTotals(incomeData, expenseData, selectedYear), [incomeData, expenseData, selectedYear]);

  const expenseCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    expenseData.forEach(e => {
        if (e.categories) {
            Object.keys(e.categories).forEach(k => keys.add(k));
        }
    });
    return Array.from(keys).sort();
  }, [expenseData]);

  const expenseChartData = useMemo(() => {
    return expenseData
        .filter(e => e.date.startsWith(String(selectedYear)))
        .map(e => ({ ...e, ...e.categories }));
  }, [expenseData, selectedYear]);

  const sankeyData = useMemo(() => transformSankeyData(detailedExpenses, selectedMonthIndex, isDarkMode!, selectedCategoryName), [detailedExpenses, selectedMonthIndex, isDarkMode, selectedCategoryName]);
  const detailedTrendData = useMemo(() => transformDetailedTrendData(detailedExpenses), [detailedExpenses]);

  const trendCategoryKeys = useMemo(() => {
      if (detailedTrendData.length === 0) return [];
      const keys = new Set<string>();
      detailedTrendData.forEach(row => {
          Object.keys(row).forEach(k => {
              if (k !== 'name') keys.add(k);
          });
      });
      return Array.from(keys).sort((a, b) => {
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return a.localeCompare(b);
      });
  }, [detailedTrendData]);

  const formatYAxis = (v: number) => {
      if (v === 0) return '$0';
      if (Math.abs(v) >= 1000) return `$${(v/1000).toFixed(0)}k`;
      return `$${v}`;
  };

  return (
    <div className="space-y-12 animate-fade-in tabular-nums pb-20">
      <section className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-2 transition-opacity duration-500 ${isLoading ? 'opacity-60' : ''}`}>
         <StatHighlight label={`Net Residual ${periodLabel}`} value={stats.ytdInc - stats.ytdExp} variant="info" subValue={`${stats.rate.toFixed(1)}% Efficiency`} />
         <StatHighlight label={`Savings Rate ${periodLabel}`} value={`${stats.rate.toFixed(1)}%`} isCurrency={false} variant="success" trend={stats.rate} />
         <StatHighlight label={`Global Inflow ${periodLabel}`} value={stats.ytdInc} variant="success" />
         <StatHighlight label={`Total Outflow ${periodLabel}`} value={stats.ytdExp} variant="danger" />
      </section>

      <section className={`grid grid-cols-1 lg:grid-cols-2 gap-10 px-2 transition-opacity duration-500 ${isLoading ? 'opacity-60' : ''}`}>
        <AnalyticsCard 
          title="Inflow Gradient" 
          icon={BadgeDollarSign} 
          subtext="MONTHLY YIELD ANALYSIS"
          className="h-[520px] bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 rounded-[3.5rem] shadow-xl"
        >
          <div className="h-full w-full flex flex-col mt-4">
                <div className="flex-1 min-h-0">
                    {incomeData.filter(d => d.date.startsWith(String(selectedYear))).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeData.filter(d => d.date.startsWith(String(selectedYear)))} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.2} />
                                <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 900}} tickMargin={12} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: theme.axisColor, fontWeight: 900}} tickFormatter={formatYAxis} width={60} />
                                <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: theme.surface, radius: 8}} />
                                <ReferenceLine y={stats.totalInc / 12} stroke="#3b82f6" strokeWidth={2} strokeDasharray="8 4" opacity={0.5} />
                                <Bar dataKey="amount" name="Inflow" fill="url(#incomeBarGradient)" radius={[8, 8, 2, 2]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-30 uppercase text-[10px] font-black italic">No Inflow Data Ported</div>}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight size={14} className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Yield Detection: Stable</span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2"><Terminal size={10} /> IN_FLUX_NOMINAL</span>
                </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard 
          title="Consumption Map" 
          icon={CreditCard} 
          subtext="RESOURCE DRAIN PROFILE"
          className="h-[520px] bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 rounded-[3.5rem] shadow-xl"
          controls={
            <div className="relative group/select">
                <select value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl outline-none border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer shadow-inner appearance-none pr-12 focus:border-blue-500/50 transition-all">
                    <option value="All">All Categories</option>
                    {expenseCategoryKeys.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <LayoutGrid size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          }
        >
            <div className="h-full w-full flex flex-col mt-4">
                <div className="flex-1 min-h-0">
                    {expenseChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expenseChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.2} />
                                <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 900}} tickMargin={12} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: theme.axisColor, fontWeight: 900}} tickFormatter={formatYAxis} width={60} />
                                <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: theme.surface, radius: 8}} />
                                {expenseFilter === 'All' ? expenseCategoryKeys.map((key, idx) => (
                                    <Bar key={key} dataKey={key} name={key} stackId="a" fill={COLORS[idx % COLORS.length]} fillOpacity={0.8} radius={idx === expenseCategoryKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} barSize={28} />
                                )) : (
                                    <Bar dataKey={expenseFilter} name={expenseFilter} fill="#ef4444" radius={[8, 8, 2, 2]} barSize={28} fillOpacity={0.8} />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-30 uppercase text-[10px] font-black italic">No Expense Nodes Logged</div>}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowDownRight size={14} className="text-rose-500" />
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Outflow Pattern: Persistent</span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2"><Terminal size={10} /> DRAIN_STATUS_CHECK</span>
                </div>
            </div>
        </AnalyticsCard>
      </section>

      {detailedExpenses && detailedExpenses.categories.length > 0 && (
          <section className="space-y-10 border-t border-slate-100 dark:border-slate-800 pt-16 px-2 animate-fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  <div className="xl:col-span-7">
                    <AnalyticsCard 
                      title="Spending Flow" 
                      icon={GitMerge} 
                      subtext="HIERARCHICAL NODE DISTRIBUTION"
                      className="h-[650px] bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 rounded-[3.5rem] shadow-xl"
                      controls={
                        <div className="flex items-center gap-4">
                            {selectedCategoryName && <button onClick={() => setSelectedCategoryName(null)} className="flex items-center gap-2 px-5 py-2.5 text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-black uppercase transition-all hover:bg-rose-500/20 shadow-sm border border-rose-500/20">Reset Focus <X size={12} /></button>}
                            <div className="relative group/select">
                                <select value={selectedMonthIndex} onChange={(e) => setSelectedMonthIndex(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer shadow-inner appearance-none pr-12 focus:border-blue-500/50 transition-all">
                                  {monthsList.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                                </select>
                                <TrendingUp size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                      }
                    >
                      <div className="h-full w-full mt-6">
                        {sankeyData.links.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <Sankey
                                    data={sankeyData} margin={{ left: 10, right: 10, top: 40, bottom: 40 }}
                                    node={<SankeyNode isDarkMode={isDarkMode} selectedCategory={selectedCategoryName} onNodeClick={(n: any) => {
                                        const isCategory = detailedExpenses.categories.some(c => c.name === n.name);
                                        if (isCategory) {
                                            setSelectedCategoryName(n.name === selectedCategoryName ? null : n.name);
                                        } else if (n.name === 'Total Spending') {
                                            setSelectedCategoryName(null);
                                        }
                                    }} />}
                                    link={{ stroke: isDarkMode ? '#334155' : '#e2e8f0', strokeOpacity: 0.15 }} nodePadding={30} nodeWidth={24}
                                >
                                    <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} />
                                </Sankey>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-30 uppercase text-[10px] font-black italic">Window Context Unpopulated</div>}
                      </div>
                    </AnalyticsCard>
                  </div>

                  <div className="xl:col-span-5">
                    <AnalyticsCard 
                      title="Temporal Concentration" 
                      icon={BarChart2} 
                      subtext="ANNUAL CLASSIFICATION TRAIL"
                      className="h-[650px] bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 rounded-[3.5rem] shadow-xl"
                    >
                      <div className="h-full w-full flex flex-col mt-6">
                        <div className="flex-1 min-h-0">
                          {detailedTrendData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={detailedTrendData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                                      <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.2} />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 900}} tickMargin={12} />
                                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: theme.axisColor, fontWeight: 900}} tickFormatter={formatYAxis} width={60} />
                                      <Tooltip content={<StandardTooltip isDarkMode={isDarkMode} />} cursor={{fill: theme.surface, radius: 8}} />
                                      <Legend iconSize={8} wrapperStyle={{fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '30px', paddingBottom: '10px'}} iconType="circle" />
                                      {trendCategoryKeys.map((catName, idx) => (
                                          <Bar key={catName} dataKey={catName} name={catName} stackId="a" fill={catName === 'Other' ? '#94a3b8' : COLORS[idx % COLORS.length]} fillOpacity={selectedCategoryName && selectedCategoryName !== catName ? 0.15 : 0.8} radius={idx === trendCategoryKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} barSize={24} />
                                      ))}
                                  </BarChart>
                              </ResponsiveContainer>
                          ) : <div className="h-full flex items-center justify-center text-slate-400 opacity-30 uppercase text-[10px] font-black italic">Trend Resolution Missing</div>}
                        </div>
                        
                        <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-8 group">
                            <div className="p-5 bg-slate-950 rounded-[1.75rem] text-blue-500 shadow-2xl border border-blue-500/10 transition-all duration-700 group-hover:scale-110 group-hover:border-blue-500/30">
                               <Zap size={32} fill="currentColor" className="animate-pulse" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                                  <Terminal size={12} /> LOGICAL AUDIT NOMINAL
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed opacity-80">
                                  System established baseline via {detailedExpenses.categories.length} logical containers. Trajectory remains stable.
                                </p>
                            </div>
                        </div>
                      </div>
                    </AnalyticsCard>
                  </div>
              </div>
          </section>
      )}
    </div>
  );
};
