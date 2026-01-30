import { describe, it, expect } from 'vitest';
import { FinancialEngine } from '../../services/math/FinancialEngine';

describe('FinancialEngine: Math Authority', () => {
  
  describe('Rounding Protocol', () => {
    it('should round standard financial values to 2 decimals', () => {
      expect(FinancialEngine.round(100.555)).toBe(100.56);
      expect(FinancialEngine.round(100.554)).toBe(100.55);
    });

    it('should handle floating point precision errors', () => {
      expect(FinancialEngine.round(0.1 + 0.2)).toBe(0.3);
    });
  });

  describe('Percentage Change', () => {
    it('should calculate positive growth correctly', () => {
      expect(FinancialEngine.change(150, 100)).toBe(50);
    });

    it('should calculate negative growth (loss) correctly', () => {
      expect(FinancialEngine.change(75, 100)).toBe(-25);
    });

    it('should return null if previous value is zero to prevent Infinity', () => {
      expect(FinancialEngine.change(100, 0)).toBeNull();
    });
  });

  describe('Median Calculation (Baseline Engine)', () => {
    it('should find the middle value in an odd-length array', () => {
      expect(FinancialEngine.median([10, 50, 20])).toBe(20);
    });

    it('should find the average of two middle values in an even-length array', () => {
      expect(FinancialEngine.median([10, 20, 30, 40])).toBe(25);
    });
  });

  describe('Dietz Method (Money-Weighted Return)', () => {
    it('should calculate basic market gain without flows', () => {
      const { gain, percentage } = FinancialEngine.dietz(1000, 1100, 0);
      expect(gain).toBe(100);
      expect(percentage).toBe(10);
    });

    it('should account for capital injections (net flows)', () => {
      // Start: 1000, Invested: 500, End: 1700. 
      // Gain is 1700 - 1000 - 500 = 200.
      // Average capital is 1000 + (500/2) = 1250.
      // Return is 200/1250 = 16%.
      const { gain, percentage } = FinancialEngine.dietz(1000, 1700, 500);
      expect(gain).toBe(200);
      expect(percentage).toBe(16);
    });

    it('should handle zero-start edge cases', () => {
      const { gain, percentage } = FinancialEngine.dietz(0, 500, 500);
      expect(gain).toBe(0);
      expect(percentage).toBe(0);
    });
  });

  describe('Risk Metrics: Max Drawdown', () => {
    it('should calculate 0% drawdown for purely ascending series', () => {
      const series = [{ totalValue: 100 }, { totalValue: 110 }, { totalValue: 120 }];
      expect(FinancialEngine.maxDrawdown(series)).toBe(0);
    });

    it('should identify the largest peak-to-trough decline', () => {
      const series = [
        { totalValue: 100 }, 
        { totalValue: 150 }, // Peak
        { totalValue: 120 }, // -20% drop
        { totalValue: 140 }, 
        { totalValue: 90 },  // -40% drop from 150
        { totalValue: 110 }
      ];
      expect(FinancialEngine.maxDrawdown(series)).toBe(-40);
    });
  });
});
