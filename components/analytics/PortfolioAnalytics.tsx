
import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioLogEntry, TimeFocus, CustomDateRange, Trade, Investment } from '../../types';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, Cell, LabelList, Tooltip } from 'recharts';
import { Zap, Target, RefreshCw, TrendingUp, Terminal, Layers, LayoutDashboard, AlertCircle, Calendar } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { processPortfolioHistory, calculatePortfolioAttribution } from '../../services/portfolioMath';
import { FinancialEngine } from '../../services/math/FinancialEngine';
import { transformWaterfallData, transformBenchmarkComparison } from '../../services/analytics/transformers';
import { fetchHistoricalPrices } from '../../services/priceService';
import { normalizeTicker } from '../../services/deterministicUtils';
import { resolveTickerPrice, calculateValuation } from '../../services/domain/valuationEngine';
import { StatHighlight, StandardTooltip } from './AnalyticsPrimitives';
import { useFinancialStore } from '../../context/FinancialContext';
import { SharedChart, StandardGrid, StandardXAxis, StandardYAxis } from '../shared/SharedChart';

interface PortfolioAnalyticsProps {
    history: PortfolioLogEntry[];
    trades: Trade[];
    investments: Investment[];
    timeFocus: TimeFocus;
    customRange: CustomDateRange;
    selectedAccount: string;
    onAccountChange: (account: string) => void;
    selectedYear: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const BENCHMARKS = [{ id: 'SPY', name: 'S&P 500', color: '#10b981' }, { id: 'XIU.TO', name: 'TSX 60', color: '#ef4444' }, { id: 'QQQ', name: 'Nasdaq 100', color: '#8b5cf6' }];

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
    history, trades, investments, timeFocus, customRange, selectedAccount, onAccountChange, selectedYear
}) => {
    const [selectedBenchmark, setSelectedBenchmark] = useState('SPY');
    const [benchmarkHistory, setBenchmarkHistory] = useState<{ date: string, price: number }[]>([]);
    const [isFetchingBenchmark, setIsFetchingBenchmark] = useState(false);

    const store = useFinancialStore();
    const { livePrices, rates: exchangeRates } = store;

    const tradesByTicker = useMemo(() => {
        const map = new Map<string, Trade[]>();
        trades.forEach(t => {
            const ticker = normalizeTicker(t.ticker);
            if (!map.has(ticker)) map.set(ticker, []);
            map.get(ticker)?.push(t);
        });
        return map;
    }, [trades]);

    const { data: rawData, accountKeys } = useMemo(() => processPortfolioHistory(history, timeFocus, customRange, selectedYear), [history, timeFocus, customRange, selectedYear]);

    const liveAccountValue = useMemo(() => {
        const isTotal = selectedAccount === 'TOTAL';
        const filteredInvestments = isTotal
            ? investments
            : investments.filter(inv => (inv.accountName || '').toUpperCase() === selectedAccount.toUpperCase());

        return filteredInvestments.reduce((sum, inv) => {
            const ticker = normalizeTicker(inv.ticker);
            const { price, isLive } = resolveTickerPrice(ticker, livePrices, tradesByTicker.get(ticker) || [], inv.currentPrice);
            const valuation = calculateValuation(inv.quantity, price, inv.marketValue, isLive, inv.nativeCurrency, exchangeRates);
            return sum + valuation.baseValue;
        }, 0);
    }, [selectedAccount, investments, livePrices, tradesByTicker, exchangeRates]);

    const accountAwareData = useMemo(() => {
        if (rawData.length === 0 || selectedAccount === 'TOTAL') return rawData;
        const anchor = rawData[0]?.accounts[selectedAccount] || 0;
        return rawData.map(e => ({ ...e, totalValue: e.accounts[selectedAccount] || 0, percentChange: anchor > 0 ? ((e.accounts[selectedAccount] - anchor) / anchor) * 100 : 0 }));
    }, [rawData, selectedAccount]);

    const accountTrades = useMemo(() => {
        if (selectedAccount === 'TOTAL') return trades;
        const tickersInAccount = new Set(
            investments
                .filter(i => (i.accountName || '').toUpperCase() === selectedAccount.toUpperCase())
                .map(i => normalizeTicker(i.ticker))
        );
        return trades.filter(t => tickersInAccount.has(normalizeTicker(t.ticker)));
    }, [trades, selectedAccount, investments]);

    const attribution = useMemo(() =>
        calculatePortfolioAttribution(accountAwareData, accountTrades, timeFocus, customRange, liveAccountValue, selectedYear),
        [accountAwareData, accountTrades, timeFocus, customRange, liveAccountValue, selectedYear]
    );

    const stats = useMemo(() => {
        if (accountAwareData.length === 0 || !attribution) return null;
        return {
            currentValue: liveAccountValue,
            marketAlpha: attribution.marketAlpha,
            alphaPercentage: attribution.alphaPercentage,
            inflow: attribution.contributions,
            maxDrawdown: FinancialEngine.maxDrawdown(accountAwareData),
            velocity: FinancialEngine.growthVelocity(accountAwareData)
        };
    }, [accountAwareData, liveAccountValue, attribution]);

    const waterfallData = useMemo(() => transformWaterfallData(attribution), [attribution]);

    useEffect(() => {
        if (accountAwareData.length === 0) return;
        setIsFetchingBenchmark(true);
        fetchHistoricalPrices(selectedBenchmark, accountAwareData[0].date).then(p => {
            setBenchmarkHistory(p);
            setIsFetchingBenchmark(false);
        });
    }, [selectedBenchmark, accountAwareData]);

    const comparisonData = useMemo(() => transformBenchmarkComparison(accountAwareData, benchmarkHistory), [accountAwareData, benchmarkHistory]);

    const renderWaterfallLabel = (props: any) => {
        const { x, y, width, index } = props;
        const item = waterfallData[index];
        if (!item) return null;

        return (
            <g>
                <text x={x + width / 2} y={y - 12} fill="#94a3b8" textAnchor="middle" fontSize={10} fontWeight="900" className="uppercase tracking-tighter">{item.name}</text>
                <text x={x + width / 2} y={y - 28} fill="currentColor" textAnchor="middle" fontSize={12} fontWeight="900" className={`${item.actual >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-mono`}>
                    {item.actual >= 0 ? '+' : '-'}${formatBaseCurrency(Math.abs(Math.round(item.actual))).replace(/\.00$/, '')}
                </text>
            </g>
        );
    };

    if (rawData.length === 0) {
        const hasHistoricalData = history.length > 0;
        return (
            <div className="py-40 px-8 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] mx-2">
                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                    <AlertCircle size={48} className="text-amber-500 opacity-50" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Temporal Isolation Detected</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 font-bold uppercase tracking-widest max-w-lg leading-relaxed">
                    No data points found for <span className="text-blue-500">{timeFocus}</span> within the <span className="text-blue-500">{selectedYear}</span> context.
                </p>
                {hasHistoricalData && (
                    <div className="mt-10 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Calendar size={12} /> Optimization Required
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            Try switching to <span className="font-black text-slate-900 dark:text-white">"ALL"</span> time periods or adjust the <span className="font-black text-slate-900 dark:text-white">Year Context</span> in the top header to match your data.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-10">
            <div className="w-full lg:w-48 xl:w-56 shrink-0 lg:sticky lg:top-8 self-start">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:max-h-[85vh] shadow-xl backdrop-blur-md">
                    <div className="hidden lg:block px-4 pt-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Terminal size={10} /> Source Node
                        </p>
                    </div>

                    <button
                        onClick={() => onAccountChange('TOTAL')}
                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group shrink-0 ${selectedAccount === 'TOTAL' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${selectedAccount === 'TOTAL' ? 'bg-blue-500 shadow-inner' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <LayoutDashboard size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Full Portfolio</span>
                    </button>

                    {accountKeys.map(k => (
                        <button
                            key={k}
                            onClick={() => onAccountChange(k)}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group shrink-0 ${selectedAccount === k ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <div className={`p-2 rounded-xl transition-colors ${selectedAccount === k ? 'bg-slate-900 dark:bg-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <Layers size={14} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight truncate max-w-[100px]">{k}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 space-y-10 min-w-0">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2 lg:px-0">
                    <StatHighlight label="Asset Valuation" value={stats?.currentValue || 0} variant="info" />
                    <StatHighlight label="Window Alpha" value={`${stats?.alphaPercentage.toFixed(2)}%`} trend={stats?.alphaPercentage} isCurrency={false} variant={(stats?.alphaPercentage || 0) >= 0 ? 'success' : 'danger'} subValue="Market Perf" />
                    <StatHighlight label="Node Inflow" value={stats?.inflow || 0} variant="info" subValue="Net Trades" />
                    <StatHighlight label="Growth Flow" value={stats?.velocity || 0} subValue="/ day velocity" variant="info" />
                </section>

                <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[550px] shadow-sm relative group overflow-hidden px-2 lg:mx-0">
                    <div className="flex-1 w-full min-h-0 relative z-10 pt-10">
                        <SharedChart>
                            <BarChart data={waterfallData} margin={{ top: 50, right: 30, left: 20, bottom: 10 }}>
                                <StandardGrid />
                                <StandardXAxis dataKey="name" hide />
                                <StandardYAxis
                                    formatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                    domain={[0, (dataMax: number) => dataMax * 1.15]}
                                />
                                <Bar dataKey="range" radius={[4, 4, 4, 4]}>
                                    <LabelList dataKey="range" content={renderWaterfallLabel} />
                                    {waterfallData.map((e, i) => <Cell key={i} fill={e.type === 'anchor' ? '#3b82f6' : e.type === 'inflow' ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                                </Bar>
                            </BarChart>
                        </SharedChart>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-2 lg:px-0">
                    <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[480px] shadow-sm relative group overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6 relative z-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <Target size={24} className="text-emerald-500" />
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Index Pulse</h3>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Relative Performance Audit</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                {BENCHMARKS.map(b => <button key={b.id} onClick={() => setSelectedBenchmark(b.id)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedBenchmark === b.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{b.name}</button>)}
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0 relative z-10">
                            {comparisonData.length > 0 ? (
                                <SharedChart>
                                    <LineChart data={comparisonData}>
                                        <StandardGrid />
                                        <StandardXAxis dataKey="date" hide />
                                        <StandardYAxis formatter={(v) => `${v.toFixed(0)}%`} width={40} />
                                        <Tooltip content={<StandardTooltip isDarkMode={true} />} />
                                        <Line type="monotone" dataKey="portfolio" name="Strat-1 Logic" stroke="#3b82f6" strokeWidth={5} dot={false} />
                                        <Line type="monotone" dataKey="benchmark" name="Market Alpha" stroke={BENCHMARKS.find(b => b.id === selectedBenchmark)?.color} strokeWidth={3} strokeDasharray="8 4" dot={false} />
                                    </LineChart>
                                </SharedChart>
                            ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4"><RefreshCw className="animate-spin text-blue-500" size={32} /><p className="text-[10px] font-black uppercase tracking-widest">Hydrating Benchmarks...</p></div>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[480px] shadow-sm relative group overflow-hidden">
                        <div className="flex items-center gap-4 mb-12 relative z-10">
                            <div className="p-3.5 bg-blue-600/10 rounded-2xl text-blue-600 border border-blue-600/20 shadow-inner">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Equity Trail</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Allocation Evolution</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0 relative z-10">
                            <SharedChart>
                                <AreaChart data={accountAwareData}>
                                    <StandardGrid />
                                    <StandardXAxis dataKey="date" hide />
                                    <StandardYAxis width={50} />
                                    <Tooltip content={<StandardTooltip isDarkMode={true} />} />
                                    {selectedAccount === 'TOTAL' ? accountKeys.map((k, i) => <Area key={k} type="monotone" dataKey={`accounts.${k}`} name={k} stackId="1" fill={COLORS[i % COLORS.length]} fillOpacity={0.1} stroke={COLORS[i % COLORS.length]} strokeWidth={3} />) : <Area type="monotone" dataKey="totalValue" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={5} />}
                                </AreaChart>
                            </SharedChart>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
