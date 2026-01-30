import React, { memo, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, ReferenceLine, Label } from 'recharts';
import { ChevronLeft, ChevronRight, Activity, PieChart as PieIcon, List, Terminal, TrendingUp, TrendingDown, Layers, X } from 'lucide-react';
import { formatBaseCurrency, convertToBase } from '../../services/currencyService';
import { useChartTheme } from '../../hooks/useChartTheme';
import { TimeFocus, Asset, IncomeEntry, ExpenseEntry } from '../../types';
import { TimeFocusSelector } from '../TimeFocusSelector';
import { getAnchorDate, isDateInWindow } from '../../services/temporalService';

const parseISOToLocal = (isoStr: string): Date => {
    if (!isoStr) return new Date();
    const parts = isoStr.split('T')[0].split('-');
    if (parts.length !== 3) return new Date(isoStr);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

export const NetWorthChart = memo(({ 
    data, isDarkMode, selectedYear, isHistorical, timeFocus, onFocusChange, customRange, onCustomRangeChange, incomeData = [], expenseData = [], startValue = 0, availableYears = [], onYearChange
}: any) => {
    const theme = useChartTheme(isDarkMode);
    const isFullHistory = timeFocus === TimeFocus.FULL_YEAR;

    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        const sortedBase = [...data].sort((a,b) => a.date.localeCompare(b.date));
        const anchorDate = getAnchorDate(timeFocus, data, customRange, selectedYear);
        const anchorISO = anchorDate.toISOString().split('T')[0];

        const windowData = (isHistorical || isFullHistory) 
            ? sortedBase 
            : sortedBase.filter((d: any) => isDateInWindow(d.date, timeFocus, customRange, selectedYear));
        
        const trajectory = windowData.map((entry: any) => {
            const date = entry.date;
            const incomeInWindow = incomeData.filter((i: IncomeEntry) => i.date >= anchorISO && i.date <= date).reduce((sum: number, i: IncomeEntry) => sum + (i.amount || 0), 0);
            const expenseInWindow = expenseData.filter((e: ExpenseEntry) => e.date >= anchorISO && e.date <= date).reduce((sum: number, e: ExpenseEntry) => sum + (e.total || 0), 0);
            const principal = startValue + (incomeInWindow - expenseInWindow);
            return { ...entry, principal: Math.max(0, principal) };
        });

        if (trajectory.length > 0 && trajectory[0].date > anchorISO) {
            trajectory.unshift({ date: anchorISO, value: startValue, principal: startValue, isSynthetic: true });
        } else if (trajectory.length === 0) {
            trajectory.push({ date: anchorISO, value: startValue, principal: startValue, isSynthetic: true });
        }
        return trajectory;
    }, [data, selectedYear, isHistorical, timeFocus, customRange, incomeData, expenseData, startValue, isFullHistory]);

    return (
        <div className="bg-white dark:bg-slate-800/40 p-6 md:p-8 rounded-[3rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[480px] md:h-[550px] shadow-sm relative group overflow-hidden transition-all duration-500 hover:shadow-2xl">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8 gap-4 md:gap-8 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Activity size={24} className="text-blue-500" />
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tactical Trajectory</h3>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{isFullHistory ? "Lifetime Asset Valuation" : "Chapter Specific Resolution"}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                    {!isHistorical && (
                        <div className="flex-1 sm:flex-initial min-w-[200px]">
                            <TimeFocusSelector current={timeFocus} onChange={onFocusChange} customRange={customRange} onCustomRangeChange={onCustomRangeChange} />
                        </div>
                    )}
                    {availableYears.length > 0 && !isFullHistory && (
                        <>
                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />
                            <div className="flex items-center gap-1">
                                <button onClick={() => onYearChange(availableYears[availableYears.indexOf(selectedYear) + 1])} disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg disabled:opacity-20 transition-all text-slate-400"><ChevronLeft size={16}/></button>
                                <span className="px-2 text-[10px] font-black text-slate-900 dark:text-white font-mono">{selectedYear}</span>
                                <button onClick={() => onYearChange(availableYears[availableYears.indexOf(selectedYear) - 1])} disabled={availableYears.indexOf(selectedYear) === 0} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg disabled:opacity-20 transition-all text-slate-400"><ChevronRight size={16}/></button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={theme.gridColor} vertical={false} opacity={0.4} />
                        <XAxis dataKey="date" tickFormatter={(str) => parseISOToLocal(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} stroke={theme.axisColor} tick={{fontSize: 10, fontWeight: 900, fill: theme.axisColor}} tickMargin={12} minTickGap={40} axisLine={false} tickLine={false} />
                        <YAxis stroke={theme.axisColor} tick={{fontSize: 10, fontWeight: 900, fill: theme.axisColor}} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} axisLine={false} tickLine={false} width={60} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '1.5rem', padding: '1rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }} 
                            itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }} 
                            labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                            formatter={(v: number, n: string) => [<span className="text-white font-mono">{formatBaseCurrency(v)}</span>, n === 'value' ? "Total Wealth" : "Principal"]} 
                            cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} 
                        />
                        {!isFullHistory && <Area type="monotone" dataKey="principal" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" fill="url(#colorPrincipal)" activeDot={false} />}
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fill="url(#colorValue)" activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#10b981' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

type IncomeChartMode = 'MONTHLY' | 'ANNUAL';

export const IncomeChart = memo(({ data, incomeData = [], expenseData = [], isDarkMode }: any) => {
    const [viewMode, setViewMode] = useState<IncomeChartMode>('MONTHLY');
    const theme = useChartTheme(isDarkMode);

    const processedAnnualData = useMemo(() => {
        const annuals: Record<string, { income: number, expense: number }> = {};
        
        incomeData.forEach((i: IncomeEntry) => {
            const yr = i.date.substring(0, 4);
            if (!annuals[yr]) annuals[yr] = { income: 0, expense: 0 };
            annuals[yr].income += i.amount;
        });

        expenseData.forEach((e: ExpenseEntry) => {
            const yr = e.date.substring(0, 4);
            if (!annuals[yr]) annuals[yr] = { income: 0, expense: 0 };
            annuals[yr].expense += e.total;
        });

        return Object.entries(annuals)
            .map(([yearStr, values]) => ({ 
                monthStr: yearStr, 
                date: `${yearStr}-01-01`, 
                ...values 
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [incomeData, expenseData]);

    const activeChartData = viewMode === 'MONTHLY' ? data : processedAnnualData;

    const summary = useMemo(() => {
        if (!activeChartData.length) return null;
        const totalIn = activeChartData.reduce((s: number, d: any) => s + (d.income || 0), 0);
        const totalOut = activeChartData.reduce((s: number, d: any) => s + (d.expense || 0), 0);
        const net = totalIn - totalOut;
        const efficiency = totalIn > 0 ? (net / totalIn) * 100 : 0;
        const avgIn = totalIn / activeChartData.length;
        const avgOut = totalOut / activeChartData.length;
        return { totalIn, totalOut, net, efficiency, avgIn, avgOut };
    }, [activeChartData]);

    return (
        <div className="bg-white dark:bg-slate-800/40 p-6 sm:p-8 rounded-[3rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col h-[650px] sm:h-[480px] md:h-[550px] relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Cash Flow Velocity</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Inflow vs Outflow Trend</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner shrink-0">
                    {(['MONTHLY', 'ANNUAL'] as IncomeChartMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                viewMode === mode 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'MONTHLY' && summary && (
                <div className="relative sm:absolute sm:top-24 sm:right-8 z-20 mb-6 sm:mb-0 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 min-w-full sm:min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Logic</span>
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${summary.net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {summary.efficiency.toFixed(1)}% Yield
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={12} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inflow</span>
                                </div>
                                <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatBaseCurrency(summary.totalIn).replace(/\.00$/, '')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <TrendingDown size={12} className="text-rose-500" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Outflow</span>
                                </div>
                                <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatBaseCurrency(summary.totalOut).replace(/\.00$/, '')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Surplus</span>
                                <span className={`text-sm font-black font-mono ${summary.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatBaseCurrency(summary.net).replace(/\.00$/, '')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-[400px] sm:h-full sm:flex-1 relative z-10 mt-4 sm:mt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeChartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.3} />
                        <XAxis 
                            dataKey="monthStr" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: theme.axisColor, fontWeight: 900}} 
                            tickMargin={12} 
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: theme.axisColor, fontWeight: 900}} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} width={60} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1.5rem', padding: '1rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                            itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '10px', fontWeight: '900' }}
                            formatter={(v: number) => [formatBaseCurrency(v), '']}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        
                        {summary && (
                            <>
                                <ReferenceLine y={summary.avgIn} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2}>
                                    <Label value="AVG IN" position="right" fill="#10b981" fontSize={8} fontWeight="900" offset={10} className="uppercase" />
                                </ReferenceLine>
                                <ReferenceLine y={summary.avgOut} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={2}>
                                    <Label value="AVG OUT" position="right" fill="#ef4444" fontSize={8} fontWeight="900" offset={10} className="uppercase" />
                                </ReferenceLine>
                            </>
                        )}

                        <Bar dataKey="income" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} barSize={viewMode === 'ANNUAL' ? 40 : 20} />
                        <Bar dataKey="expense" name="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={viewMode === 'ANNUAL' ? 40 : 20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="absolute bottom-6 right-10 flex items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity hidden sm:flex">
                <Terminal size={12} className="text-slate-400" />
                <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">Stream Source Resolved</span>
            </div>
        </div>
    );
});

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const AllocationChart = memo(({ data, selectedCategory, onSelect, isDarkMode }: any) => {
    const theme = useChartTheme(isDarkMode);
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);

    return (
        <div className="bg-white dark:bg-slate-800/40 p-6 md:p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col h-[480px] md:h-[550px] relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                    <PieIcon size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Asset Distribution</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Capital Assignment Matrix</p>
                </div>
            </div>
            <div className="flex-1 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={data} 
                            cx="50%" cy="50%" 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={5} 
                            dataKey="value"
                            onClick={(e) => onSelect(selectedCategory === e.name ? null : e.name)}
                            stroke="none"
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    fillOpacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}
                                    className="cursor-pointer transition-all duration-300"
                                />
                            ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBaseCurrency(v)} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                    <p className="text-[10px] font-black uppercase text-slate-400">Inventory</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{formatBaseCurrency(total).replace(/\.00$/, '')}</p>
                </div>
            </div>
        </div>
    );
});

export const DrilldownView = memo(({ category, assets, exchangeRates, onClose }: { category: string, assets: Asset[], exchangeRates: any, onClose: () => void }) => {
    return (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-2xl animate-fade-in-up relative group">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-blue-500 transition-colors duration-500">
                        <List size={28} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{category} Nodes</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Granular Component Audit</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-rose-500 transition-all active:scale-95 shadow-sm self-end sm:self-center"
                    title="Close Drilldown"
                >
                    <X size={24} strokeWidth={3} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map(asset => {
                    const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
                    return (
                        <div key={asset.id} className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group/node">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/node:text-blue-500 transition-colors">{asset.name}</p>
                            <h5 className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                                {formatBaseCurrency(baseVal)}
                            </h5>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
