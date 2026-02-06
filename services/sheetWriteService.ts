
import { Trade, Asset, Subscription, BankAccount, LedgerCommitPayload, Transaction, JournalEntry } from '../types';
import { parseNumber, normalizeHeader, MONTH_NAMES_TITLED } from './parsers/parserUtils';
import { googleClient } from './infrastructure/GoogleClient';
import { TemporalSovereign } from './temporalService';
import { REGISTRY_SCHEMAS, SchemaDefinition } from '../config/RegistrySchemas';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const assertNotArchive = (tabName: string) => {
    const isArchive = /[ \-]+(\d{2}|\d{4})$/.test(tabName.trim());
    if (isArchive) throw new Error(`CRITICAL: Write-lock violation on immutable archive: ${tabName}`);
};

/**
 * UniversalWriter: The Schema-Driven Mapper
 * Uses RegistrySchemas to translate typed objects into spreadsheet rows.
 */
const mapToRow = (item: any, schema: SchemaDefinition, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    const normalizedHeaders = headers.map(normalizeHeader);

    Object.entries(schema.fields).forEach(([fieldKey, def]) => {
        const value = item[fieldKey];
        if (value === undefined) return;

        const normalizedKeys = def.keys.map(normalizeHeader);
        
        // Pass 1: Exact mapping match
        let idx = normalizedHeaders.findIndex((h, i) => row[i] === null && normalizedKeys.some(k => h === k));
        
        // Pass 2: Fuzzy multi-word match (e.g., "assetname" contains "asset")
        if (idx === -1) {
            idx = normalizedHeaders.findIndex((h, i) => 
                row[i] === null && 
                normalizedKeys.some(k => k.length > 3 && (h.includes(k) || k.includes(h)))
            );
        }

        if (idx !== -1) {
            if (def.type === 'boolean') row[idx] = value ? 'TRUE' : 'FALSE';
            else row[idx] = value;
        }
    });

    return row;
};

const fetchHeaders = async (sheetId: string, tabName: string): Promise<string[]> => {
    const data = await googleClient.getRange(sheetId, `'${tabName}'!A1:Z10`);
    const rows = data.values || [];
    return rows.reduce((best: string[], current: string[]) => {
        const currentCount = current.filter(v => v && isNaN(Number(v))).length;
        const bestCount = best.filter(v => v && isNaN(Number(v))).length;
        return currentCount > bestCount ? current : best;
    }, rows[0]) || [];
};

const resolveTabName = async (spreadsheetId: string, tabName: string): Promise<string> => {
    try {
        const data = await googleClient.request(`${BASE_URL}/${spreadsheetId}?sheets(properties/title)`);
        const match = data.sheets?.find((s: any) => s.properties?.title.toLowerCase() === tabName.toLowerCase());
        return match ? match.properties.title : tabName;
    } catch { return tabName; }
};

export const commitItemToSheet = async (sheetId: string, tabName: string, item: any, schemaId: string) => {
    assertNotArchive(tabName);
    const schema = REGISTRY_SCHEMAS[schemaId];
    if (!schema) throw new Error(`Schema ${schemaId} not found.`);
    
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const headers = await fetchHeaders(sheetId, resolvedTab);
    const rowValues = mapToRow(item, schema, headers);
    
    const isUpdate = item.rowIndex !== undefined;
    if (isUpdate) {
        const range = encodeURIComponent(`'${resolvedTab}'!A${item.rowIndex + 1}`);
        await googleClient.request(`${BASE_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT', body: { values: [rowValues] }
        });
    } else {
        const range = encodeURIComponent(`'${resolvedTab}'!A:Z`);
        const url = `${BASE_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        await googleClient.request(url, { method: 'POST', body: { values: [rowValues] } });
    }
    return true;
};

export const deleteRowFromSheet = async (sheetId: string, tabName: string, rowIndex: number) => {
    assertNotArchive(tabName);
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const data = await googleClient.request(`${BASE_URL}/${sheetId}?fields=sheets.properties`);
    const gridId = data.sheets?.find((s: any) => s.properties?.title.toLowerCase() === tabName.toLowerCase())?.properties.sheetId;
    if (gridId === undefined) throw new Error(`Grid ID not found for ${tabName}`);

    await googleClient.request(`${BASE_URL}/${sheetId}:batchUpdate`, {
        method: 'POST',
        body: { requests: [{ deleteDimension: { range: { sheetId: gridId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }
    });
    return true;
};

// --- Specialized Multi-Row Operations ---

export const appendJournalEntries = async (sheetId: string, tabName: string, sourceName: string, entries: Transaction[]) => {
    const schema = REGISTRY_SCHEMAS.journal;
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const headers = await fetchHeaders(sheetId, resolvedTab);
    const rows = entries.map(e => mapToRow({ ...e, source: sourceName }, schema, headers));
    const range = encodeURIComponent(`'${resolvedTab}'!A:Z`);
    await googleClient.request(`${BASE_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST', body: { values: rows }
    });
    return true;
};

export const batchUpdateLedgerValues = async (sheetId: string, tabName: string, payload: LedgerCommitPayload) => {
    assertNotArchive(tabName);
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const col = String.fromCharCode(66 + payload.monthIndex);
    const [headerRes, currentValuesRes] = await Promise.all([
        googleClient.getRange(sheetId, `'${resolvedTab}'!A:A`),
        payload.strategy === 'MERGE' ? googleClient.getRange(sheetId, `'${resolvedTab}'!${col}:${col}`) : Promise.resolve({ values: [] })
    ]);
    const rows = headerRes.values || [];
    const currentValues = currentValuesRes.values || [];
    const dataUpdates: any[] = [];
    payload.updates.forEach(u => {
        const idx = rows.findIndex((r: any[]) => (r[0] || '').trim().toLowerCase() === u.ledgerSubCategory.toLowerCase());
        if (idx !== -1) {
            let val = u.value;
            if (payload.strategy === 'MERGE') val += parseNumber(currentValues[idx]?.[0]);
            dataUpdates.push({ range: `'${resolvedTab}'!${col}${idx + 1}`, values: [[val]] });
        }
    });
    if (dataUpdates.length > 0) {
        await googleClient.request(`${BASE_URL}/${sheetId}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'USER_ENTERED', data: dataUpdates } });
    }
    return true;
};

export const updateLedgerValue = async (sheetId: string, tabName: string, category: string, subCategory: string, monthIndex: number, value: number) => {
    return batchUpdateLedgerValues(sheetId, tabName, { monthIndex, strategy: 'OVERWRITE', updates: [{ ledgerCategory: category, ledgerSubCategory: subCategory, value }] });
};

/**
 * Executes a full yearly rollover.
 * 1. Clones Income/Expense sheets to [Name]-[YY] archives.
 * 2. Protects the newly created archive sheets.
 * 3. Updates month headers with the new year (e.g., Jan-25).
 * 4. Resets numeric values in month columns (B-M) for rows with categories, skipping parents/totals.
 */
export const resetYearlyLedger = async (spreadsheetId: string, incomeTab: string, expenseTab: string, targetYear: number) => {
    // Phase 1: Archive creation
    const metadata = await googleClient.request(`${BASE_URL}/${spreadsheetId}?fields=sheets.properties`);
    const sheets = metadata.sheets || [];
    
    const findId = (name: string) => sheets.find((s: any) => s.properties.title.toLowerCase() === name.toLowerCase())?.properties.sheetId;
    
    const incomeId = findId(incomeTab);
    const expenseId = findId(expenseTab);
    
    if (incomeId === undefined || expenseId === undefined) {
        throw new Error("Unable to locate active Ledger tabs for rollover.");
    }

    const archiveYearSuffix = String(targetYear - 1).slice(-2);
    const nextYearSuffix = String(targetYear).slice(-2);
    
    const duplicateRes = await googleClient.request(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: {
            requests: [
                { duplicateSheet: { sourceSheetId: incomeId, newSheetName: `${incomeTab}-${archiveYearSuffix}`, insertSheetIndex: 0 } },
                { duplicateSheet: { sourceSheetId: expenseId, newSheetName: `${expenseTab}-${archiveYearSuffix}`, insertSheetIndex: 0 } }
            ]
        }
    });

    const archiveIncomeId = duplicateRes.replies[0].duplicateSheet.properties.sheetId;
    const archiveExpenseId = duplicateRes.replies[1].duplicateSheet.properties.sheetId;

    // Phase 2: Protection and Reset
    const [incomeColA, expenseColA] = await Promise.all([
        googleClient.getRange(spreadsheetId, `'${incomeTab}'!A:A`),
        googleClient.getRange(spreadsheetId, `'${expenseTab}'!A:A`)
    ]);

    const incomeRows = incomeColA.values || [];
    const expenseRows = expenseColA.values || [];
    const monthHeaders = MONTH_NAMES_TITLED.map(m => `${m}-${nextYearSuffix}`);

    const requests: any[] = [];

    // 1. Apply Protections to Archives
    [archiveIncomeId, archiveExpenseId].forEach(id => {
        requests.push({
            addProtectedRange: {
                protectedRange: {
                    range: { sheetId: id },
                    description: "Immutable Financial Archive",
                    warningOnly: false
                }
            }
        });
    });

    const buildUpdates = (sheetId: number, rowData: any[][], headerRows: number[]) => {
        const updates: any[] = [];
        
        // Update Headers
        headerRows.forEach(rowIdx => {
            updates.push({
                updateCells: {
                    range: { sheetId, startRowIndex: rowIdx - 1, endRowIndex: rowIdx, startColumnIndex: 1, endColumnIndex: 13 },
                    rows: [{ values: monthHeaders.map(h => ({ userEnteredValue: { stringValue: h } })) }],
                    fields: "userEnteredValue"
                }
            });
        });

        // Wipe Data Rows
        rowData.forEach((row, idx) => {
            const rowNumber = idx + 1;
            const category = (row[0] || '').trim();
            const lowerCat = category.toLowerCase();
            
            // Logic: Wipe if it has a category name, is not a designated header, 
            // and is not a "Total" or "Summary" line.
            const isDataRow = category && 
                              !headerRows.includes(rowNumber) && 
                              !lowerCat.includes('total') && 
                              !lowerCat.includes('summary');

            if (isDataRow) {
                // Peek ahead: if the next row is not empty AND looks like a sub-category (indented or child), 
                // this might be a parent with formulas. 
                // Heuristic: If it has "Categories" in text, it's a section header.
                if (lowerCat.includes('categories')) return;

                updates.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: idx, endRowIndex: idx + 1, startColumnIndex: 1, endColumnIndex: 13 },
                        cell: { userEnteredValue: { numberValue: 0 } },
                        fields: "userEnteredValue"
                    }
                });
            }
        });

        return updates;
    };

    // Income Map: Headers at 3 and 9 (1-indexed)
    requests.push(...buildUpdates(incomeId, incomeRows, [3, 9]));
    
    // Expense Map: Header at 6 (1-indexed)
    requests.push(...buildUpdates(expenseId, expenseRows, [6]));

    await googleClient.request(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: { requests }
    });

    return true;
};
