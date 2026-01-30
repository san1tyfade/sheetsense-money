import React, { memo, useState, useMemo } from 'react';
import { Asset, DebtEntry, BankAccount, ExchangeRates, Investment, Trade } from '../../types';
import { formatBaseCurrency, convertToBase } from '../../services/currencyService';
import { getAssetMajorClass, AssetMajorClass, isAssetManagedByLiveFeed } from '../../services/domain/classificationHub';
import { resolveTickerPrice, calculateValuation } from '../../services/domain/valuationEngine';
import { PrivacyValue } from '../core-ui/PrivacyValue';
import { useFinancialStore } from '../../context/FinancialContext';

interface WealthDriversCardProps {
    assets: Asset[];
    debtEntries: DebtEntry[];
    accounts: BankAccount[];
    exchangeRates?: ExchangeRates;
    isLoading: boolean;
    reconciledInvestments?: Investment[];
    livePrices?: Record<string, number>;
    trades?: Trade[];
}

type ViewMode = 'Totals' | 'Percent';

export const WealthDriversCard = memo(({ 
    assets, debtEntries, exchangeRates, isLoading, 
    reconciledInvestments = [], livePrices = {}, trades = [] 
}: WealthDriversCardProps) => {
    const { densityMode } = useFinancialStore();
    const isCompact = densityMode === 'COMPACT';
    const [viewMode, setViewMode] = useState<ViewMode>('Totals');

    const processedData = useMemo(() => {
        const assetGroups: Record<string, number> = {
            'Real Estate': 0,
            'Investments': 0,
            'Cash & Liquid': 0,
            'Vehicles': 0,
            'Other': 0
        };

        const liabilityGroups: Record<string, number> = {
            'Mortgages & Loans': 0,
            'Credit Cards': 0
        };

        // 1. Process Live Portfolio (Investments tab)
        reconciledInvestments.forEach(holding => {
            const { price, isLive } = resolveTickerPrice(holding.ticker, livePrices, trades, holding.currentPrice);
            const { baseValue } = calculateValuation(holding.quantity, price, holding.marketValue, isLive, holding.nativeCurrency, exchangeRates);
            assetGroups['Investments'] += baseValue;
        });

        // 2. Process External Debt Log (Strict Today Filter)
        if (debtEntries && debtEntries.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const sorted = [...debtEntries]
                .filter(d => (d.date || '') <= today)
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            
            const latestDebt = sorted[0]?.amountOwed || 0;
            liabilityGroups['Mortgages & Loans'] += latestDebt;
        }

        // 3. Process Static Assets
        assets.forEach(a => {
            const val = convertToBase(a.value, a.currency, exchangeRates);
            const majorClass = getAssetMajorClass(a);
            const name = (a.name || '').toLowerCase();
            const type = (a.type || '').toLowerCase();

            if (val < 0 || majorClass === AssetMajorClass.LIABILITY) {
                if (type.includes('card') || name.includes('visa') || name.includes('amex') || name.includes('mastercard')) {
                    liabilityGroups['Credit Cards'] += Math.abs(val);
                } else {
                    liabilityGroups['Mortgages & Loans'] += Math.abs(val);
                }
                return;
            }

            if (isAssetManagedByLiveFeed(a)) return;

            if (majorClass === AssetMajorClass.FIXED) {
                // Precise word-boundary detection for vehicles to avoid matching "Scarborough" as "car"
                const vehicleRegex = /\b(car|auto|vehicle|truck|motorcycle|bike|santa fe|tesla|toyota|honda|ford)\b/i;
                const isVehicle = type.includes('vehicle') || type.includes('car') || vehicleRegex.test(name);
                
                if (isVehicle) assetGroups['Vehicles'] += val;
                else assetGroups['Real Estate'] += val;
            } else if (majorClass === AssetMajorClass.CASH) {
                assetGroups['Cash & Liquid'] += val;
            } else {
                assetGroups['Investments'] += val;
            }
        });

        const assetList = Object.entries(assetGroups)
            .filter(([_, v]) => v > 0.01)
            .map(([name, value]) => ({ name, value, color: getAssetColor(name) }))
            .sort((a, b) => b.value - a.value);

        const liabilityList = Object.entries(liabilityGroups)
            .filter(([_, v]) => v > 0.01)
            .map(([name, value]) => ({ name, value, color: getLiabilityColor(name) }))
            .sort((a, b) => b.value - a.value);

        return { assetList, liabilityList };
    }, [assets, debtEntries, exchangeRates, reconciledInvestments, livePrices, trades]);

    const totalAssets = useMemo(() => processedData.assetList.reduce((sum, c) => sum + c.value, 0), [processedData]);
    const totalLiabilities = useMemo(() => processedData.liabilityList.reduce((sum, c) => sum + c.value, 0), [processedData]);

    function getAssetColor(name: string) {
        if (name === 'Investments') return 'bg-blue-600';
        if (name === 'Real Estate') return 'bg-indigo-600';
        if (name === 'Cash & Liquid') return 'bg-emerald-500';
        if (name === 'Vehicles') return 'bg-amber-500';
        return 'bg-slate-400';
    }

    function getLiabilityColor(name: string) {
        if (name === 'Mortgages & Loans') return 'bg-rose-600';
        if (name === 'Credit Cards') return 'bg-orange-600';
        return 'bg-slate-400';
    }

    const renderValue = (val: number, total: number) => {
        if (viewMode === 'Percent') {
            const pct = total > 0 ? (val / total) * 100 : 0;
            return `${pct.toFixed(1)}%`;
        }
        return formatBaseCurrency(val).replace(/\.00$/, '');
    };

    return (
        <div className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm flex flex-col group transition-all duration-500 ss-card ${isCompact ? 'h-[380px] md:h-[450px]' : 'h-[500px] md:h-[600px]'}`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Allocation Matrix</h3>
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                    {(['Totals', 'Percent'] as ViewMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                viewMode === mode 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ss-gap)' }}>
                {/* Assets Cell */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Assets</h4>
                            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                                {isLoading ? '---' : <PrivacyValue value={totalAssets} />}
                            </p>
                        </div>
                    </div>
                    
                    <div className="h-3 md:h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-700/50 p-0.5">
                        {totalAssets > 0 ? processedData.assetList.map((cat) => (
                            <div 
                                key={cat.name} 
                                className={`${cat.color} transition-all duration-1000 border-r border-black/5 last:border-0 rounded-sm`} 
                                style={{ width: `${(cat.value / totalAssets) * 100}%` }}
                            />
                        )) : (
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-sm" />
                        )}
                    </div>

                    <div className={`grid grid-cols-1 gap-2 pt-1 ${isCompact ? '' : 'md:gap-3.5'}`}>
                        {processedData.assetList.map(cat => (
                            <div key={cat.name} className="flex items-center justify-between group/row">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-3 rounded-full ${cat.color}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/row:text-slate-900 dark:group-hover/row:text-white transition-colors truncate max-w-[120px]">
                                        {cat.name}
                                    </span>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white font-mono">
                                    {renderValue(cat.value, totalAssets)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Liabilities Cell */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Liabilities</h4>
                            <p className="text-2xl font-black text-rose-500 font-mono leading-none">
                                {isLoading ? '---' : <PrivacyValue value={totalLiabilities} />}
                            </p>
                        </div>
                    </div>
                    
                    <div className="h-3 md:h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-700/50 p-0.5">
                        {totalLiabilities > 0 ? processedData.liabilityList.map((cat) => (
                            <div 
                                key={cat.name} 
                                className={`${cat.color} transition-all duration-1000 border-r border-black/5 last:border-0 rounded-sm`} 
                                style={{ width: `${(cat.value / totalLiabilities) * 100}%` }}
                            />
                        )) : (
                            <div className="w-full bg-emerald-500/10 flex items-center justify-center text-[8px] font-black text-emerald-500 uppercase tracking-widest rounded-sm h-full">
                                Nominal Position
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 gap-2 pt-1 ${isCompact ? '' : 'md:gap-3.5'}`}>
                        {processedData.liabilityList.map(cat => (
                            <div key={cat.name} className="flex items-center justify-between group/row">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-3 rounded-full ${cat.color}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/row:text-slate-900 dark:group-hover/row:text-white transition-colors truncate max-w-[120px]">
                                        {cat.name}
                                    </span>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white font-mono">
                                    {renderValue(cat.value, totalLiabilities)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});