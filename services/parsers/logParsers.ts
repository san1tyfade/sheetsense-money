import { PortfolioLogEntry } from '../../types';
import { parseNumber, parseFlexibleDate, normalizeHeader } from './parserUtils';

/**
 * Specialized parser for Portfolio Snapshots.
 * Retained for dynamic column resolution (horizontally expanding accounts).
 */
export const createPortfolioLogParser = (headers: string[]) => {
    const dateIdx = headers.findIndex(h => normalizeHeader(h) === 'date');
    if (dateIdx === -1) return null;

    const accountIndices = headers
        .map((h, i) => ({ name: h, index: i }))
        .filter(item => item.index !== dateIdx && item.name.trim() !== '');

    return (values: string[]): PortfolioLogEntry | null => {
        const dateStr = values[dateIdx];
        const iso = parseFlexibleDate(dateStr);
        if (!iso) return null;

        const accounts: Record<string, number> = {};
        accountIndices.forEach(item => {
            const val = parseNumber(values[item.index]);
            const cleanName = item.name.replace(/\s*VALUE\s*/i, '').trim();
            if (cleanName) {
                accounts[cleanName] = val;
            }
        });

        return { date: iso, accounts };
    };
};