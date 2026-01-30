import { parseIncomeAndExpenses, parseDetailedExpenses, parseDetailedIncome } from "./parsers/ledgerParsers";
import { createPortfolioLogParser } from "./parsers/logParsers";
import { createDebtParser } from "./parsers/registryParsers";
import { parseCSVLine, isSafeKey, normalizeTicker, detectTickerCurrency, MONTH_NAMES, findHeaderRowIndex } from "./parsers/parserUtils";
import { UniversalParser } from "./parsers/UniversalParser";
import { REGISTRY_SCHEMAS } from "../config/RegistrySchemas";
import { DebtEntry } from "../types";

export { isSafeKey, normalizeTicker, detectTickerCurrency, MONTH_NAMES };

/**
 * Identifies the header row within a CSV stream based on schema keywords.
 */
const findHeaderIndex = (lines: string[][], dataType: string): number => {
    const schema = REGISTRY_SCHEMAS[dataType];
    if (!schema) return 0;

    const allKeywords = Object.values(schema.fields).flatMap(f => f.keys);
    const matchIndex = findHeaderRowIndex(lines, allKeywords, 2);

    if (matchIndex !== -1) return matchIndex;

    // Fallback: search for a row with a date if the schema requires it
    if (schema.fields.date) {
        for (let i = 0; i < Math.min(lines.length, 50); i++) {
            if (lines[i].some(cell => !!(cell && cell.length > 5 && !isNaN(new Date(cell).getTime())))) return i;
        }
    }

    return 0;
};

/**
 * Public Orchestrator for data ingestion.
 * Routes raw spreadsheet data to the correct parser logic.
 */
export const parseRawData = async <T,>(
    rawData: string,
    dataType: 'assets' | 'investments' | 'trades' | 'subscriptions' | 'accounts' | 'logData' | 'portfolioLog' | 'debt' | 'income' | 'detailedExpenses' | 'detailedIncome' | 'journal'
): Promise<T> => {
    if (!rawData) {
        if (dataType === 'income') return { income: [], expenses: [] } as T;
        if (dataType === 'detailedExpenses' || dataType === 'detailedIncome') return { months: [], categories: [] } as T;
        return [] as T;
    }

    const lines = rawData.split(/\r?\n/);
    if (lines.length < 2) {
        if (dataType === 'income') return { income: [], expenses: [] } as T;
        if (dataType === 'detailedExpenses' || dataType === 'detailedIncome') return { months: [], categories: [] } as T;
        return [] as T;
    }

    // 1. MATRIX PROCESSING
    // Specialized parsers for non-linear structures (The Ledger)
    if (dataType === 'income') return parseIncomeAndExpenses(lines) as T;
    if (dataType === 'detailedExpenses') return parseDetailedExpenses(lines) as T;
    if (dataType === 'detailedIncome') return parseDetailedIncome(lines) as T;

    const parsedLines = lines.map(parseCSVLine);

    // 2. SPECIALIZED ROW-OFFSET HANDLING
    // Debt Schedule interfaces with a specific row-offset (A5) in the template
    if (dataType === 'debt') {
        const results: DebtEntry[] = [];
        const parser = createDebtParser();
        for (let i = 5; i < parsedLines.length; i++) {
            const values = parsedLines[i];
            if (values.every(v => v === '')) continue;
            const parsedItem = parser(values);
            if (parsedItem) { parsedItem.rowIndex = i; results.push(parsedItem); }
        }
        return results as T;
    }

    // Portfolio Log handles dynamic "Account-Value" columns added by users
    if (dataType === 'portfolioLog') {
        const headerIndex = findHeaderIndex(parsedLines, dataType);
        const parser = createPortfolioLogParser(parsedLines[headerIndex]);
        if (!parser) return [] as T;
        const results: any[] = [];
        for (let i = headerIndex + 1; i < parsedLines.length; i++) {
            const item = parser(parsedLines[i]);
            if (item) results.push(item);
        }
        return results as T;
    }

    // 3. UNIVERSAL SCHEMA ENGINE
    // All standard flat registries use the schema definition authority
    const schema = REGISTRY_SCHEMAS[dataType];
    if (schema) {
        const headerIndex = findHeaderIndex(parsedLines, dataType);
        return UniversalParser.parse<any>(parsedLines, headerIndex, schema) as T;
    }

    return [] as T;
};