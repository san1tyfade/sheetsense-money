
import { CockpitBaseline, CockpitMutationState, SimulationPoint } from '../../types';

export interface SimulationResult {
    points: SimulationPoint[];
    freedomMonth: number | null;
    totalInjected: number;
    totalGrowth: number;
}

export const runWealthSimulation = (
    baseline: CockpitBaseline,
    state: CockpitMutationState,
    years: number = 30
): SimulationResult => {
    const points: SimulationPoint[] = [];
    const totalMonths = years * 12;

    let currentInvestments = baseline.totalInvestments;
    let currentCash = baseline.totalCash;
    let totalInjected = 0;

    const baseMonthlyIncome = (Object.entries(baseline.income) as [string, number][]).reduce((sum, [cat, val]) => {
        const multiplier = state.incomeMultipliers[cat] ?? 1.0;
        return sum + (val * multiplier);
    }, 0);
    
    const monthlyIncome = baseMonthlyIncome * state.globalIncomeMultiplier;

    const monthlyExpense = (Object.entries(baseline.expenses) as [string, number][]).reduce((sum, [cat, val]) => {
        const multiplier = state.expenseMultipliers[cat] ?? 1.0;
        return sum + (val * multiplier);
    }, 0) * state.globalExpenseMultiplier;

    const monthlySurplus = monthlyIncome - monthlyExpense;
    const monthlyGrowthRate = state.macroGrowthRate / 12;

    let freedomMonth: number | null = null;

    for (let m = 0; m <= totalMonths; m++) {
        const totalWealth = currentInvestments + currentCash;
        
        const passiveGrowth = currentInvestments * monthlyGrowthRate;
        if (freedomMonth === null && passiveGrowth >= monthlyExpense && monthlyExpense > 0) {
            freedomMonth = m;
        }

        // Check for events in this month to mark milestones
        // Use coercion to handle any potential type mismatch in external test inputs
        const currentEvents = (state.events || []).filter(ev => Number(ev.month) === Number(m));
        const hasEvent = currentEvents.length > 0;

        points.push({
            month: m,
            investments: currentInvestments,
            cash: currentCash,
            totalWealth,
            isMilestone: m === freedomMonth || hasEvent,
            milestoneLabel: m === freedomMonth ? 'FI/RE' : (hasEvent ? currentEvents[0].label : undefined)
        });

        if (m === totalMonths) break;

        // Apply events for this specific month
        let eventNet = 0;
        (state.events || []).forEach(ev => {
          if (Number(ev.month) === Number(m)) {
            eventNet += (ev.type === 'INFLOW' ? Number(ev.amount) : -Number(ev.amount));
          }
        });

        // Current month's capital availability
        const availableFlow = monthlySurplus + eventNet;
        
        const amountToInvest = availableFlow * state.investmentRate;
        const amountToCash = availableFlow * (1 - state.investmentRate);

        totalInjected += availableFlow;

        currentInvestments = (currentInvestments * (1 + monthlyGrowthRate)) + amountToInvest;
        currentCash = currentCash + amountToCash;
        
        // Safety: don't let cash go negative in simple strategy simulation
        if (currentCash < 0) {
            currentInvestments += currentCash;
            currentCash = 0;
        }
    }

    const totalGrowth = (currentInvestments + currentCash) - (baseline.totalInvestments + baseline.totalCash) - totalInjected;

    return {
        points,
        freedomMonth,
        totalInjected,
        totalGrowth
    };
};
