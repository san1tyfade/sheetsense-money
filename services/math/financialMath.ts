import { IncomeEntry, ExpenseEntry } from '../../types';
import { FinancialEngine } from './FinancialEngine';

/**
 * Standardized period-based burn calculation.
 * Delegated to FinancialEngine for precision rounding.
 */
export const calculateMonthlyBurn = (cost: number, period: string): number => {
    const p = period.toLowerCase();
    let monthly = 0;
    if (p === 'monthly') monthly = cost;
    else if (p === 'yearly') monthly = cost / 12;
    else if (p === 'weekly') monthly = cost * 4.33;
    
    return FinancialEngine.round(monthly);
};

/**
 * MONEY-WEIGHTED RETURN (DIETZ)
 * Delegated to FinancialEngine.
 */
export const calculateDietzReturn = (
  startValue: number,
  endValue: number,
  netFlow: number
) => FinancialEngine.dietz(startValue, endValue, netFlow);

/**
 * RISK METRIC: MAX DRAWDOWN
 * Delegated to FinancialEngine.
 */
export const calculateMaxDrawdown = (data: { totalValue: number }[]) => 
    FinancialEngine.maxDrawdown(data);

/**
 * GROWTH VELOCITY ($ per day)
 * Delegated to FinancialEngine.
 */
export const calculateGrowthVelocity = (data: { date: string; totalValue: number }[]): number => {
  if (data.length < 2) return 0;
  const start = data[0];
  const end = data[data.length - 1];
  const days = Math.max(1, (new Date(end.date).getTime() - new Date(start.date).getTime()) / (1000 * 60 * 60 * 24));
  return FinancialEngine.velocity(start.totalValue, end.totalValue, days);
};

/**
 * NET WORTH ATTRIBUTION
 * Calculates the delta between capital injections and market movement.
 */
export const calculateNetWorthAttribution = (
  currentNW: number,
  startValue: number,
  incomeData: IncomeEntry[],
  expenseData: ExpenseEntry[],
  anchorISO: string
) => {
  const periodIncome = incomeData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  
  const periodExpense = expenseData
    .filter(d => d.date >= anchorISO)
    .reduce((acc, d) => acc + (d.total || 0), 0);

  const netSavings = periodIncome - periodExpense;
  const { gain, percentage } = FinancialEngine.dietz(startValue, currentNW, netSavings);

  return {
    startValue,
    endValue: currentNW,
    netContributions: netSavings,
    marketGain: gain,
    percentageReturn: percentage
  };
};

/**
 * PERIOD TOTALS ENGINE
 * Standardized logic for YTD and Annual aggregations.
 */
export const calculatePeriodTotals = (
  incomeData: IncomeEntry[], 
  expenseData: ExpenseEntry[], 
  year: number
) => {
  const isCurrentYear = year === new Date().getFullYear();
  const todayISO = new Date().toISOString().split('T')[0];

  const incFiltered = incomeData.filter(d => d.date.startsWith(String(year)));
  const expFiltered = expenseData.filter(d => d.date.startsWith(String(year)));

  const ytdInc = incFiltered
    .filter(d => !isCurrentYear || d.date <= todayISO)
    .reduce((s, d) => s + (d.amount || 0), 0);

  const ytdExp = expFiltered
    .filter(d => !isCurrentYear || d.date <= todayISO)
    .reduce((s, d) => s + (d.total || 0), 0);

  const totalInc = incFiltered.reduce((s, d) => s + (d.amount || 0), 0);
  // Fix: Changed d.amount to d.total for ExpenseEntry which does not have amount property
  const totalExp = expFiltered.reduce((s, d) => s + (d.total || 0), 0);

  const savings = ytdInc - ytdExp;
  const rate = ytdInc > 0 ? (savings / ytdInc) * 100 : 0;

  return { ytdInc, ytdExp, totalInc, totalExp, savings, rate };
};