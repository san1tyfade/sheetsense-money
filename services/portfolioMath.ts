import { PortfolioLogEntry, ProcessedPortfolioEntry, TimeFocus, CustomDateRange, Trade } from '../types';
import { isDateInWindow } from './temporalService';
import { FinancialEngine } from './math/FinancialEngine';

/**
 * Transforms raw portfolio logs into processed entries suitable for charting.
 */
export const processPortfolioHistory = (
  history: PortfolioLogEntry[],
  focus: TimeFocus,
  customRange?: CustomDateRange,
  selectedYear?: number
): { data: ProcessedPortfolioEntry[], accountKeys: string[] } => {
  if (!history || history.length === 0) {
    return { data: [], accountKeys: [] };
  }

  const accountKeysSet = new Set<string>();
  history.forEach(entry => {
    Object.keys(entry.accounts).forEach(key => {
        if (key && key.trim() !== '') accountKeysSet.add(key);
    });
  });
  const accountKeys = Array.from(accountKeysSet).sort();

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = sorted.filter(entry => isDateInWindow(entry.date, focus, customRange, selectedYear));
  
  if (filtered.length === 0) {
    return { data: [], accountKeys };
  }

  const anchorEntry = filtered[0];
  const anchorTotal = Object.values(anchorEntry.accounts).reduce((sum, val) => sum + (val || 0), 0);

  const processed: ProcessedPortfolioEntry[] = filtered.map(entry => {
    const totalValue = Object.values(entry.accounts).reduce((sum, val) => sum + (val || 0), 0);
    const percentChange = anchorTotal > 0 ? ((totalValue - anchorTotal) / anchorTotal) * 100 : 0;
    
    return {
      ...entry,
      totalValue,
      percentChange
    };
  });

  return {
    data: processed,
    accountKeys
  };
};

/**
 * Calculates investment performance attribution using snapshots.
 */
export const calculatePortfolioAttribution = (
    data: ProcessedPortfolioEntry[],
    trades: Trade[],
    focus: TimeFocus,
    customRange?: CustomDateRange,
    overrideEndValue?: number,
    selectedYear?: number
) => {
    if (data.length < 1) return null;

    const start = data[0];
    const end = data[data.length - 1];
    
    const startValue = start.totalValue;
    const endValue = overrideEndValue !== undefined ? overrideEndValue : end.totalValue;
    const totalGrowth = endValue - startValue;

    const windowTrades = trades.filter(t => isDateInWindow(t.date, focus, customRange, selectedYear));
    
    let contributions = 0;
    windowTrades.forEach(t => {
        const amt = Math.abs(t.total || 0);
        if (t.type === 'BUY') contributions += amt;
        else if (t.type === 'SELL') contributions -= amt;
    });

    const marketAlpha = totalGrowth - contributions;

    return {
        startValue,
        endValue,
        totalGrowth,
        contributions,
        marketAlpha,
        alphaPercentage: startValue > 0 ? (marketAlpha / startValue) * 100 : 0
    };
};