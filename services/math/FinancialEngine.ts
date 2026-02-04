import { AppError, IEP } from '../infrastructure/ErrorHandler';

/**
 * FinancialEngine: The Sovereign Math Authority
 * Centralizes all statistical and financial primitives to prevent 
 * math drift across different application hubs.
 */
export class FinancialEngine {
    /**
     * Standardized Rounding Protocol
     * Prevents floating point errors in financial sums.
     */
    static round(value: number, precision: number = 2): number {
        const factor = Math.pow(10, precision);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    /**
     * Percentage Change calculation with safety interlocks.
     */
    static change(current: number, previous: number): number | null {
        if (previous === 0) return null;
        return this.round(((current - previous) / Math.abs(previous)) * 100);
    }

    /**
     * Median Calculation
     * Used for establishing "Typical Month" baselines.
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
        
        // Logical Guardrail: Prevent division by near-zero capital which causes infinity/NaN in percentage
        if (Math.abs(averageCapital) < 0.01 && Math.abs(startValue) < 0.01) {
            return { gain: this.round(gain), percentage: 0 };
        }

        const percentage = Math.abs(averageCapital) > 1 
            ? (gain / Math.abs(averageCapital)) * 100 
            : (startValue > 0 ? (gain / startValue) * 100 : 0);
            
        // Check for unrealistic values suggesting data corruption
        if (isNaN(percentage) || Math.abs(percentage) > 1000000) {
            throw new AppError(IEP.DMN.VALUATION_OVERFLOW, "Valuation Logic reached an unstable state.", 'RECOVERABLE', { startValue, endValue, netFlow });
        }

        return { 
            gain: this.round(gain), 
            percentage: this.round(percentage, 4) 
        };
    }

    /**
     * Growth Velocity
     */
    static velocity(startValue: number, endValue: number, days: number): number {
        if (days <= 0) return 0;
        return this.round((endValue - startValue) / days);
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
}