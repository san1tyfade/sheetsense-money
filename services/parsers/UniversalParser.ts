import { SchemaDefinition, FieldType } from '../../config/RegistrySchemas';
import { 
    parseNumber, resolveColumnIndex, 
    generateId, normalizeTicker, detectTickerCurrency 
} from './parserUtils';
import { TemporalSovereign } from '../temporalService';

/**
 * UniversalParser: The Ingestion Sovereign
 * Uses schema metadata to transform raw CSV rows into typed objects.
 */
export class UniversalParser {
    /**
     * Entry point for standard registry parsing.
     */
    static parse<T>(rows: string[][], headerIndex: number, schema: SchemaDefinition): T[] {
        if (rows.length <= headerIndex) return [];
        
        const headers = rows[headerIndex];
        const indices = this.resolveIndices(headers, schema);
        const results: T[] = [];

        for (let i = headerIndex + 1; i < rows.length; i++) {
            const values = rows[i];
            if (this.isEmptyRow(values)) continue;

            const item = this.mapRowToSchema(values, indices, schema);
            if (item) {
                (item as any).id = generateId();
                (item as any).rowIndex = i;
                
                const finalItem = schema.postProcess ? schema.postProcess(item) : item;
                results.push(finalItem as T);
            }
        }

        return results;
    }

    private static resolveIndices(headers: string[], schema: SchemaDefinition): Record<string, number> {
        const indices: Record<string, number> = {};
        Object.entries(schema.fields).forEach(([prop, def]) => {
            indices[prop] = resolveColumnIndex(headers, def.keys);
        });
        return indices;
    }

    private static mapRowToSchema(values: string[], indices: Record<string, number>, schema: SchemaDefinition): any | null {
        const obj: any = {};
        let hasRequiredData = true;

        Object.entries(schema.fields).forEach(([prop, def]) => {
            const idx = indices[prop];
            const rawValue = idx !== -1 ? values[idx] : undefined;
            
            const processedValue = this.convertValue(rawValue, def.type, def.fallback);
            
            if (def.required) {
                const isEmpty = processedValue === undefined || processedValue === null || processedValue === '';
                if (isEmpty) {
                    hasRequiredData = false;
                }
            }
            
            obj[prop] = processedValue;
        });

        if (schema.id === 'investments' && obj.ticker && !obj.nativeCurrency) {
            obj.nativeCurrency = detectTickerCurrency(obj.ticker, obj.accountName);
        }

        return hasRequiredData ? obj : null;
    }

    private static convertValue(value: string | undefined, type: FieldType, fallback: any): any {
        if (value === undefined || value === '') return fallback;

        switch (type) {
            case 'number':
                return parseNumber(value);
            case 'date':
                return TemporalSovereign.parseFlexible(value) || fallback;
            case 'boolean':
                const low = value.toLowerCase();
                if (['true', 'yes', 'active', '1'].includes(low)) return true;
                if (['false', 'no', 'inactive', '0', 'cancelled'].includes(low)) return false;
                return fallback;
            case 'ticker':
                return normalizeTicker(value);
            case 'string':
            default:
                return value.trim();
        }
    }

    private static isEmptyRow(values: string[]): boolean {
        return values.every(v => !v || v.trim() === '');
    }
}
