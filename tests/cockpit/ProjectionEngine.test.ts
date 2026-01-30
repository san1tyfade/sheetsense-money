import { describe, it, expect } from 'vitest';
import { runWealthSimulation } from '../../services/cockpit/projectionEngine';
import { CockpitBaseline, CockpitMutationState } from '../../types';

describe('ProjectionEngine: Strategic Simulation', () => {
  const mockBaseline: CockpitBaseline = {
    income: { 'Salary': 10000 },
    expenses: { 'Rent': 4000, 'Food': 1000 },
    totalInvestments: 100000,
    totalCash: 10000
  };

  const defaultMutation: CockpitMutationState = {
    globalIncomeMultiplier: 1.0,
    globalExpenseMultiplier: 1.0,
    incomeMultipliers: {},
    expenseMultipliers: {},
    investmentRate: 0.20, // 20% of surplus to investments
    macroGrowthRate: 0.07, // 7% annual
    events: []
  };

  it('should detect the FI/RE milestone when passive income exceeds expenses', () => {
    // With $5k monthly expense, we need roughly $850k @ 7% to be "Free" (simple sim logic)
    const result = runWealthSimulation(mockBaseline, defaultMutation, 30);

    expect(result.freedomMonth).not.toBeNull();
    const freedomPoint = result.points[result.freedomMonth!];
    const passiveMonthly = (freedomPoint.investments * (0.07 / 12));
    expect(passiveMonthly).toBeGreaterThanOrEqual(5000);
  });

  it('should correctly apply a life event (Windfall) at a specific month', () => {
    const windfallMutation: CockpitMutationState = {
      ...defaultMutation,
      events: [{
        id: 'win-1',
        month: 12,
        amount: 50000,
        type: 'INFLOW',
        label: 'Windfall'
      }]
    };

    const result = runWealthSimulation(mockBaseline, windfallMutation, 5);
    const month12 = result.points[12];
    const month13 = result.points[13];

    // Total Wealth at Month 13 should be ~Month 12 + Surplus + Windfall
    const surplus = 5000;
    const diff = month13.totalWealth - month12.totalWealth;
    expect(diff).toBeGreaterThan(50000);
    expect(diff).toBeLessThan(60000); // Including surplus and growth
  });

  it('should maintain static wealth if growth and surplus are zero', () => {
    const staticMutation: CockpitMutationState = {
      ...defaultMutation,
      globalExpenseMultiplier: 2.0, // $10k income - $10k expense = 0 surplus
      macroGrowthRate: 0
    };

    const result = runWealthSimulation(mockBaseline, staticMutation, 10);
    const finalPoint = result.points[result.points.length - 1];
    expect(Math.round(finalPoint.totalWealth)).toBe(110000);
  });
});