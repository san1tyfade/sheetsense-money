
export class SheetLink {
    private static BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

    static values(sheetId: string, range: string) {
        return `${this.BASE}/${sheetId}/values/${encodeURIComponent(range)}`;
    }

    static batchUpdate(sheetId: string) {
        return `${this.BASE}/${sheetId}:batchUpdate`;
    }

    static metadata(sheetId: string, fields?: string) {
        return `${this.BASE}/${sheetId}${fields ? `?fields=${fields}` : ''}`;
    }

    /**
     * Standardizes range strings: 'Tab Name'!A1:Z100
     */
    static range(tab: string, cellRange: string = 'A1:ZZ') {
        return `'${tab}'!${cellRange}`;
    }

    /**
     * Formats col/row coordinates for specific cell updates
     */
    static cell(tab: string, col: string, row: number) {
        return `'${tab}'!${col}${row}`;
    }
}
