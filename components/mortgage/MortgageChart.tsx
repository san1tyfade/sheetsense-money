import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { formatCurrency } from '../../services/currencyService';
import { MortgageInput, PaymentFrequency } from '../../types';
import { RENEWAL_YEAR_BENCHMARK } from '../../services/mortgageService';

interface MortgageChartProps {
    schedule: any[];
    inputs: MortgageInput;
}

const CustomTooltip = ({ active, payload, label, schedule }: any) => {
    if (active && payload && payload.length) {
        const periodIndex = label;
        const point = schedule?.[periodIndex] || payload[0].payload;
        const year = point?.year ?? 0;
        const strategyVal = payload[1]?.value || 0;
        const standardVal = payload[0]?.value || 0;
        const savings = standardVal - strategyVal;

        return (
            <div className="bg-slate-900/95 backdrop-blur-md p-5 rounded-[1.5rem] shadow-2xl border border-slate-700 min-w-[220px] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year {year}</p>
                    </div>
                    {savings > 0 && (
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            SAVING ${formatCurrency(savings, 0, 0)}
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Strategy</span>
                        <span className="text-lg font-black text-white tracking-tight font-mono">${formatCurrency(strategyVal, 0, 0)}</span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Path</span>
                        <span className="text-base font-bold text-slate-400 tracking-tight font-mono opacity-60">${formatCurrency(standardVal, 0, 0)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const MortgageChart: React.FC<MortgageChartProps> = ({ schedule, inputs }) => {
    const periodsPerYear = inputs.frequency === PaymentFrequency.MONTHLY ? 12 : 26;
    const milestonePeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-10 md:p-12 shadow-sm relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-12 relative z-10 gap-6">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Amortization Gradient</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Strategic vs Nominal Balance Evolution</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded-sm border-t-2 border-dashed border-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Path</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-600 rounded-sm shadow-lg shadow-indigo-600/30" />
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest font-black">Strategy</span>
                    </div>
                </div>
            </div>

            <div className="h-[450px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={schedule} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.05} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: '900' }}
                            axisLine={false} tickLine={false}
                            interval={periodsPerYear * 4}
                            tickFormatter={(v) => `Y${Math.floor(v / periodsPerYear)}`}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: '900' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}` + 'k'} width={55} />
                        <Tooltip content={<CustomTooltip schedule={schedule} />} />
                        <Area type="monotone" dataKey="balance" stroke="#94a3b8" fill="url(#colorStd)" strokeWidth={2} strokeDasharray="8 6" animationDuration={1000} isAnimationActive={false} />
                        <Area type="monotone" dataKey="acceleratedBalance" stroke="#4f46e5" fill="url(#colorAcc)" strokeWidth={5} animationDuration={1500} isAnimationActive={false} />
                        {inputs.isStressTestEnabled && (
                            <ReferenceLine x={milestonePeriod} stroke="#f43f5e" strokeDasharray="10 5" strokeWidth={2}>
                                <Label value="RENEWAL PULSE" position="top" fill="#f43f5e" fontSize={8} fontWeight="900" className="uppercase" />
                            </ReferenceLine>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
