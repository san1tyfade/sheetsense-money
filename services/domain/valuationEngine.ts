import { Trade, Investment, ExchangeRates } from '../../types';
import { normalizeTicker } from '../parsers/parserUtils';
import { convertToBase, PRIMARY_CURRENCY } from '../currencyService';

export interface ValuationResult {
  nativeValue: number;
  baseValue: number;
  price: number;
  isLive: boolean;
  currency: string;
}

/**
 * Resolves the most accurate price for a ticker based on live quotes, 
 * falling back to trade history or manual sheet values.
 */
export const resolveTickerPrice = (
  ticker: string,
  livePrices: Record<string, number>,
  trades: Trade[],
  fallbackPrice: number = 0
): { price: number; isLive: boolean } => {
  const norm = normalizeTicker(ticker);
  
  // 1. Priority: Live Market Quote
  if (livePrices[norm]) {
    return { price: livePrices[norm], isLive: true };
  }

  // 2. Secondary: Most Recent Trade Price for THIS Ticker
  if (trades && trades.length > 0) {
    const tickerTrades = trades.filter(t => normalizeTicker(t.ticker) === norm);
    if (tickerTrades.length > 0) {
        const tradeWithPrice = tickerTrades.find(t => (t.marketPrice || 0) > 0);
        if (tradeWithPrice) return { price: tradeWithPrice.marketPrice!, isLive: false };
        if (tickerTrades[0].price) return { price: Math.abs(tickerTrades[0].price), isLive: false };
    }
  }

  // 3. Fallback: Price column from spreadsheet
  return { price: fallbackPrice, isLive: false };
};

/**
 * Calculates a synthetic Average Cost Base (ACB) using weighted buys.
 */
export const calculateSyntheticAvgPrice = (
    ticker: string,
    trades: Trade[],
    sheetAvgPrice: number = 0,
    sheetQuantity: number = 0
): number => {
    const norm = normalizeTicker(ticker);
    const buys = trades.filter(t => normalizeTicker(t.ticker) === norm && t.type === 'BUY');
    
    if (buys.length === 0) return sheetAvgPrice;

    let totalCost = 0;
    let totalQty = 0;
    
    buys.forEach(b => {
        totalQty += Math.abs(b.quantity);
        totalCost += Math.abs(b.total || (b.quantity * b.price));
    });

    return totalQty > 0 ? (totalCost / totalQty) : sheetAvgPrice;
};

/**
 * Calculates standardized valuation for any financial holding.
 * Behavior: Strictly uses (Quantity * Price) to calculate total value.
 */
export const calculateValuation = (
  quantity: number,
  price: number,
  manualMarketValue: number = 0, 
  isLive: boolean,
  currency: string = PRIMARY_CURRENCY,
  rates?: ExchangeRates
): ValuationResult => {
  if (Math.abs(quantity) < 0.000001) {
    return { nativeValue: 0, baseValue: 0, price, isLive, currency };
  }

  const nativeValue = quantity * price;
  const baseValue = convertToBase(nativeValue, currency, rates);

  return {
    nativeValue,
    baseValue,
    price,
    isLive,
    currency
  };
};
