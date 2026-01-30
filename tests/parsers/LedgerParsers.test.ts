import { describe, it, expect } from 'vitest';
import { parseDetailedExpenses } from '../../services/parsers/ledgerParsers';

describe('LedgerParsers: Matrix Resolution', () => {
  const DIRTY_LEDGER_CSV = [
    'SPENDING LEDGER - FY 2024',
    'Category,Jan-24,Feb-24,Mar-24',
    'HOUSING,,,', // Header row (no data)
    '  Rent,$2500.00,$2500.00,$2500.00',
    '  Utilities," 150.50 ", "120.00", "130.00"',
    'FOOD & DINING,,,', // Header row
    '  Groceries,500.25, 450.00 , 600.10',
    'TOTAL MONTHLY,3150.75,3070.00,3230.10'
  ];

  it('should correctly identify parent categories based on header heuristic', () => {
    const result = parseDetailedExpenses(DIRTY_LEDGER_CSV);
    
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe('HOUSING');
    expect(result.categories[1].name).toBe('FOOD & DINING');
  });

  it('should parse indented sub-categories and normalize dirty numeric strings', () => {
    const result = parseDetailedExpenses(DIRTY_LEDGER_CSV);
    const housing = result.categories[0];
    
    expect(housing.subCategories).toHaveLength(2);
    expect(housing.subCategories[0].name).toBe('Rent');
    expect(housing.subCategories[0].monthlyValues[0]).toBe(2500);
    
    // Test trimming and quote stripping
    expect(housing.subCategories[1].name).toBe('Utilities');
    expect(housing.subCategories[1].monthlyValues[0]).toBe(150.50);
  });

  it('should handle empty months without crashing', () => {
    const csvWithGaps = [
      'Category,Jan-24,Feb-24',
      'Fixed,,,',
      'Rent,1000,' // Missing Feb value
    ];
    const result = parseDetailedExpenses(csvWithGaps);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].subCategories[0].monthlyValues[1]).toBe(0);
  });
});