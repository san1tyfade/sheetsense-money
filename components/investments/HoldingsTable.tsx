import React, { memo } from 'react';
import { LayoutGrid, X, Zap, Info, Landmark, Globe } from 'lucide-react';
import { formatBaseCurrency, formatNativeCurrency, getCurrencyFlag, PRIMARY_CURRENCY } from '../../services/currencyService';
import { PrivacyValue } from '../core-ui/PrivacyValue';

interface AggregatedHolding {
    ticker: string;
    quantity: number;
    price: number;
    totalValue: number;
    nativeTotalValue: number;
    isLive: boolean;
    nativeCurrency?: string;
}

interface HoldingsTableProps {
    holdings: AggregatedHolding[];
    onClose: () => void;
}

export const HoldingsTable = memo(({ holdings, onClose }: HoldingsTableProps) => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6">
                <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-600/20">
                    <LayoutGrid size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Aggregated Inventory</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-3">Global Reconciled Asset Registry (ALL VALUES IN CAD)</p>
                </div>
            </div>
            <button onClick={onClose} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 transition-all active:scale-95 shadow-sm">
                <X size={24} />
            </button>
        </div>
        
        <div className="overflow-hidden rounded-[3rem] border-2 border-slate-950 dark:border-slate-700 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-950 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        <tr>
                            <th className="px-10 py-6">Instrument Identifier</th>
                            <th className="px-10 py-6 text-right">Inventory Depth</th>
                            <th className="px-10 py-6 text-right">Spot Valuation (CAD)</th>
                            <th className="px-10 py-6 text-right">Node Equity (CAD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                        {holdings.map((h) => {
                            const nativeCurrency = h.nativeCurrency || 'CAD';
                            const priceCAD = h.quantity > 0 ? h.totalValue / h.quantity : 0;
                            const isForeign = nativeCurrency !== PRIMARY_CURRENCY;
    
                            return (
                                <tr key={`${h.ticker}-${h.nativeCurrency}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition-colors tabular-nums">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-sm text-slate-400 font-black relative overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                {h.ticker.charAt(0)}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-900 text-xl">
                                                    {getCurrencyFlag(nativeCurrency)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3 font-black text-slate-900 dark:text-white text-base tracking-widest uppercase">
                                                    {h.ticker}
                                                    {h.isLive && (
                                                        <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_currentColor]" />
                                                            <span className="text-[8px]">LIVE</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Asset Class: {nativeCurrency}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <p className="font-mono font-black text-slate-900 dark:text-white text-base">
                                            <PrivacyValue value={h.quantity} format="number" precision={h.quantity < 1 ? 4 : 2} />
                                        </p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Units</p>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className={`font-mono font-black text-base ${h.isLive ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <PrivacyValue value={priceCAD} />
                                            </p>
                                            {isForeign && (
                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                                    <PrivacyValue value={h.price} format="native" currency={nativeCurrency} /> Native
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex flex-col items-end">
                                            <p className={`font-mono font-black text-base ${h.isLive ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                <PrivacyValue value={h.totalValue} />
                                            </p>
                                            {isForeign && (
                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                                    <PrivacyValue value={h.nativeTotalValue} format="native" currency={nativeCurrency} /> Native
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
));