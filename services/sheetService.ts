
import { googleClient } from './infrastructure/GoogleClient';

/**
 * Utility to extract the Sheet ID from a URL or raw string.
 */
export const extractSheetId = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    const cleanInput = input.trim();
    const urlMatch = cleanInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    const validIdRegex = /^[a-zA-Z0-9\-_]{30,100}$/;
    return validIdRegex.test(cleanInput) ? cleanInput : '';
};

/**
 * Resolves a tab name to its actual case-sensitive match in the spreadsheet.
 */
export const resolveTabName = async (sheetId: string, tabName: string): Promise<string> => {
    try {
        const data = await googleClient.getMetadata(sheetId, 'sheets.properties.title');
        const match = data.sheets?.find((s: any) => s.properties?.title.toLowerCase() === tabName.toLowerCase());
        return match ? match.properties.title : tabName;
    } catch {
        return tabName;
    }
};

/**
 * Converts Google Sheets API v4 JSON response (values[][]) to a CSV string.
 */
const jsonToCsv = (rows: any[][]): string => {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    return rows.map(row =>
        (Array.isArray(row) ? row : []).map(cell => {
            const str = (cell === null || cell === undefined) ? '' : String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
};

/**
 * Fetches data from a specific tab in the spreadsheet.
 */
export const fetchSheetData = async (sheetId: string, tabName: string): Promise<string> => {
    const resolvedTab = await resolveTabName(sheetId, tabName);
    const data = await googleClient.getRange(sheetId, googleClient.formatRange(resolvedTab));

    if (!data.values) {
        console.warn(`Tab '${resolvedTab}' exists but returned no values.`);
        return '';
    }
    return jsonToCsv(data.values);
};



/**
 * Fetches metadata for all tabs in the spreadsheet.
 */
export const fetchTabNames = async (sheetId: string): Promise<string[]> => {
    try {
        const data = await googleClient.getMetadata(sheetId, 'sheets.properties.title');
        return data.sheets?.map((s: any) => s.properties?.title) || [];
    } catch (e) {
        console.error("Failed to fetch tab names", e);
        return [];
    }
};

/**
 * Minimal validation for tab existence.
 */
export const validateSheetTab = async (sheetId: string, tabName: string): Promise<boolean> => {
    try {
        const resolvedTab = await resolveTabName(sheetId, tabName);
        await googleClient.getRange(sheetId, googleClient.formatRange(resolvedTab, 'A1'));
        return true;
    } catch (e) {
        return false;
    }
};
