import { Transaction, CockpitBaseline, Asset, DebtEntry, ExchangeRates, Investment, Trade } from '../../types';
import { calculateDashboardAggregates } from '../dashboard/dashboardService';
import { FinancialEngine } from '../math/FinancialEngine';

/**
 * Helper to determine if a category name represents an archived year snapshot.
 * These are identified by being a 4-digit numeric string (e.g., '2023').
 */
const isArchiveYear = (cat: string): boolean => {
    return /^\d{4}$/.test(cat);
};

/**
 * Processes the Unified Timeline to establish a "Typical Month" baseline.
 * Refined to handle sparse history by distinguishing between Ledger Months and Snapshot Months.
 */
export const extractCockpitBaseline = (
    timeline: Transaction[],
    assets: Asset[],
    debtEntries: DebtEntry[],
    exchangeRates: ExchangeRates,
    reconciledInvestments: Investment[],
    livePrices: Record<string, number>,
    trades: Trade[]
): CockpitBaseline => {
    // 1. Establish Wealth Seeds
    const { totalInvestments, totalCash } = calculateDashboardAggregates(
        assets, 
        debtEntries, 
        exchangeRates,
        reconciledInvestments,
        livePrices,
        trades
    );

    // 2. Identify Window
    const now = new Date();
    const startWindow = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const startISO = startWindow.toISOString().split('T')[0];

    const monthKeys: string[] = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(startWindow.getFullYear(), startWindow.getMonth() + i, 1);
        monthKeys.push(d.toISOString().substring(0, 7));
    }

    const windowTransactions = timeline.filter(t => t.date >= startISO);

    // 3. Group Amounts & Track Month Types
    const groups: Record<string, Record<string, Record<string, number>>> = { INCOME: {}, EXPENSE: {} };
    const monthIsLedger: Record<string, boolean> = {};

    windowTransactions.forEach(t => {
        const monthKey = t.date.substring(0, 7);
        const type = t.type;
        const cat = t.category || 'Uncategorized';

        if (!isArchiveYear(cat)) {
            monthIsLedger[monthKey] = true;
        }

        if (!groups[type][cat]) groups[type][cat] = {};
        groups[type][cat][monthKey] = (groups[type][cat][monthKey] || 0) + t.amount;
    });

    // 4. Calculate Baselines
    const baselineIncome: Record<string, number> = {};
    const baselineExpense: Record<string, number> = {};

    const calculateSmartMedian = (monthlyMap: Record<string, number>, isSpecial: boolean) => {
        if (isSpecial) {
            const values = monthKeys.map(key => monthlyMap[key] || 0);
            return FinancialEngine.median(values);
        }

        const activeKeys = monthKeys.filter(key => monthIsLedger[key]);
        if (activeKeys.length === 0) return 0;
        
        const values = activeKeys.map(key => monthlyMap[key] || 0);
        return FinancialEngine.median(values);
    };

    Object.entries(groups.INCOME).forEach(([cat, monthlyMap]) => {
        baselineIncome[cat] = calculateSmartMedian(monthlyMap, isArchiveYear(cat));
    });

    Object.entries(groups.EXPENSE).forEach(([cat, monthlyMap]) => {
        baselineExpense[cat] = calculateSmartMedian(monthlyMap, false);
    });

    return {
        income: baselineIncome,
        expenses: baselineExpense,
        totalInvestments,
        totalCash
    };
};
