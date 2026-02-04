import { SchemaDefinition } from '../../config/RegistrySchemas';
import { normalizeHeader } from '../parsers/parserUtils';

/**
 * Universal Mapper:
 * Centralizes all Logic for converting Objects <-> Spreadsheet Rows.
 * Replaces ad-hoc parsing and mapping logic.
 */
export const SchemaMapper = {
    /**
     * Converts a typed object into a Spreadsheet Row (Array).
     * @param schema The Schema definition (with 'columns')
     * @param item The data object to map
     * @param existingHeaders Optional: If provided, attempts to map to existing headers first (for appending to messy sheets). 
     *                        If not provided (or exact match required), uses schema.columns order.
     */
    toRow: (schema: SchemaDefinition, item: any, existingHeaders?: string[]): any[] => {
        // If we have strict column definitions and no variable headers, use strict mode (faster, cleaner)
        if (!existingHeaders && schema.columns) {
            return schema.columns.map(col => {
                const val = item[col.key];
                if (val === undefined || val === null) return '';
                if (col.type === 'boolean') return val ? 'TRUE' : 'FALSE';
                return val;
            });
        }

        // Variable Header Mode (Legacy compatibility or dynamic sheets)
        // This reproduces the logic from the old sheetWriteService logic but cleaner.
        const headers = (existingHeaders || []).map(normalizeHeader);
        const row = new Array(headers.length).fill(null);

        // 1. Map columns defined in schema
        Object.entries(schema.fields).forEach(([fieldKey, def]) => {
            const value = item[fieldKey];
            if (value === undefined) return;

            const normalizedKeys = def.keys.map(normalizeHeader);

            // Pass 1: Exact mapping match
            let idx = headers.findIndex((h, i) => row[i] === null && normalizedKeys.some(k => h === k));

            // Pass 2: Fuzzy multi-word match
            if (idx === -1) {
                idx = headers.findIndex((h, i) =>
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
    },

    /**
     * Extracts strict standard headers from schema.
     */
    toHeaders: (schema: SchemaDefinition): string[] => {
        if (!schema.columns) return [];
        return schema.columns.map(c => c.header);
    },

    /**
     * Converts a Spreadsheet Row (Array) into a Typed Object.
     * @param schema The Schema definition
     * @param row The raw array of strings/numbers from the sheet
     * @param headers The headers array detected from the sheet (to map columns to fields)
     */
    fromRow: <T>(schema: SchemaDefinition, row: any[], headers: string[]): T => {
        const item: any = {};
        const normalizedHeaders = headers.map(normalizeHeader);

        Object.entries(schema.fields).forEach(([fieldKey, def]) => {
            const normalizedKeys = def.keys.map(normalizeHeader);

            // Find index of this field in the passed row data
            // (Same fuzzy logic as toRow, but looking at the * शीट's * headers)
            let idx = normalizedHeaders.findIndex(h => normalizedKeys.some(k => h === k));
            if (idx === -1) {
                idx = normalizedHeaders.findIndex(h => normalizedKeys.some(k => k.length > 3 && (h.includes(k) || k.includes(h))));
            }

            if (idx !== -1) {
                const rawVal = row[idx];
                if (rawVal !== undefined && rawVal !== '') {
                    if (def.type === 'number') {
                        // Parse number logic (simplified)
                        const clean = String(rawVal).replace(/[$, ]/g, '');
                        const num = parseFloat(clean);
                        item[fieldKey] = isNaN(num) ? (def.fallback ?? 0) : num;
                    } else if (def.type === 'boolean') {
                        item[fieldKey] = String(rawVal).toLowerCase() === 'true';
                    } else if (def.type === 'date') {
                        item[fieldKey] = rawVal; // Dates usually handled by higher level parsing or left as string to parse later
                    } else {
                        item[fieldKey] = rawVal;
                    }
                } else if (def.required === false && def.fallback !== undefined) {
                    item[fieldKey] = def.fallback;
                }
            } else if (def.fallback !== undefined) {
                item[fieldKey] = def.fallback;
            }
        });

        if (schema.postProcess) {
            return schema.postProcess(item);
        }
        return item as T;
    }
};
