import { IncomeAndExpenses, LedgerData, LedgerCategory, LedgerItem, IncomeEntry, ExpenseEntry } from '../../types';
import { parseCSVLine, parseNumber, parseFlexibleDate, normalizeText, isSafeKey } from './parserUtils';

export const parseIncomeAndExpenses = (lines: string[]): IncomeAndExpenses => {
    const incomeEntries: IncomeEntry[] = [];
    const expenseEntries: ExpenseEntry[] = [];
    const parsedLines: { [index: number]: string[] } = {};
    const dateRowIndices: number[] = [];
    let bestIncomeRowIndex = -1;
    let bestIncomePriority = 0; 
    const expenseRows: { name: string; rowIndex: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        parsedLines[i] = row;
        const firstCell = (row[0] || '').trim();
        const lowerFirst = firstCell.toLowerCase();
        let dateCount = 0;
        for (let c = 1; c < Math.min(row.length, 14); c++) if (parseFlexibleDate(row[c])) dateCount++;
        if (dateCount >= 2) dateRowIndices.push(i); 
        
        const isIncomeLabel = lowerFirst === 'total income' || normalizeText(firstCell).includes('annual snapshot');
        
        if (isIncomeLabel) {
             let hasData = false;
             for (let c = 1; c < row.length; c++) if (parseNumber(row[c]) !== 0) { hasData = true; break; }
             if (hasData) {
                 const priority = lowerFirst === 'total income' ? 100 : 90;
                 if (priority > bestIncomePriority) { bestIncomeRowIndex = i; bestIncomePriority = priority; }
             }
             continue; 
        }
        const isIncomeLine = lowerFirst.includes('income'); 
        const isCommonExclude = ['net income', 'monthly savings', 'balance', 'expense categorie', 'income categories', 'summary', 'spending ledger'].some(key => lowerFirst.includes(key));
        const isSectionHeader = lowerFirst === 'expenses' || lowerFirst === 'income' || lowerFirst === 'total';

        if (lowerFirst && !isIncomeLine && !isCommonExclude && !isSectionHeader && !lowerFirst.includes('total')) {
               let hasNumericData = false;
               for(let c = 1; c < row.length; c++) if (parseNumber(row[c]) !== 0) { hasNumericData = true; break; }
               if (hasNumericData && dateRowIndices.length > 0 && i > dateRowIndices[0]) expenseRows.push({ name: firstCell, rowIndex: i });
        }
    }
    let incomeDateRowIndex = -1;
    if (bestIncomeRowIndex !== -1) for (let j = dateRowIndices.length - 1; j >= 0; j--) if (dateRowIndices[j] < bestIncomeRowIndex) { incomeDateRowIndex = dateRowIndices[j]; break; }
    if (bestIncomeRowIndex !== -1 && incomeDateRowIndex === -1 && dateRowIndices.length > 0) incomeDateRowIndex = dateRowIndices[0];
    if (bestIncomeRowIndex !== -1 && incomeDateRowIndex !== -1) {
        const dateRow = parsedLines[incomeDateRowIndex];
        const valRow = parsedLines[bestIncomeRowIndex];
        for (let c = 1; c < dateRow.length; c++) {
            if (c >= valRow.length) break;
            const iso = parseFlexibleDate(dateRow[c]);
            const val = parseNumber(valRow[c]);
            if (iso) incomeEntries.push({ date: iso, monthStr: dateRow[c], amount: val });
        }
    }
    if (expenseRows.length > 0 && dateRowIndices.length > 0) {
        const dateRow = parsedLines[dateRowIndices[0]];
        for (let c = 1; c < dateRow.length; c++) {
            const iso = parseFlexibleDate(dateRow[c]);
            if (!iso) continue;
            const categories: Record<string, number> = {};
            let total = 0;
            expenseRows.forEach(exp => {
                if (!isSafeKey(exp.name)) return;
                const val = Math.abs(parseNumber(parsedLines[exp.rowIndex][c] || '0'));
                categories[exp.name] = val;
                total += val;
            });
            if (total > 0) expenseEntries.push({ date: iso, monthStr: dateRow[c], categories, total });
        }
    }
    const sortByDate = (a: any, b: any) => a.date.localeCompare(b.date);
    return { income: incomeEntries.sort(sortByDate), expenses: expenseEntries.sort(sortByDate) };
};

export const parseDetailedIncome = (lines: string[]): LedgerData => {
    const categories: LedgerCategory[] = [];
    let headerIdx = -1;
    let bestMonthCount = 0;
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const row = parseCSVLine(lines[i]);
        const firstCell = (row[0] || '');
        const normCell = normalizeText(firstCell);
        let count = 0;
        for (let j = 1; j < row.length; j++) if (parseFlexibleDate((row[j] || '').trim())) count++;
        if (count >= 2 && count >= bestMonthCount) { bestMonthCount = count; headerIdx = i; if (count >= 6) break; }
        const isTargetRow = normCell.includes("income") || normCell.includes("revenue") || normCell.includes("earnings") || normCell.includes("annual snapshot");
        const isSummary = (normCell.includes("total") || normCell.includes("net")) && !normCell.includes("snapshot");
        if (count > 0 && isTargetRow && !isSummary) { if (count >= bestMonthCount) { bestMonthCount = count; headerIdx = i; break; } }
    }
    if (headerIdx === -1 || headerIdx >= lines.length - 1) return { months: [], categories: [] };
    const headerRow = parseCSVLine(lines[headerIdx]);
    const months: string[] = [];
    const monthColIndices: number[] = [];
    for (let j = 1; j < headerRow.length; j++) { const val = (headerRow[j] || '').trim(); if (parseFlexibleDate(val)) { months.push(val); monthColIndices.push(j); } }
    const incomeSourceCategory: LedgerCategory = { name: 'Income Sources', subCategories: [], total: 0, rowIndex: headerIdx };
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const name = (row[0] || '').trim();
        if (!name || !isSafeKey(name)) continue;
        const normName = normalizeText(name);
        const isSnapshotRow = normName.includes('annual snapshot');
        const isTerminator = !isSnapshotRow && (normName === 'total' || normName.includes('total income') || normName.includes('expense') || normName.includes('outgoing'));
        if (isTerminator) break;
        const monthlyValues: number[] = [];
        let rowTotal = 0;
        monthColIndices.forEach(colIdx => { const val = parseNumber(row[colIdx]); monthlyValues.push(val); rowTotal += val; });
        
        incomeSourceCategory.subCategories.push({ name: name, monthlyValues: monthlyValues, total: rowTotal, rowIndex: i }); 
        incomeSourceCategory.total += rowTotal;
    }
    if (incomeSourceCategory.subCategories.length > 0) categories.push(incomeSourceCategory);
    return { months, categories };
};

export const parseDetailedExpenses = (lines: string[]): LedgerData => {
    const categories: LedgerCategory[] = [];
    let headerIdx = -1;
    let bestMonthCount = 0;
    for (let i = 0; i < Math.min(lines.length, 250); i++) {
        const row = parseCSVLine(lines[i]);
        const firstCell = (row[0] || '');
        const normCell = normalizeText(firstCell);
        let count = 0;
        for (let j = 1; j < row.length; j++) if (parseFlexibleDate((row[j] || '').trim())) count++;
        const isExpenseTitle = normCell.includes("expense") || normCell.includes("spending") || normCell.includes("outgoing") || normCell.includes("categories") || normCell.includes("annual snapshot");
        const isIncomeOrNet = (normCell.includes("income") || normCell.includes("net") || normCell.includes("savings") || normCell.includes("revenue") || normCell === 'total') && !normCell.includes("annual snapshot");
        if (count > 0) { if (isExpenseTitle && !isIncomeOrNet) { bestMonthCount = count; headerIdx = i; break; } if (count >= bestMonthCount && !isIncomeOrNet) { bestMonthCount = count; headerIdx = i; } }
    }
    if (headerIdx === -1 || headerIdx >= lines.length - 1) return { months: [], categories: [] };
    const headerRow = parseCSVLine(lines[headerIdx]);
    const months: string[] = [];
    const monthColIndices: number[] = [];
    for (let j = 1; j < headerRow.length; j++) { const val = (headerRow[j] || '').trim(); if (parseFlexibleDate(val)) { months.push(val); monthColIndices.push(j); } }

    const getRowData = (index: number) => {
        if (index >= lines.length) return null;
        const r = parseCSVLine(lines[index]);
        const n = (r[0] || '').trim();
        if (!n) return null;
        const vals: number[] = [];
        let hd = false; // Is any value non-zero
        let hnc = false; // Is any cell non-empty (numeric content exists)
        let t = 0;
        monthColIndices.forEach(colIdx => {
            const rawCell = (r[colIdx] || '').trim();
            if (rawCell !== '') hnc = true;
            const v = Math.abs(parseNumber(rawCell));
            vals.push(v);
            if (v !== 0) hd = true;
            t += v;
        });
        return { name: n, hasData: hd, hasNumericContent: hnc, monthlyValues: vals, total: t };
    };

    let currentCategory: LedgerCategory | null = null;
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const name = (row[0] || '').trim();
        const normName = normalizeText(name);

        if (!name) { 
            if (currentCategory) { categories.push(currentCategory); currentCategory = null; } 
            continue; 
        }

        if (!isSafeKey(name)) continue;

        const isIncomeSection = (normName.includes('income sources') || normName.includes('revenue') || normName === 'income' || normName.includes('monthly savings')) && !normName.includes("annual snapshot");
        if (isIncomeSection) break;
        
        if (normName === 'total' || normName.includes('net income') || normName.includes('total monthly') || normName.includes('summary')) { 
            if (currentCategory) { categories.push(currentCategory); currentCategory = null; } 
            continue; 
        }

        const data = getRowData(i);
        if (!data) continue;

        // Peak ahead to see if this is a header or a subcategory
        const nextData = getRowData(i + 1);
        
        /**
         * REFINED HEURISTIC:
         * A row is a header if:
         * 1. We don't have a category yet.
         * 2. OR it has NO numeric content (all empty cells in month columns) AND 
         *    the next valid row DOES have numeric content.
         * 
         * This prevents "$0.00" rows from being flagged as headers just because 
         * they are zero and followed by a non-zero row.
         */
        const isHeader = !currentCategory || (!data.hasNumericContent && nextData && nextData.hasNumericContent);

        if (isHeader) {
            if (currentCategory) categories.push(currentCategory);
            currentCategory = { name: data.name, subCategories: [], total: 0, rowIndex: i };
        } else {
            const subItem: LedgerItem = { 
                name: data.name, 
                monthlyValues: data.monthlyValues, 
                total: data.total, 
                rowIndex: i 
            };
            if (currentCategory) {
                currentCategory.subCategories.push(subItem);
                currentCategory.total += data.total;
            } else {
                categories.push({ name: 'Uncategorized', subCategories: [subItem], total: data.total, rowIndex: i });
            }
        }
    }
    if (currentCategory && !categories.find(c => c.name === currentCategory?.name)) categories.push(currentCategory);
    return { months, categories };
};