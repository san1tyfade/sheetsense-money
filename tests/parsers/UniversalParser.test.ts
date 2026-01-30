
import { describe, it, expect } from 'vitest';
import { UniversalParser } from '../../services/parsers/UniversalParser';
import { REGISTRY_SCHEMAS } from '../../config/RegistrySchemas';

describe('UniversalParser: Ingestion Guard', () => {
  const mockHeaders = ['Name', 'Category', 'Value', 'Currency', 'As Of'];
  const assetSchema = REGISTRY_SCHEMAS.assets;

  it('should correctly map columns based on fuzzy keyword matching', () => {
    const rawData = [
      mockHeaders,
      ['Checking Account', 'Cash', '5000.50', 'CAD', '2023-10-01']
    ];
    
    const results = UniversalParser.parse<any>(rawData, 0, assetSchema);
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Checking Account');
    expect(results[0].type).toBe('Cash');
    expect(results[0].value).toBe(5000.5);
    expect(results[0].currency).toBe('CAD');
  });

  it('should ignore empty rows', () => {
    const rawData = [
      mockHeaders,
      ['', '', '', '', ''],
      ['Active Asset', 'Investment', '1000', 'USD', '2023-10-01'],
      ['   ', '   ', ' ', '', '']
    ];

    const results = UniversalParser.parse(rawData, 0, assetSchema);
    expect(results).toHaveLength(1);
  });

  it('should reject rows missing required fields', () => {
    // Name is required for assets
    const rawData = [
      mockHeaders,
      ['', 'Cash', '5000', 'CAD', '2023-10-01'], // Missing Name
      ['Valid Asset', 'Cash', '1000', 'CAD', '2023-10-01']
    ];

    // Fix: Added <any> generic type to resolve "Property 'name' does not exist on type 'unknown'" error
    const results = UniversalParser.parse<any>(rawData, 0, assetSchema);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Valid Asset');
  });

  it('should handle currency symbols and formatted numbers', () => {
    const rawData = [
      mockHeaders,
      ['Formatted Asset', 'Cash', '$1,200.50', 'CAD', '2023-10-01']
    ];

    const results = UniversalParser.parse<any>(rawData, 0, assetSchema);
    expect(results[0].value).toBe(1200.5);
  });

  it('should execute post-processing logic if defined in schema', () => {
    const tradeSchema = REGISTRY_SCHEMAS.trades;
    const tradeHeaders = ['Date', 'Ticker', 'Action', 'Qty', 'Price', 'Total'];
    const rawData = [
      tradeHeaders,
      ['2023-10-01', 'BTC', 'SELL', '-0.5', '60000', '30000']
    ];

    const results = UniversalParser.parse<any>(rawData, 0, tradeSchema);
    
    // Post-process for trades: Math.abs(quantity)
    expect(results[0].quantity).toBe(0.5);
    expect(results[0].type).toBe('SELL');
  });

  it('should handle numeric ticker names gracefully', () => {
    const tradeSchema = REGISTRY_SCHEMAS.trades;
    const tradeHeaders = ['Date', 'Ticker', 'Action', 'Qty', 'Price', 'Total'];
    const rawData = [
      tradeHeaders,
      ['2023-10-01', '3991', 'BUY', '100', '10', '1000']
    ];

    const results = UniversalParser.parse<any>(rawData, 0, tradeSchema);
    expect(results[0].ticker).toBe('3991');
  });
});
