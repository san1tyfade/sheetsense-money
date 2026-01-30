import { IncomeAndExpenses, LedgerData, LedgerCategory, LedgerItem, IncomeEntry, ExpenseEntry } from '../../types';
import { parseCSVLine, parseNumber, isSafeKey, isMonthlyHeaderRow } from './parserUtils';
import { TemporalSovereign } from '../temporalService';

export const parseIncomeAndExpenses = (lines: string[]): IncomeAndExpenses => {
    const incomeEntries: IncomeEntry[] = [];
    const expenseEntries: ExpenseEntry[] = [];
    const parsedLines: string[][] = lines.map(parseCSVLine);
    const dateRowIndices: number[] = [];

    let bestIncomeRowIndex = -1;
    let bestIncomePriority = 0;
    const expenseRows: { name: string; rowIndex: number }[] = [];

    for (let i = 0; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        const firstCell = (row[0] || '').trim();
        const lowerFirst = firstCell.toLowerCase();

        if (isMonthlyHeaderRow(row, (v) => TemporalSovereign.parseFlexible(v))) {
            dateRowIndices.push(i);
        }

        const isIncomeLabel = lowerFirst === 'total income' || lowerFirst.includes('annual snapshot');
        if (isIncomeLabel) {
            if (row.some((c, idx) => idx > 0 && parseNumber(c) !== 0)) {
                const priority = lowerFirst === 'total income' ? 100 : 90;
                if (priority > bestIncomePriority) { bestIncomeRowIndex = i; bestIncomePriority = priority; }
            }
            continue;
        }

        const isCommonExclude = ['net income', 'monthly savings', 'balance', 'expense categorie', 'income categories', 'summary', 'spending ledger'].some(key => lowerFirst.includes(key));
        const isSectionHeader = lowerFirst === 'expenses' || lowerFirst === 'income' || lowerFirst === 'total';

        if (lowerFirst && !lowerFirst.includes('income') && !isCommonExclude && !isSectionHeader && !lowerFirst.includes('total')) {
            if (row.some((c, idx) => idx > 0 && parseNumber(c) !== 0) && dateRowIndices.length > 0) {
                expenseRows.push({ name: firstCell, rowIndex: i });
            }
        }
    }

    if (bestIncomeRowIndex !== -1 && dateRowIndices.length > 0) {
        const dateRowIdx = dateRowIndices.find(idx => idx < bestIncomeRowIndex) ?? dateRowIndices[0];
        const dateRow = parsedLines[dateRowIdx];
        const valRow = parsedLines[bestIncomeRowIndex];
        for (let c = 1; c < dateRow.length; c++) {
            const iso = TemporalSovereign.parseFlexible(dateRow[c]);
            if (iso) incomeEntries.push({ date: iso, monthStr: dateRow[c], amount: parseNumber(valRow[c]) });
        }
    }

    if (expenseRows.length > 0 && dateRowIndices.length > 0) {
        const dateRow = parsedLines[dateRowIndices[0]];
        for (let c = 1; c < dateRow.length; c++) {
            const iso = TemporalSovereign.parseFlexible(dateRow[c]);
            if (!iso) continue;
            const categories: Record<string, number> = {};
            let total = 0;
            expenseRows.forEach(exp => {
                if (!isSafeKey(exp.name)) return;
                const val = Math.abs(parseNumber(parsedLines[exp.rowIndex][c]));
                categories[exp.name] = val;
                total += val;
            });
            if (total > 0) expenseEntries.push({ date: iso, monthStr: dateRow[c], categories, total });
        }
    }

    const sortByDate = (a: any, b: any) => a.date.localeCompare(b.date);
    return { income: incomeEntries.sort(sortByDate), expenses: expenseEntries.sort(sortByDate) };
};

const commonParser = (lines: string[], mode: 'INCOME' | 'EXPENSE'): LedgerData => {
    const categories: LedgerCategory[] = [];
    const parsedLines = lines.map(parseCSVLine);
    let headerIdx = -1;

    for (let i = 0; i < Math.min(parsedLines.length, 100); i++) {
        if (isMonthlyHeaderRow(parsedLines[i], (v) => TemporalSovereign.parseFlexible(v))) {
            const firstCell = (parsedLines[i][0] || '').toLowerCase();
            const prevCell = i > 0 ? (parsedLines[i - 1][0] || '').toLowerCase() : '';

            const incomeKeywords = ['income', 'revenue'];
            const expenseKeywords = ['expense', 'spending'];

            const hasKeyword = (text: string, keywords: string[]) => keywords.some(k => text.includes(k));

            const isIncome = hasKeyword(firstCell, incomeKeywords) || hasKeyword(prevCell, incomeKeywords);
            const isExpense = hasKeyword(firstCell, expenseKeywords) || hasKeyword(prevCell, expenseKeywords);

            let isStrong = false;
            let isOpposite = false;

            if (mode === 'INCOME') {
                isStrong = isIncome;
                isOpposite = isExpense;
            } else {
                isStrong = isExpense;
                isOpposite = isIncome;
            }

            if (isStrong) {
                headerIdx = i;
                break;
            }

            if (isOpposite) {
                continue;
            }

            // Neutral/Weak match (e.g. 'Category', 'Annual', or just dates found)
            if (headerIdx === -1) {
                headerIdx = i;
            }
        }
    }

    if (headerIdx === -1) return { months: [], categories: [] };

    const headerRow = parsedLines[headerIdx];
    const monthColIndices: number[] = [];
    const months = headerRow.filter((v, idx) => {
        if (idx === 0) return false;
        const iso = TemporalSovereign.parseFlexible(v);
        if (iso) { monthColIndices.push(idx); return true; }
        return false;
    });

    let currentCategory: LedgerCategory | null = null;

    for (let i = headerIdx + 1; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        const name = (row[0] || '').trim();
        if (!name || TemporalSovereign.isStrictDateMarker(name)) break;
        if (!isSafeKey(name)) continue;

        const normName = name.toLowerCase();
        if (normName === 'total' || normName.includes('summary')) continue;

        const vals = monthColIndices.map(idx => Math.abs(parseNumber(row[idx])));
        const rowTotal = vals.reduce((a, b) => a + b, 0);
        const hasData = rowTotal !== 0;

        if (mode === 'INCOME') {
            if (!currentCategory) currentCategory = { name: 'Income Sources', subCategories: [], total: 0 };
            if (hasData) {
                currentCategory.subCategories.push({ name, monthlyValues: vals, total: rowTotal, rowIndex: i });
                currentCategory.total += rowTotal;
            }
        } else {
            const isNewHeader = !hasData && i + 1 < parsedLines.length && monthColIndices.some(idx => parseNumber(parsedLines[i + 1][idx]) !== 0);
            if (isNewHeader || !currentCategory) {
                if (currentCategory) categories.push(currentCategory);
                currentCategory = { name, subCategories: [], total: 0, rowIndex: i };
            } else if (hasData) {
                currentCategory.subCategories.push({ name, monthlyValues: vals, total: rowTotal, rowIndex: i });
                currentCategory.total += rowTotal;
            }
        }
    }

    if (currentCategory && currentCategory.subCategories.length > 0) categories.push(currentCategory);
    return { months, categories };
};

export const parseDetailedIncome = (lines: string[]): LedgerData => commonParser(lines, 'INCOME');
export const parseDetailedExpenses = (lines: string[]): LedgerData => commonParser(lines, 'EXPENSE');
