
import { Transaction, LedgerCommitPayload } from '../types';
import { parseNumber, normalizeHeader, MONTH_NAMES_TITLED } from './parsers/parserUtils';
import { googleClient } from './infrastructure/GoogleClient';
import { REGISTRY_SCHEMAS, SchemaDefinition } from '../config/RegistrySchemas';
import { resolveTabName } from './sheetService';

const assertNotArchive = (tabName: string) => {
    const isArchive = /[ \-]+(\d{2}|\d{4})$/.test(tabName.trim());
    if (isArchive) throw new Error(`CRITICAL: Write-lock violation on immutable archive: ${tabName}`);
};

/**
 * UniversalWriter: The Schema-Driven Mapper
 */
const mapToRow = (item: any, schema: SchemaDefinition, headers: string[]) => {
    const row = new Array(headers.length).fill(null);
    const normalizedHeaders = headers.map(normalizeHeader);

    Object.entries(schema.fields).forEach(([fieldKey, def]) => {
        const value = item[fieldKey];
        if (value === undefined) return;

        const normalizedKeys = def.keys.map(normalizeHeader);

        let idx = normalizedHeaders.findIndex((h, i) => row[i] === null && normalizedKeys.some(k => h === k));
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
    const data = await googleClient.getRange(sheetId, googleClient.formatRange(tabName, 'A1:Z10'));
    const rows = data.values || [];
    return rows.reduce((best: string[], current: string[]) => {
        const currentCount = current.filter(v => v && isNaN(Number(v))).length;
        const bestCount = best.filter(v => v && isNaN(Number(v))).length;
        return currentCount > bestCount ? current : best;
    }, rows[0]) || [];
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
        await googleClient.updateRange(sheetId, googleClient.formatRange(resolvedTab, `A${item.rowIndex + 1}`), [rowValues]);
    } else {
        await googleClient.appendRange(sheetId, resolvedTab, [rowValues]);
    }
    return true;
};

export const deleteRowFromSheet = async (sheetId: string, tabName: string, rowIndex: number) => {
    assertNotArchive(tabName);
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const data = await googleClient.getMetadata(sheetId, 'sheets.properties');
    const gridId = data.sheets?.find((s: any) => s.properties?.title.toLowerCase() === resolvedTab.toLowerCase())?.properties.sheetId;
    if (gridId === undefined) throw new Error(`Grid ID not found for ${resolvedTab}`);

    await googleClient.batchUpdate(sheetId, [{ deleteDimension: { range: { sheetId: gridId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }]);
    return true;
};

export const appendJournalEntries = async (sheetId: string, tabName: string, sourceName: string, entries: Transaction[]) => {
    const schema = REGISTRY_SCHEMAS.journal;
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const headers = await fetchHeaders(sheetId, resolvedTab);
    const rows = entries.map(e => mapToRow({ ...e, source: sourceName }, schema, headers));
    await googleClient.appendRange(sheetId, resolvedTab, rows);
    return true;
};

export const batchUpdateLedgerValues = async (sheetId: string, tabName: string, payload: LedgerCommitPayload) => {
    assertNotArchive(tabName);
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const col = String.fromCharCode(66 + payload.monthIndex);
    const [headerRes, currentValuesRes] = await Promise.all([
        googleClient.getRange(sheetId, googleClient.formatRange(resolvedTab, 'A:A')),
        payload.strategy === 'MERGE' ? googleClient.getRange(sheetId, googleClient.formatRange(resolvedTab, `${col}:${col}`)) : Promise.resolve({ values: [] })
    ]);
    const rows = headerRes.values || [];
    const currentValues = currentValuesRes.values || [];
    const dataUpdates: any[] = [];
    payload.updates.forEach(u => {
        const idx = rows.findIndex((r: any[]) => (r[0] || '').trim().toLowerCase() === u.ledgerSubCategory.toLowerCase());
        if (idx !== -1) {
            let val = u.value;
            if (payload.strategy === 'MERGE') val += parseNumber(currentValues[idx]?.[0]);
            dataUpdates.push({ range: googleClient.formatRange(resolvedTab, `${col}${idx + 1}`), values: [[val]] });
        }
    });
    if (dataUpdates.length > 0) {
        await googleClient.batchUpdateValues(sheetId, dataUpdates);
    }
    return true;
};

export const updateLedgerValue = async (sheetId: string, tabName: string, category: string, subCategory: string, monthIndex: number, value: number) => {
    return batchUpdateLedgerValues(sheetId, tabName, { monthIndex, strategy: 'OVERWRITE', updates: [{ ledgerCategory: category, ledgerSubCategory: subCategory, value }] });
};

export const resetYearlyLedger = async (spreadsheetId: string, incomeTab: string, expenseTab: string, targetYear: number) => {
    const metadata = await googleClient.getMetadata(spreadsheetId, 'sheets.properties');
    const sheets = metadata.sheets || [];

    const findId = (name: string) => sheets.find((s: any) => s.properties.title.toLowerCase() === name.toLowerCase())?.properties.sheetId;

    const incomeId = findId(incomeTab);
    const expenseId = findId(expenseTab);

    if (incomeId === undefined || expenseId === undefined) {
        throw new Error("Unable to locate active Ledger tabs for rollover.");
    }

    const archiveYearSuffix = String(targetYear - 1).slice(-2);
    const nextYearSuffix = String(targetYear).slice(-2);

    const duplicateRes = await googleClient.batchUpdate(spreadsheetId, [
        { duplicateSheet: { sourceSheetId: incomeId, newSheetName: `${incomeTab}-${archiveYearSuffix}`, insertSheetIndex: 0 } },
        { duplicateSheet: { sourceSheetId: expenseId, newSheetName: `${expenseTab}-${archiveYearSuffix}`, insertSheetIndex: 0 } }
    ]);

    const archiveIncomeId = duplicateRes.replies[0].duplicateSheet.properties.sheetId;
    const archiveExpenseId = duplicateRes.replies[1].duplicateSheet.properties.sheetId;

    const [incomeColA, expenseColA] = await Promise.all([
        googleClient.getRange(spreadsheetId, googleClient.formatRange(incomeTab, 'A:A')),
        googleClient.getRange(spreadsheetId, googleClient.formatRange(expenseTab, 'A:A'))
    ]);

    const incomeRows = incomeColA.values || [];
    const expenseRows = expenseColA.values || [];
    const monthHeaders = MONTH_NAMES_TITLED.map(m => `${m}-${nextYearSuffix}`);

    const requests: any[] = [];
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
        headerRows.forEach(rowIdx => {
            updates.push({
                updateCells: {
                    range: { sheetId, startRowIndex: rowIdx - 1, endRowIndex: rowIdx, startColumnIndex: 1, endColumnIndex: 13 },
                    rows: [{ values: monthHeaders.map(h => ({ userEnteredValue: { stringValue: h } })) }],
                    fields: "userEnteredValue"
                }
            });
        });
        rowData.forEach((row, idx) => {
            const rowNumber = idx + 1;
            const category = (row[0] || '').trim();
            const lowerCat = category.toLowerCase();
            const isDataRow = category && !headerRows.includes(rowNumber) && !lowerCat.includes('total') && !lowerCat.includes('summary');
            if (isDataRow) {
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

    requests.push(...buildUpdates(incomeId, incomeRows, [3, 9]));
    requests.push(...buildUpdates(expenseId, expenseRows, [6]));

    await googleClient.batchUpdate(spreadsheetId, requests);

    return true;
};
