import { Asset, NetWorthEntry, ExchangeRates, IncomeEntry, ExpenseEntry, TimeFocus, DebtEntry, CustomDateRange, Investment, Trade } from '../../types';
import { convertToBase } from '../currencyService';
import { getAssetMajorClass, AssetMajorClass, isAssetManagedByLiveFeed, isTickerCashEquivalent } from '../domain/classificationHub';
import { isSafeKey } from '../deterministicUtils';
import { isDateInWindow } from '../temporalService';
// Fix: Use FinancialEngine directly for attribution logic
import { FinancialEngine } from '../math/FinancialEngine';
import { resolveTickerPrice, calculateValuation } from '../domain/valuationEngine';

export const calculateDashboardAggregates = (
    assets: Asset[], 
    debtEntries: DebtEntry[] = [], 
    exchangeRates: ExchangeRates,
    reconciledInvestments: Investment[] = [],
    livePrices: Record<string, number> = {},
    trades: Trade[] = []
) => {
    let totalGrossAssets = 0;
    let totalLiabilities = 0;
    let totalLiquidity = 0;
    const groups: Record<string, number> = {};
    
    let livePortfolioTotal = 0;
    reconciledInvestments.forEach(holding => {
        const { price, isLive } = resolveTickerPrice(holding.ticker, livePrices, trades, holding.currentPrice);
        const valuation = calculateValuation(holding.quantity, price, holding.marketValue, isLive, holding.nativeCurrency, exchangeRates);
        livePortfolioTotal += valuation.baseValue;
        if (isTickerCashEquivalent(holding.ticker)) totalLiquidity += valuation.baseValue;
    });

    assets.forEach(asset => {
        const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
        const majorClass = getAssetMajorClass(asset);
        const type = asset.type || 'Other';
        if (baseVal < 0 || majorClass === AssetMajorClass.LIABILITY) { totalLiabilities += Math.abs(baseVal); return; }
        if (isAssetManagedByLiveFeed(asset)) return;
        totalGrossAssets += baseVal;
        if (majorClass === AssetMajorClass.CASH) totalLiquidity += baseVal;
        if (isSafeKey(type)) groups[type] = (groups[type] || 0) + baseVal;
    });

    const today = new Date().toISOString().split('T')[0];
    const latestDebtLogBalance = (debtEntries && debtEntries.length > 0) 
        ? (debtEntries.filter(d => (d.date || '') <= today).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.amountOwed || 0) : 0;

    const netWorth = (totalGrossAssets + livePortfolioTotal) - (totalLiabilities + latestDebtLogBalance);
    if (livePortfolioTotal > 0) groups['Managed Investments'] = (groups['Managed Investments'] || 0) + livePortfolioTotal;

    return { 
        netWorth, 
        totalInvestments: livePortfolioTotal, 
        totalCash: totalLiquidity,
        allocationData: Object.entries(groups).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
    };
};

export const resolveAttribution = (currentNW: number, history: NetWorthEntry[], incomeData: IncomeEntry[], expenseData: ExpenseEntry[], timeFocus: TimeFocus, customRange?: CustomDateRange, contextYear?: number) => {
    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const startEntry = sortedHistory.find(h => isDateInWindow(h.date, timeFocus, customRange, contextYear)) || sortedHistory[0];
    // Fix: Updated call to use static member of FinancialEngine
    return FinancialEngine.calculateNetWorthAttribution(currentNW, startEntry?.value || 0, incomeData, expenseData, startEntry?.date || '');
};

export const processNetIncomeTrend = (incomeData: IncomeEntry[], expenseData: ExpenseEntry[], year: number) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yearStr = String(year);
  return months.map((m, idx) => {
    const monthKey = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
    const monthIncome = incomeData.filter(d => d.date.startsWith(monthKey)).reduce((sum, d) => sum + (d.amount || 0), 0);
    const monthExpense = expenseData.filter(d => d.date.startsWith(monthKey)).reduce((sum, d) => sum + (d.total || 0), 0);
    return { monthStr: `${m}-${yearStr.slice(-2)}`, date: `${monthKey}-01`, income: monthIncome, expense: monthExpense };
  });
};