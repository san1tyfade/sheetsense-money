import { IncomeEntry, ExpenseEntry } from '../../types';
import { AppError, IEP } from '../infrastructure/ErrorHandler';

/**
 * FinancialEngine: The Sovereign Math Authority
 * Centralizes all statistical and financial primitives to prevent 
 * math drift across different application hubs.
 */
export class FinancialEngine {
    /**
     * Standardized Rounding Protocol
     */
    static round(value: number, precision: number = 2): number {
        const factor = Math.pow(10, precision);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    /**
     * Percentage Change calculation.
     */
    static change(current: number, previous: number): number | null {
        if (previous === 0) return null;
        return this.round(((current - previous) / Math.abs(previous)) * 100);
    }

    /**
     * Median Calculation
     */
    static median(values: number[]): number {
        if (!values || values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }

    /**
     * Standard Deviation
     */
    static stdDev(values: number[], mean?: number): number {
        if (!values || values.length < 2) return 0;
        const m = mean ?? (values.reduce((a, b) => a + b, 0) / values.length);
        const variance = values.reduce((a, b) => a + Math.pow(b - m, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Dietz Method (Money-Weighted Return)
     */
    static dietz(startValue: number, endValue: number, netFlow: number): { gain: number; percentage: number } {
        const gain = endValue - startValue - netFlow;
        const averageCapital = startValue + (netFlow / 2);
        
        if (Math.abs(averageCapital) < 0.01 && Math.abs(startValue) < 0.01) {
            return { gain: this.round(gain), percentage: 0 };
        }

        const percentage = Math.abs(averageCapital) > 1 
            ? (gain / Math.abs(averageCapital)) * 100 
            : (startValue > 0 ? (gain / startValue) * 100 : 0);
            
        if (isNaN(percentage) || Math.abs(percentage) > 1000000) {
            throw new AppError(IEP.DMN.VALUATION_OVERFLOW, "Valuation Logic reached an unstable state.", 'RECOVERABLE', { startValue, endValue, netFlow });
        }

        return { 
            gain: this.round(gain), 
            percentage: this.round(percentage, 4) 
        };
    }

    /**
     * Growth Velocity ($ per day)
     */
    static velocity(startValue: number, endValue: number, days: number): number {
        if (days <= 0) return 0;
        return this.round((endValue - startValue) / days);
    }

    /**
     * Growth Velocity ($ per day) for a series
     */
    static growthVelocity(series: { date: string; totalValue: number }[]): number {
        if (series.length < 2) return 0;
        const start = series[0];
        const end = series[series.length - 1];
        const days = (new Date(end.date).getTime() - new Date(start.date).getTime()) / (1000 * 60 * 60 * 24);
        return this.velocity(start.totalValue, end.totalValue, days);
    }

    /**
     * Max Drawdown
     */
    static maxDrawdown(series: { totalValue: number }[]): number {
        if (!series || series.length < 2) return 0;
        let maxDD = 0;
        let peak = series[0].totalValue;
        
        series.forEach(point => {
            if (point.totalValue > peak) peak = point.totalValue;
            const dd = peak > 0 ? ((point.totalValue - peak) / peak) * 100 : 0;
            if (dd < maxDD) maxDD = dd;
        });
        
        return this.round(maxDD, 2);
    }

    /**
     * Standardized period-based burn calculation.
     */
    static calculateMonthlyBurn(cost: number, period: string): number {
        const p = period.toLowerCase();
        let monthly = 0;
        if (p === 'monthly') monthly = cost;
        else if (p === 'yearly') monthly = cost / 12;
        else if (p === 'weekly') monthly = cost * 4.33;
        return this.round(monthly);
    }

    /**
     * NET WORTH ATTRIBUTION
     */
    static calculateNetWorthAttribution(
      currentNW: number,
      startValue: number,
      incomeData: IncomeEntry[],
      expenseData: ExpenseEntry[],
      anchorISO: string
    ) {
      const periodIncome = incomeData
        .filter(d => d.date >= anchorISO)
        .reduce((acc, d) => acc + (d.amount || 0), 0);
      
      const periodExpense = expenseData
        .filter(d => d.date >= anchorISO)
        .reduce((acc, d) => acc + (d.total || 0), 0);

      const netSavings = periodIncome - periodExpense;
      const { gain, percentage } = this.dietz(startValue, currentNW, netSavings);

      return {
        startValue,
        endValue: currentNW,
        netContributions: netSavings,
        marketGain: gain,
        percentageReturn: percentage
      };
    }

    /**
     * PERIOD TOTALS ENGINE
     */
    static calculatePeriodTotals(
      incomeData: IncomeEntry[], 
      expenseData: ExpenseEntry[], 
      year: number
    ) {
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
      const totalExp = expFiltered.reduce((s, d) => s + (d.total || 0), 0);

      const savings = ytdInc - ytdExp;
      const rate = ytdInc > 0 ? (savings / ytdInc) * 100 : 0;

      return { ytdInc, ytdExp, totalInc, totalExp, savings, rate };
    }
}