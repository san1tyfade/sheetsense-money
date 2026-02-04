
import { Asset, Trade, Subscription, BankAccount, Investment } from '../../types';

export const EntityFactory = {
    createAsset: (overrides: Partial<Asset> = {}): Asset => ({
        id: crypto.randomUUID(),
        name: 'Mock Asset',
        type: 'Cash',
        value: 1000,
        currency: 'CAD',
        ...overrides
    }),

    createTrade: (overrides: Partial<Trade> = {}): Trade => ({
        id: crypto.randomUUID(),
        date: '2024-01-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150,
        total: 1500,
        ...overrides
    }),

    createSubscription: (overrides: Partial<Subscription> = {}): Subscription => ({
        id: crypto.randomUUID(),
        name: 'Netflix',
        cost: 20,
        period: 'Monthly',
        category: 'Entertainment',
        active: true,
        ...overrides
    }),

    createInvestment: (overrides: Partial<Investment> = {}): Investment => ({
        id: crypto.randomUUID(),
        ticker: 'BTC',
        name: 'Bitcoin',
        quantity: 0.5,
        avgPrice: 40000,
        currentPrice: 60000,
        accountName: 'Coinbase',
        assetClass: 'Crypto',
        ...overrides
    })
};
