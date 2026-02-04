import React from 'react';
import { TrendingUp, Clock, Terminal } from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';

interface MortgageMetricsProps {
    stats: {
        interestSaved: number;
        yearsSaved: number;
        monthsSaved: number;
        payoffYear: number;
        milestone: {
            balance: number;
            equity: number;
            ratio: number;
        };
        pith: {
            total: number;
            taxPercent: number;
            heatPercent: number;
        };
        shock: {
            amount: number;
            percent: number;
        };
    };
    isStressTestEnabled: boolean;
}

export const MortgageMetrics: React.FC<MortgageMetricsProps> = ({ stats, isStressTestEnabled }) => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-2 border-slate-900">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <div className="relative z-10 space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Resource Preservation</p>
                        <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white font-mono flex items-baseline">
                            ${formatCurrency(stats.interestSaved, 0, 0)}
                            <span className="text-xs sm:text-sm text-emerald-500 font-black ml-4 uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Saved</span>
                        </h2>
                        <div className="pt-6 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                <TrendingUp size={12} className="text-emerald-500" /> Strategy Alpha Optimized
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-2 border-slate-900">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <div className="relative z-10 space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Velocity Compression</p>
                        <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white font-mono flex items-baseline">
                            {stats.yearsSaved}<span className="text-2xl ml-1 text-slate-600">Y</span> {stats.monthsSaved}<span className="text-2xl ml-1 text-slate-600">M</span>
                            <span className="text-xs sm:text-sm text-blue-500 font-black ml-4 uppercase tracking-[0.2em] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Shortened</span>
                        </h2>
                        <div className="pt-6 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                <Clock size={12} className="text-blue-500" /> Payoff Anchor: {stats.payoffYear}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Supporting Secondary Audit Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between group hover:border-blue-500/30 transition-all shadow-sm">
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Monthly Carry (PITH)</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">${formatCurrency(stats.pith.total, 0, 0)}</h3>
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                        <div className="flex gap-1 h-2 rounded-full overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900">
                            <div className="bg-indigo-600 transition-all duration-1000" style={{ width: `${Math.max(0, 100 - stats.pith.taxPercent - stats.pith.heatPercent)}%` }} />
                            <div className="bg-amber-400 transition-all duration-1000" style={{ width: `${stats.pith.taxPercent}%` }} />
                            <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${stats.pith.heatPercent}%` }} />
                        </div>
                        <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-tighter">
                            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-600 rounded-full" /> P+I</span>
                            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-amber-400 rounded-full" /> TAX</span>
                            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-rose-500 rounded-full" /> HEAT</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">5-Yr Equity Captured</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">${formatCurrency(stats.milestone.equity, 0, 0)}</h3>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.milestone.ratio}%` }} />
                        </div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                            {stats.milestone.ratio.toFixed(1)}% Principal Amortized
                        </p>
                    </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col justify-between shadow-sm ${isStressTestEnabled ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50'}`}>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>
                            {isStressTestEnabled ? 'Periodic Shock' : 'Stress Tolerance'}
                        </p>
                        <h3 className={`text-2xl font-black font-mono tracking-tighter ${isStressTestEnabled ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                            {isStressTestEnabled ? `+$${formatCurrency(stats.shock.amount, 0, 0)}` : 'Stable'}
                        </h3>
                    </div>
                    {isStressTestEnabled && (
                        <div className="mt-6 space-y-2">
                            <div className="h-2 w-full bg-rose-100 dark:bg-rose-950 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${Math.min(100, stats.shock.percent)}%` }} />
                            </div>
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                                {stats.shock.percent.toFixed(1)}% Increase Protocol
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Audit Footnote */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-center gap-6 group shadow-sm hover:shadow-md transition-all">
                <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Terminal size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sovereign Debt Audit</p>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                        Strategy execution secures <span className="text-emerald-500 font-black">${formatCurrency(stats.interestSaved, 0, 0)}</span> in net capital preservation.
                        Structure remains compliant with Canadian semi-annual compounding protocols.
                    </p>
                </div>
            </div>
        </div>
    );
};
