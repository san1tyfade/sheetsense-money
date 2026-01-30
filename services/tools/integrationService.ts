
import { Transaction } from '../../types';

/**
 * Detects the most likely target month based on transaction dates in a statement.
 * Returns a 0-based month index (0 = Jan).
 */
export const detectTargetMonth = (transactions: Transaction[]): number => {
    if (transactions.length === 0) return new Date().getMonth();

    const monthCounts: Record<number, number> = {};
    transactions.forEach(tx => {
        // Use YYYY-MM-DD parsing directly to avoid local timezone issues shifting the month
        const parts = tx.date.split('-');
        if (parts.length < 2) return;
        const m = parseInt(parts[1]) - 1;
        if (!isNaN(m)) {
            monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
    });

    const entries = Object.entries(monthCounts);
    if (entries.length === 0) return new Date().getMonth();

    entries.sort((a, b) => b[1] - a[1]);
    return parseInt(entries[0][0]);
};

/**
 * Simple string similarity matching (Levenshtein based or token overlap)
 * to suggest ledger categories for statement categories.
 */
export const suggestLedgerCategory = (
    statementCat: string, 
    ledgerCategories: string[],
    existingMappings: Record<string, string> = {}
): string => {
    const sNorm = statementCat.toUpperCase().trim();
    
    // 1. Check Memory first
    if (existingMappings[sNorm]) return existingMappings[sNorm];

    // 2. Exact Match
    const exact = ledgerCategories.find(c => c.toUpperCase() === sNorm);
    if (exact) return exact;

    // 3. Token Overlap
    const sTokens = sNorm.split(/[&\s/-]+/);
    let bestMatch = 'Uncategorized';
    let maxOverlap = 0;

    ledgerCategories.forEach(lCat => {
        const lNorm = lCat.toUpperCase();
        const lTokens = lNorm.split(/[&\s/-]+/);
        const overlap = sTokens.filter(t => t.length > 2 && lTokens.includes(t)).length;
        
        if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestMatch = lCat;
        } else if (overlap === maxOverlap && overlap > 0) {
            // Tie breaker: string length or presence in both
            if (lNorm.includes(sNorm) || sNorm.includes(lNorm)) {
                bestMatch = lCat;
            }
        }
    });

    return bestMatch;
};
