import { Asset, Investment, Trade, Subscription, BankAccount, JournalEntry, NetWorthEntry, PortfolioLogEntry } from '../types';
import { resolveAssetType } from '../services/domain/classificationHub';

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'ticker';

export interface FieldDefinition {
    keys: string[];
    type: FieldType;
    required?: boolean;
    fallback?: any;
}

export interface SchemaDefinition {
    id: string;
    fields: Record<string, FieldDefinition>;
    columns: { key: string; header: string; type?: FieldType }[];
    postProcess?: (item: any) => any;
}

export const REGISTRY_SCHEMAS: Record<string, SchemaDefinition> = {
    assets: {
        id: 'assets',
        fields: {
            name: { keys: ['asset name', 'name', 'account', 'asset', 'item', 'description', 'holding', 'security', 'symbol/name'], type: 'string', required: true },
            type: { keys: ['asset category', 'type', 'category', 'class', 'asset type', 'kind', 'asset class'], type: 'string', fallback: 'Other' },
            value: { keys: ['value', 'amount', 'balance', 'current value', 'market value', 'total', 'market val'], type: 'number' },
            currency: { keys: ['currency', 'curr', 'ccy'], type: 'string', fallback: 'CAD' },
            lastUpdated: { keys: ['date updated', 'last updated', 'date', 'updated', 'as of'], type: 'date' }
        },
        columns: [
            { key: 'name', header: 'Asset Name' },
            { key: 'type', header: 'Category' },
            { key: 'value', header: 'Value', type: 'number' },
            { key: 'currency', header: 'Currency' },
            { key: 'lastUpdated', header: 'Last Updated', type: 'date' }
        ],
        postProcess: (item: Asset) => {
            item.type = resolveAssetType(item.name, item.type);
            return item;
        }
    },
    investments: {
        id: 'investments',
        fields: {
            ticker: { keys: ['ticker', 'symbol', 'code', 'stock', 'instrument', 'asset', 'holding', 'symbol/name'], type: 'ticker' },
            name: { keys: ['name', 'description', 'investment', 'security', 'company', 'symbol/name'], type: 'string' },
            quantity: { keys: ['quantity', 'qty', 'units', 'shares', 'count'], type: 'number', fallback: 0 },
            avgPrice: { keys: ['avg price', 'average price', 'avg cost', 'unit cost', 'average cost', 'average cos'], type: 'number', fallback: 0 },
            bookValue: { keys: ['book value', 'total cost', 'acb', 'cost basis'], type: 'number', fallback: 0 },
            currentPrice: { keys: ['current price', 'price', 'market price', 'market value', 'unit price', 'last price'], type: 'number', fallback: 0 },
            accountName: { keys: ['account', 'account name', 'location', 'held in', 'portfolio'], type: 'string', fallback: 'Uncategorized' },
            assetClass: { keys: ['asset class', 'class', 'type', 'category', 'sector'], type: 'string', fallback: 'Other' },
            marketValue: { keys: ['market value', 'value', 'total value', 'market val'], type: 'number', fallback: 0 },
            nativeCurrency: { keys: ['currency', 'curr', 'ccy'], type: 'string' }
        },
        columns: [
            { key: 'ticker', header: 'Ticker', type: 'ticker' },
            { key: 'name', header: 'Description' },
            { key: 'quantity', header: 'Qty', type: 'number' },
            { key: 'avgPrice', header: 'Avg Price', type: 'number' },
            { key: 'currentPrice', header: 'Market Price', type: 'number' },
            { key: 'marketValue', header: 'Market Value', type: 'number' },
            { key: 'bookValue', header: 'Book Cost', type: 'number' },
            { key: 'accountName', header: 'Account' },
            { key: 'assetClass', header: 'Class' },
            { key: 'nativeCurrency', header: 'Curr' }
        ],
        postProcess: (item: Investment) => {
            if (!item.ticker && item.name) item.ticker = item.name.toUpperCase();
            if ((!item.avgPrice || item.avgPrice === 0) && item.bookValue && item.quantity > 0) item.avgPrice = item.bookValue / item.quantity;
            return item;
        }
    },
    trades: {
        id: 'trades',
        fields: {
            date: { keys: ['transaction date', 'trade date', 'date', 'time', 'executed'], type: 'date', required: true },
            ticker: { keys: ['asset symbol', 'ticker', 'symbol', 'code', 'asset', 'product', 'security', 'instrument'], type: 'ticker', required: true },
            type: { keys: ['type', 'action', 'side', 'transaction', 'buy/sell'], type: 'string', fallback: 'BUY' },
            quantity: { keys: ['shares', 'quantity', 'qty', 'units', 'volume'], type: 'number', fallback: 0 },
            price: { keys: ['purchase', 'purchase price', 'buy price', 'execution price', 'exec price', 'unit cost', 'cost', 'unit price', 'fill price', 'price', 'amount', 'rate'], type: 'number', fallback: 0 },
            marketPrice: { keys: ['market price', 'current price', 'last price', 'current', 'close', 'live price', 'mark'], type: 'number' },
            total: { keys: ['book value', 'total', 'value', 'total value', 'net amount', 'settlement'], type: 'number', fallback: 0 },
            fee: { keys: ['fee', 'commission', 'transaction fee'], type: 'number', fallback: 0 },
            account: { keys: ['account', 'portfolio', 'held in', 'source'], type: 'string', fallback: 'Crypto Core' }
        },
        columns: [
            { key: 'date', header: 'Date', type: 'date' },
            { key: 'ticker', header: 'Ticker', type: 'ticker' },
            { key: 'type', header: 'Action' },
            { key: 'quantity', header: 'Qty', type: 'number' },
            { key: 'price', header: 'Price', type: 'number' },
            { key: 'total', header: 'Total Value', type: 'number' },
            { key: 'fee', header: 'Fee', type: 'number' },
            { key: 'account', header: 'Account' }
        ],
        postProcess: (item: Trade) => {
            const raw = String(item.type).toUpperCase();
            if (!raw.includes('BUY') && !raw.includes('SELL')) item.type = item.quantity < 0 ? 'SELL' : 'BUY';
            item.quantity = Math.abs(item.quantity);
            return item;
        }
    },
    subscriptions: {
        id: 'subscriptions',
        fields: {
            name: { keys: ['name', 'service', 'subscription', 'item', 'merchant', 'description'], type: 'string', required: true },
            cost: { keys: ['cost', 'price', 'amount', 'monthly cost', 'value', 'payment'], type: 'number', required: true },
            period: { keys: ['period', 'frequency', 'billing cycle'], type: 'string', fallback: 'Monthly' },
            category: { keys: ['category', 'type', 'kind'], type: 'string', fallback: 'General' },
            active: { keys: ['active', 'status'], type: 'boolean', fallback: true },
            paymentMethod: { keys: ['payment method', 'account', 'card', 'source'], type: 'string' }
        },
        columns: [
            { key: 'name', header: 'Service' },
            { key: 'cost', header: 'Cost', type: 'number' },
            { key: 'period', header: 'Period' },
            { key: 'category', header: 'Category' },
            { key: 'paymentMethod', header: 'Payment Method' },
            { key: 'active', header: 'Active', type: 'boolean' }
        ]
    },
    accounts: {
        id: 'accounts',
        fields: {
            institution: { keys: ['institution name', 'bank name', 'institution', 'bank', 'provider', 'source'], type: 'string', required: true },
            name: { keys: ['nickname', 'label', 'account name', 'account'], type: 'string', fallback: 'Account' },
            type: { keys: ['account type', 'type', 'category'], type: 'string', fallback: 'Checking' },
            paymentType: { keys: ['payment type', 'method', 'network', 'card type'], type: 'string', fallback: 'Card' },
            accountNumber: { keys: ['account number', 'number', 'last 4', 'card number'], type: 'string', fallback: '****' },
            transactionType: { keys: ['transaction type', 'class', 'entry type'], type: 'string' },
            currency: { keys: ['currency', 'curr', 'ccy'], type: 'string', fallback: 'CAD' },
            purpose: { keys: ['purpose', 'description', 'usage', 'merchant'], type: 'string', fallback: 'General' }
        },
        columns: [
            { key: 'institution', header: 'Institution' },
            { key: 'name', header: 'Account Name' },
            { key: 'type', header: 'Account Type' },
            { key: 'accountNumber', header: 'Number / Last 4' },
            { key: 'currency', header: 'Currency' },
            { key: 'paymentType', header: 'Payment Type' },
            { key: 'purpose', header: 'Purpose' }
        ]
    },
    journal: {
        id: 'journal',
        fields: {
            date: { keys: ['date', 'timestamp', 'transaction date'], type: 'date', required: true },
            description: { keys: ['description', 'merchant', 'item', 'vendor'], type: 'string', required: true },
            canonicalName: { keys: ['unified identity', 'canonical name', 'clean merchant', 'brand'], type: 'string' },
            category: { keys: ['category', 'type', 'group'], type: 'string', fallback: 'Uncategorized' },
            subCategory: { keys: ['sub-category', 'subcategory', 'sub category', 'label'], type: 'string', fallback: 'Other' },
            amount: { keys: ['amount', 'value', 'cost', 'total'], type: 'number', required: true },
            source: { keys: ['source', 'account', 'bank', 'card'], type: 'string' },
            transactionId: { keys: ['transaction id', 'id', 'txid', 'reference'], type: 'string' }
        },
        columns: [
            { key: 'date', header: 'Date', type: 'date' },
            { key: 'description', header: 'Description' },
            { key: 'amount', header: 'Amount', type: 'number' },
            { key: 'category', header: 'Category' },
            { key: 'subCategory', header: 'Sub-Category' },
            { key: 'source', header: 'Source' },
            { key: 'transactionId', header: 'Transaction ID' },
            { key: 'canonicalName', header: 'Canonical Name' }
        ]
    },
    logData: {
        id: 'logData',
        fields: {
            date: { keys: ['date', 'time', 'timestamp', 'week ending'], type: 'date', required: true },
            value: { keys: ['net worth', 'total', 'value', 'amount', 'balance', 'equity'], type: 'number', required: true }
        },
        columns: [
            { key: 'date', header: 'Date', type: 'date' },
            { key: 'value', header: 'Net Worth', type: 'number' }
        ]
    },
    portfolioLog: {
        id: 'portfolioLog',
        fields: {
            date: { keys: ['date', 'time', 'timestamp', 'week ending'], type: 'date', required: true },
            value_marker: { keys: ['value', 'balance', 'amount'], type: 'string' }
        },
        columns: [
            { key: 'date', header: 'Date', type: 'date' },
            { key: 'value_marker', header: 'Total Value' }
        ]
    }
};