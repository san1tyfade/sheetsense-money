import React, { memo, useMemo } from 'react';
import { Investment, Trade, ExchangeRates } from '../../types';
import { Layers, X, Zap } from 'lucide-react';
import { normalizeTicker } from '../../services/deterministicUtils';
import { resolveTickerPrice as resolveCurrentPrice, calculateValuation as calculateHoldingValue, calculateSyntheticAvgPrice } from '../../services/domain/valuationEngine';
import { formatBaseCurrency, formatNativeCurrency, convertToBase, PRIMARY_CURRENCY, getCurrencyFlag } from '../../services/currencyService';
import { PrivacyValue } from '../core-ui/PrivacyValue';

interface AccountBreakdownProps {
    name: string;
    items: Investment[];
    livePrices: Record<string, number>;
    tradesByTicker: Map<string, Trade[]>;
    exchangeRates: ExchangeRates;
    isLoading: boolean;
    onClose: () => void;
}

export const AccountBreakdown = memo(({ name, items, livePrices, tradesByTicker, exchangeRates, isLoading, onClose }: AccountBreakdownProps) => {
    
    const groupTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const normTicker = normalizeTicker(item.ticker);
            const { price, isLive } = resolveCurrentPrice(normTicker, livePrices, tradesByTicker.get(normTicker) || [], item.currentPrice);
            return sum + calculateHoldingValue(item.quantity, price, item.marketValue, isLive, item.nativeCurrency, exchangeRates).baseValue;
        }, 0);
    }, [items, livePrices, tradesByTicker, exchangeRates]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{name}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Holding Breakdown (All figures in CAD)</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl shadow-sm">
                        {isLoading ? <div className="h-6 w-24 bg-slate-200 dark:bg-slate-600/50 rounded animate-pulse" /> : <PrivacyValue value={groupTotal} />}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker / Asset</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Cost (CAD)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price (CAD)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (CAD)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Realized Gain</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {items.map((inv) => {
                                const normTicker = normalizeTicker(inv.ticker);
                                const trades = tradesByTicker.get(normTicker) || [];
                                
                                // Resolve Native Stats
                                const { price: nativePrice, isLive } = resolveCurrentPrice(normTicker, livePrices, trades, inv.currentPrice);
                                const nativeAvgPrice = calculateSyntheticAvgPrice(normTicker, trades, inv.avgPrice, inv.quantity);
                                
                                const nativeCurrency = inv.nativeCurrency || PRIMARY_CURRENCY;
                                const isForeign = nativeCurrency !== PRIMARY_CURRENCY;
                                
                                // Convert to CAD
                                const priceCAD = convertToBase(nativePrice, nativeCurrency, exchangeRates);
                                const valCAD = calculateHoldingValue(inv.quantity, nativePrice, inv.marketValue, isLive, nativeCurrency, exchangeRates).baseValue;
                                const avgCostCAD = convertToBase(nativeAvgPrice, nativeCurrency, exchangeRates);
                                const totalCostCAD = inv.quantity * avgCostCAD;
                                
                                const gain = valCAD - totalCostCAD;
                                const gainPct = totalCostCAD > 0 ? ((gain / totalCostCAD) * 100) : 0;

                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs font-black text-slate-400 relative">
                                                    {normTicker.charAt(0)}
                                                    <span className="absolute -bottom-1 -right-1 text-xs">{getCurrencyFlag(nativeCurrency)}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                                                        {normTicker} 
                                                        {isLive && <Zap size={10} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{inv.name !== inv.ticker ? inv.name : inv.assetClass}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right text-slate-600 dark:text-slate-300 font-mono text-sm">
                                            <PrivacyValue value={inv.quantity} format="number" precision={4} />
                                        </td>
                                        <td className="p-6 text-right text-slate-500 dark:text-slate-400 font-mono text-sm group/native relative">
                                            <PrivacyValue value={avgCostCAD} />
                                            {isForeign && (
                                                <div className="absolute top-full right-6 mt-1 hidden group-hover/native:block bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-2xl z-50 border border-slate-700 whitespace-nowrap">
                                                    Native ACB: {formatNativeCurrency(nativeAvgPrice, nativeCurrency)}
                                                </div>
                                            )}
                                        </td>
                                        <td className={`p-6 text-right font-black font-mono text-sm group/price relative ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                            <div className="flex flex-col items-end">
                                                <PrivacyValue value={priceCAD} />
                                                {isForeign && (
                                                    <>
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${isLive ? 'opacity-80' : 'opacity-50'}`}>Converted</span>
                                                        <div className="absolute top-full right-6 mt-1 hidden group-hover/price:block bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-2xl z-50 border border-slate-700 whitespace-nowrap">
                                                            {isLive ? 'Live' : 'Last'} Native Quote: {formatNativeCurrency(nativePrice, nativeCurrency)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`p-6 text-right font-black font-mono text-sm ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                            <PrivacyValue value={valCAD} />
                                        </td>
                                        <td className={`p-6 text-right font-bold font-mono text-sm ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                            <div className="flex flex-col items-end">
                                                <PrivacyValue value={gain} />
                                                <PrivacyValue value={gainPct} format="percent" precision={2} className="text-[10px] opacity-70" />
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
    );
});
