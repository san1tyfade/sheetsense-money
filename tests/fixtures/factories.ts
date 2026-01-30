
import {
    Transaction,
    Investment,
    Asset,
    JournalEntry,
    UnifiedFinancialStore,
    INITIAL_FINANCIAL_STORE
} from '../../types';

export const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: `tx_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0],
    description: 'Test Transaction',
    amount: 100,
    category: 'General',
    type: 'EXPENSE',
    ...overrides
});

export const createMockInvestment = (overrides: Partial<Investment> = {}): Investment => ({
    id: `inv_${Math.random().toString(36).substr(2, 9)}`,
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    avgPrice: 150,
    currentPrice: 160,
    accountName: 'TFSA',
    assetClass: 'Equity',
    marketValue: 1600,
    nativeCurrency: 'USD',
    isManaged: true,
    ...overrides
});

export const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
    id: `asset_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Main Condo',
    type: 'Real Estate',
    value: 500000,
    currency: 'CAD',
    isManaged: true,
    ...overrides
});

export const createMockJournalEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
    id: `je_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0],
    description: 'Monthly Rent',
    category: 'Housing',
    subCategory: 'Rent',
    amount: 2000,
    source: 'Chequing',
    transactionId: 'tx_123',
    isManaged: true,
    ...overrides
});

export const createMockStore = (overrides: Partial<UnifiedFinancialStore> = {}): UnifiedFinancialStore => ({
    ...INITIAL_FINANCIAL_STORE,
    ...overrides
});
