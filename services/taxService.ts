
import { TaxRecord } from '../types';

export const TAX_ACCOUNTS = ['TFSA', 'RRSP', 'FHSA', 'LAPP', 'RESP'];
export const TAX_SUMMARY_ACCOUNTS = ['TFSA', 'RRSP', 'FHSA'];

export const TAX_LIMIT_TYPES = ['LIMIT', 'LIMIT INCREASE', 'OPENING BALANCE', 'INCREASE'];
export const TAX_CONTRIBUTION_TYPES = ['CONTRIBUTION', 'DEPOSIT'];
export const TAX_WITHDRAWAL_TYPES = ['WITHDRAWAL', 'WITHDRAW'];

interface TaxAccountStats {
    used: number;
    totalLimit: number;
    remaining: number;
    pendingRecovery: number;
}

export const calculateTaxStats = (taxRecords: TaxRecord[]): Record<string, TaxAccountStats> => {
    const stats: Record<string, TaxAccountStats> = {};
    const currentYear = new Date().getFullYear();

    TAX_ACCOUNTS.forEach(acc => {
        const records = taxRecords.filter(r => (r.recordType || '').toUpperCase().includes(acc));
        const isTFSA = acc.toUpperCase() === 'TFSA';

        let totalLimit = 0;
        let totalContributions = 0;
        let historicalWithdrawals = 0;
        let currentYearWithdrawals = 0;

        records.forEach(r => {
            const type = (r.transactionType || '').toUpperCase().trim();
            const value = Math.abs(r.value || 0);
            const recordDate = new Date(r.date);
            const recordYear = recordDate.getFullYear();

            if (TAX_LIMIT_TYPES.includes(type)) {
                totalLimit += value;
            } else if (TAX_CONTRIBUTION_TYPES.includes(type)) {
                totalContributions += value;
            } else if (TAX_WITHDRAWAL_TYPES.includes(type)) {
                if (recordYear < currentYear) {
                    historicalWithdrawals += value;
                } else {
                    currentYearWithdrawals += value;
                }
            }
        });

        /**
         * TFSA ROOM RECOVERY RULE:
         * "Withdrawals made in the current year are added back to the TFSA 
         * contribution room at the beginning of the following year."
         */

        // For TFSA, current capacity includes all historical increases and withdrawals made in past years
        const capacity = totalLimit + (isTFSA ? historicalWithdrawals : 0);

        // Used is the total amount contributed (this never resets, just reduces capacity)
        const used = totalContributions;

        // Remaining is capacity minus what you've put in
        const remaining = Math.max(0, capacity - used);

        stats[acc] = {
            used,
            totalLimit: capacity,
            remaining,
            pendingRecovery: isTFSA ? currentYearWithdrawals : 0
        };
    });

    return stats;
};
