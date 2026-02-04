
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
    const range = encodeURIComponent(`'${tabName}'!A1:ZZ`);
    const data = await googleClient.request(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`
    );

    if (!data.values) {
        console.warn(`Tab '${tabName}' exists but returned no values.`);
        return '';
    }
    return jsonToCsv(data.values);
};

/**
 * Probes the spreadsheet to determine the currently active financial year.
 * This ensures cross-device sync when a year is rolled over.
 */
export const detectActiveYearFromSheet = async (sheetId: string, incomeTab: string): Promise<number | null> => {
    try {
        const range = encodeURIComponent(`'${incomeTab}'!B3`);
        const data = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`
        );
        
        const header = data.values?.[0]?.[0];
        if (!header) return null;

        // Standardized year detection regex
        const yearMatch = header.match(/[ \-]+(\d{2,4})$/);
        if (yearMatch) {
            const yearPart = yearMatch[1];
            return yearPart.length === 2 ? 2000 + parseInt(yearPart) : parseInt(yearPart);
        }
        return null;
    } catch (e) {
        console.warn("Year detection failed", e);
        return null;
    }
};

/**
 * Fetches metadata for all tabs in the spreadsheet.
 */
export const fetchTabNames = async (sheetId: string): Promise<string[]> => {
    try {
        const data = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`
        );
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
        const range = encodeURIComponent("'" + tabName + "'!A1");
        await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`
        );
        return true;
    } catch (e) {
        return false;
    }
};
