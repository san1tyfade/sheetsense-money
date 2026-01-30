import { useMemo } from 'react';
import { Investment, Trade, ExchangeRates } from '../types';
import { normalizeTicker } from '../services/parsers/parserUtils';
import { resolveTickerPrice, calculateValuation } from '../services/domain/valuationEngine';

export interface ValuatedHolding extends Investment {
  price: number;
  isLive: boolean;
  baseValue: number;
  nativeValue: number;
}

/**
 * useValuatedHoldings
 * Performs deep reconciliation and multi-currency valuation of the investment pool.
 * Memoized against data and price changes to ensure O(1) rendering.
 */
export function useValuatedHoldings(
    holdings: Investment[],
    trades: Trade[],
    livePrices: Record<string, number>,
    rates: ExchangeRates
) {
    const tradesByTicker = useMemo(() => {
        const map = new Map<string, Trade[]>();
        trades.forEach(t => {
            const ticker = normalizeTicker(t.ticker);
            if (!map.has(ticker)) map.set(ticker, []);
            map.get(ticker)?.push(t);
        });
        return map;
    }, [trades]);

    return useMemo(() => {
        return holdings.map(h => {
            const normTicker = normalizeTicker(h.ticker);
            const { price, isLive } = resolveTickerPrice(
                normTicker, 
                livePrices, 
                tradesByTicker.get(normTicker) || [], 
                h.currentPrice
            );
            const valuation = calculateValuation(
                h.quantity, 
                price, 
                h.marketValue, 
                isLive, 
                h.nativeCurrency, 
                rates
            );

            return {
                ...h,
                price,
                isLive,
                baseValue: valuation.baseValue,
                nativeValue: valuation.nativeValue
            } as ValuatedHolding;
        });
    }, [holdings, livePrices, tradesByTicker, rates]);
}