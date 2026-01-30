import { PortfolioLogEntry } from '../../types';
import { parseNumber, normalizeHeader } from './parserUtils';
import { TemporalSovereign } from '../temporalService';

/**
 * Specialized parser for Portfolio Snapshots.
 */
export const createPortfolioLogParser = (headers: string[]) => {
    const dateIdx = headers.findIndex(h => normalizeHeader(h) === 'date');
    if (dateIdx === -1) return null;

    const accountIndices = headers
        .map((h, i) => ({ name: h, index: i }))
        .filter(item => item.index !== dateIdx && item.name.trim() !== '');

    return (values: string[]): PortfolioLogEntry | null => {
        const dateStr = values[dateIdx];
        const iso = TemporalSovereign.parseFlexible(dateStr);
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
