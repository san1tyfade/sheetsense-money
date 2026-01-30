import { Transaction, JournalEntry, Subscription } from '../../types';
import { cleanMerchantDescription } from '../infrastructure/IntelligenceProvider';
import { FinancialEngine } from '../math/FinancialEngine';
import { TemporalSovereign } from '../temporalService';

export type CadenceType = 'MONTHLY' | 'WEEKLY' | 'NONE';

export interface MerchantStats {
    median: number;
    stdDev: number;
    avgCountPerMonth: number;
}

export interface MerchantProfile {
    identity: string;
    displayName: string;
    totalInView: number;
    countInView: number;
    l12mTotal: number;
    l12mCount: number;
    lastSeen: string;
    cadence: CadenceType;
    isUnregistered: boolean;
    pulse: boolean[]; // 12 months
    stats: MerchantStats;
}

/**
 * Detects the billing frequency based on transaction intervals.
 */
const detectCadence = (dates: string[]): CadenceType => {
    if (dates.length < 3) return 'NONE';
    const sortedDates = [...dates].sort().map(d => new Date(d).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(Math.round((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24)));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avgGap >= 25 && avgGap <= 33) return 'MONTHLY';
    if (avgGap >= 6 && avgGap <= 8) return 'WEEKLY';
    return 'NONE';
};

/**
 * Clusters transactions and calculates statistical baselines.
 */
export const aggregateMerchantProfiles = (
    viewTransactions: Transaction[],
    historyPool: (Transaction | JournalEntry)[],
    registry: Subscription[] = []
): MerchantProfile[] => {
    if (viewTransactions.length === 0) return [];

    const profiles: Record<string, MerchantProfile> = {};
    const todayISO = TemporalSovereign.getLogicalTodayISO();
    const now = new Date(todayISO);
    const l12mLimit = TemporalSovereign.toAbsoluteISO(new Date(now.getFullYear(), now.getMonth() - 12, 1));
    
    const registeredIdentities = new Set(registry.map(s => cleanMerchantDescription(s.name)));

    // 1. Initialize
    viewTransactions.forEach(tx => {
        const identity = cleanMerchantDescription(tx.description);
        if (!profiles[identity]) {
            profiles[identity] = {
                identity,
                displayName: tx.description,
                totalInView: 0,
                countInView: 0,
                l12mTotal: 0,
                l12mCount: 0,
                lastSeen: tx.date,
                cadence: 'NONE',
                isUnregistered: !registeredIdentities.has(identity),
                pulse: new Array(12).fill(false),
                stats: { median: 0, stdDev: 0, avgCountPerMonth: 0 }
            };
        }
        profiles[identity].totalInView += Math.abs(tx.amount);
        profiles[identity].countInView += 1;
    });

    // 2. Scan history for raw statistical data
    const merchantHistoryAmounts: Record<string, number[]> = {};
    const merchantHistoryDates: Record<string, string[]> = {};

    historyPool.forEach(hx => {
        if (hx.date < l12mLimit) return;
        const identity = cleanMerchantDescription(hx.description);
        if (profiles[identity]) {
            const amt = Math.abs(hx.amount);
            profiles[identity].l12mTotal += amt;
            profiles[identity].l12mCount += 1;

            if (!merchantHistoryAmounts[identity]) merchantHistoryAmounts[identity] = [];
            merchantHistoryAmounts[identity].push(amt);

            if (!merchantHistoryDates[identity]) merchantHistoryDates[identity] = [];
            merchantHistoryDates[identity].push(hx.date);

            const monthsAgo = TemporalSovereign.getMonthOffset(hx.date, todayISO);
            if (monthsAgo >= 0 && monthsAgo < 12) profiles[identity].pulse[monthsAgo] = true;
        }
    });

    // 3. Finalize Statistics
    Object.keys(profiles).forEach(id => {
        const amounts = merchantHistoryAmounts[id] || [];
        const median = FinancialEngine.median(amounts);
        profiles[id].stats = {
            median,
            stdDev: FinancialEngine.stdDev(amounts, median),
            avgCountPerMonth: (profiles[id].l12mCount / 12)
        };
        profiles[id].cadence = detectCadence(merchantHistoryDates[id] || []);
        const frequencyCount = profiles[id].pulse.filter(Boolean).length;
        if (profiles[id].cadence === 'NONE' && frequencyCount >= 8) profiles[id].cadence = 'MONTHLY';
    });

    return Object.values(profiles).sort((a, b) => b.totalInView - a.totalInView);
};

export const getTransactionAnomaly = (tx: Transaction, profile?: MerchantProfile) => {
    if (!profile || profile.stats.median === 0) return null;
    const amount = Math.abs(tx.amount);
    const variance = ((amount - profile.stats.median) / profile.stats.median) * 100;
    if (Math.abs(variance) > 20 && Math.abs(amount - profile.stats.median) > Math.max(10, profile.stats.stdDev * 1.5)) {
        return { type: variance > 0 ? 'SHOCK' : 'DIP', variance, typical: profile.stats.median };
    }
    return null;
};
