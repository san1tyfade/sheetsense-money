import { Wallet, ArrowUpRight, LayoutGrid, Coins } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { Trade } from '../types';
import { normalizeTicker, detectTickerCurrency } from '../services/parsers/parserUtils';
import { convertToBase, PRIMARY_CURRENCY } from '../services/currencyService';
import { resolveTickerPrice as resolveCurrentPrice, calculateValuation as calculateHoldingValue } from '../services/domain/valuationEngine';
import { InvestmentAllocationCard } from './investments/InvestmentAllocationCard';
import { HoldingsTable } from './investments/HoldingsTable';
import { AccountBreakdown } from './investments/AccountBreakdown';
import { useFinancialStore } from '../context/FinancialContext';
import { ViewHeader } from './core-ui/ViewHeader';
import { isCryptoAsset } from '../services/domain/classificationHub';

export const InvestmentsList: React.FC = () => {
  const store = useFinancialStore();
  const { 
    reconciledInvestments: allInvestments, assets, trades, 
    isSyncing: isLoading, rates: exchangeRates, 
    livePrices 
  } = store;

  const [selectedContext, setSelectedContext] = useState<string | 'TOTAL' | 'CRYPTO' | null>(null);

  const tradesByTicker = useMemo(() => {
      const map = new Map<string, Trade[]>();
      trades.forEach(t => {
          const ticker = normalizeTicker(t.ticker);
          if (ticker === 'UNKNOWN') return;
          if (!map.has(ticker)) map.set(ticker, []);
          map.get(ticker)?.push(t);
      });
      return map;
  }, [trades]);

  const aggregatedHoldings = useMemo(() => {
    const map = new Map<string, { ticker: string, quantity: number, price: number, totalValue: number, nativeTotalValue: number, isLive: boolean, nativeCurrency: string, assetClass: string }>();
    
    allInvestments.forEach(inv => {
        const normTicker = normalizeTicker(inv.ticker);
        const currency = inv.nativeCurrency || detectTickerCurrency(normTicker, inv.accountName);
        const key = `${normTicker}|${currency}`;
        
        const { price, isLive } = resolveCurrentPrice(normTicker, livePrices, tradesByTicker.get(normTicker) || [], inv.currentPrice);
        const valuation = calculateHoldingValue(inv.quantity, price, inv.marketValue, isLive, currency, exchangeRates);
        
        const nativeTotalVal = valuation.nativeValue;
        
        if (!map.has(key)) {
            map.set(key, { 
                ticker: normTicker, quantity: 0, price, totalValue: 0, nativeTotalValue: 0, isLive, 
                nativeCurrency: currency, assetClass: inv.assetClass || 'Other'
            });
        }
        
        const entry = map.get(key)!;
        entry.quantity += inv.quantity;
        entry.totalValue += valuation.baseValue;
        entry.nativeTotalValue += nativeTotalVal;
    });
    return Array.from(map.values())
        .filter(h => Math.abs(h.quantity) > 0.000001 || h.totalValue > 0.01)
        .sort((a, b) => b.totalValue - a.totalValue);
  }, [allInvestments, livePrices, tradesByTicker, exchangeRates]);

  const cryptoTotal = useMemo(() => {
      return aggregatedHoldings
        .filter(h => isCryptoAsset(h.ticker, h.assetClass))
        .reduce((sum, h) => sum + h.totalValue, 0);
  }, [aggregatedHoldings]);

  const accountAllocations = useMemo(() => {
      const groups: Record<string, number> = {};
      allInvestments.forEach(inv => {
          const normTicker = normalizeTicker(inv.ticker);
          const currency = inv.nativeCurrency || detectTickerCurrency(normTicker, inv.accountName);
          const { price, isLive } = resolveCurrentPrice(normTicker, livePrices, tradesByTicker.get(normTicker) || [], inv.currentPrice);
          const val = calculateHoldingValue(inv.quantity, price, inv.marketValue, isLive, currency, exchangeRates).baseValue;
          const acc = (inv.accountName || 'Primary Node').trim();
          
          // PREVENT DUPLICATION: If the account name itself is "Crypto" or "Crypto Core", 
          // we exclude it from the dynamic account cards list because the aggregate 
          // 'Crypto Core' summary card already represents this bucket.
          const isGenericCryptoContainer = ['CRYPTO', 'CRYPTO CORE', 'DIGITAL ASSETS'].includes(acc.toUpperCase());
          if (isGenericCryptoContainer) return;

          groups[acc] = (groups[acc] || 0) + val;
      });
      return Object.entries(groups)
        .filter(([_, val]) => val > 0.01)
        .sort((a, b) => b[1] - a[1]);
  }, [allInvestments, livePrices, tradesByTicker, exchangeRates]);

  const netWorth = assets.reduce((sum, item) => sum + convertToBase(item.value, item.currency, exchangeRates), 0);
  const totalPortfolioValue = aggregatedHoldings.reduce((sum, h) => sum + h.totalValue, 0);

  const renderBreakdownContent = (context: string) => {
    if (context === 'TOTAL') {
        return <HoldingsTable holdings={aggregatedHoldings} onClose={() => setSelectedContext(null)} />;
    }
    if (context === 'CRYPTO') {
        const cryptoItems = aggregatedHoldings.filter(h => isCryptoAsset(h.ticker, h.assetClass));
        return <HoldingsTable holdings={cryptoItems} onClose={() => setSelectedContext(null)} />;
    }
    const filteredItems = allInvestments.filter(i => {
        const name = (i.accountName || 'Primary Node').trim();
        return name.toUpperCase() === context.toUpperCase();
    });
    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 py-4">
            <AccountBreakdown 
                name={context} items={filteredItems} 
                livePrices={livePrices} tradesByTicker={tradesByTicker} 
                exchangeRates={exchangeRates}
                isLoading={isLoading} onClose={() => setSelectedContext(null)}
            />
        </div>
    );
  };

  return (
    <div className="space-y-12 animate-fade-in pb-24 tabular-nums">
      <ViewHeader 
        title="Portfolio"
        titleAccent="Core"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        <InvestmentAllocationCard 
            title="Aggregated Exposure" value={totalPortfolioValue} total={netWorth} icon={ArrowUpRight} 
            colorClass="text-blue-500" isLoading={isLoading} 
            isSelected={selectedContext === 'TOTAL'} onClick={() => setSelectedContext(prev => prev === 'TOTAL' ? null : 'TOTAL')}
        />
        
        {cryptoTotal > 0 && (
            <InvestmentAllocationCard 
                title="Crypto Core" value={cryptoTotal} total={netWorth} icon={Coins} 
                colorClass="text-orange-500" isLoading={isLoading} 
                isSelected={selectedContext === 'CRYPTO'} onClick={() => setSelectedContext(prev => prev === 'CRYPTO' ? null : 'CRYPTO')}
            />
        )}

        {accountAllocations.slice(0, cryptoTotal > 0 ? 2 : 3).map(([accName, accValue]) => (
            <InvestmentAllocationCard 
                key={accName} title={accName} value={accValue} total={netWorth} icon={Wallet} 
                colorClass="text-blue-400" isLoading={isLoading} isSelected={selectedContext === accName}
                onClick={() => setSelectedContext(prev => prev === accName ? null : accName)}
            />
        ))}
      </div>

      <div className="min-h-[400px] px-2">
          {selectedContext ? renderBreakdownContent(selectedContext) : (
              <div className="flex flex-col items-center justify-center py-32 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900/10">
                   <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl mb-6 shadow-inner">
                      <LayoutGrid size={48} className="opacity-20" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">Select source node for distribution drilldown</p>
              </div>
          )}
      </div>
    </div>
  );
};