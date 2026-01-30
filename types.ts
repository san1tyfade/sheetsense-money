/**
 * Base logic for any entity managed by the Local-First system.
 */
export interface ManagedEntity {
  id: string;
  rowIndex?: number;
  isDirty?: boolean;
  isManaged?: boolean;
}

export interface Asset extends ManagedEntity {
  name: string;
  type: string;
  value: number;
  currency: string;
  lastUpdated?: string;
}

export interface Investment extends ManagedEntity {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  bookValue?: number;
  currentPrice: number;
  accountName: string;
  assetClass: string;
  marketValue?: number;
  nativeCurrency?: string;
}

export interface Trade extends ManagedEntity {
  date: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  fee?: number;
  marketPrice?: number;
  account?: string;
}

export interface Subscription extends ManagedEntity {
  name: string;
  cost: number;
  period: 'Monthly' | 'Yearly' | 'Weekly' | 'Other';
  category: string;
  active: boolean;
  paymentMethod?: string;
}

export interface BankAccount extends ManagedEntity {
  name: string;
  institution: string;
  type: string;
  paymentType: string;
  accountNumber: string;
  transactionType: string;
  currency: string;
  purpose: string;
}

export interface DebtEntry extends ManagedEntity {
  name: string;
  amountOwed: number;
  interestRate: number;
  monthlyPayment: number;
  date?: string;
}

export interface TaxRecord extends ManagedEntity {
  recordType: string;
  accountFund: string;
  transactionType: string;
  date: string;
  value: number;
  description: string;
}

export interface JournalEntry extends ManagedEntity {
  date: string;
  description: string;
  canonicalName?: string;
  category: string;
  subCategory: string;
  amount: number;
  source: string;
  transactionId: string;
}

export interface NetWorthEntry {
  date: string;
  value: number;
}

export interface PortfolioLogEntry {
  date: string;
  accounts: Record<string, number>;
}

export interface ProcessedPortfolioEntry extends PortfolioLogEntry {
  totalValue: number;
  percentChange: number;
}

export interface IncomeEntry {
  date: string;
  monthStr: string;
  amount: number;
}

export interface ExpenseEntry {
  date: string;
  monthStr: string;
  categories: Record<string, number>;
  total: number;
}

export interface IncomeAndExpenses {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
}

export interface LedgerItem {
  name: string;
  monthlyValues: number[];
  total: number;
  rowIndex?: number;
}

export interface LedgerCategory {
  name: string;
  subCategories: LedgerItem[];
  total: number;
  rowIndex?: number;
}

export interface LedgerData {
  months: string[];
  categories: LedgerCategory[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  canonicalName?: string;
  amount: number;
  category: string;
  subCategory?: string;
  type: string;
  rawLine?: string;
  isNew?: boolean;
}

export interface CustomDateRange {
  start: string;
  end: string;
}

export interface SheetConfig {
  sheetId: string;
  clientId: string;
  tabNames: {
    assets: string;
    investments: string;
    trades: string;
    subscriptions: string;
    accounts: string;
    logData: string;
    portfolioLog: string;
    debt: string;
    income: string;
    expenses: string;
    journal: string;
  };
}

export interface UserProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  COCKPIT = 'COCKPIT',
  ASSETS = 'ASSETS',
  INVESTMENTS = 'INVESTMENTS',
  TRADES = 'TRADES',
  INCOME = 'INCOME',
  SPEND = 'SPEND',
  JOURNAL = 'JOURNAL',
  ANALYTICS = 'ANALYTICS',
  TOOLS = 'TOOLS',
  INFORMATION = 'INFORMATION',
  SETTINGS = 'SETTINGS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS'
}

export enum TimeFocus {
  MTD = 'MTD',
  QTD = 'QTD',
  YTD = 'YTD',
  ROLLING_12M = 'ROLLING_12M',
  FULL_YEAR = 'FULL_YEAR',
  CUSTOM = 'CUSTOM'
}

export enum FontScale {
  SMALL = 'SMALL',
  NORMAL = 'NORMAL',
  LARGE = 'LARGE'
}

export enum DensityMode {
  ZEN = 'ZEN',
  COMPACT = 'COMPACT'
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  code?: string;
  duration?: number;
}

export type AnalyticsSubView = 'FLOW' | 'PORTFOLIO';

export type ExchangeRates = Record<string, number>;

export interface TourStep {
  targetId: string;
  title: string;
  content: string;
  view: ViewState;
}

export interface AttributionResult {
  startValue: number;
  endValue: number;
  netContributions: number;
  marketGain: number;
  percentageReturn: number;
}

export interface ArchiveMeta {
  year: number;
  records: number;
  lastUpdated: string;
}

export interface CockpitBaseline {
  income: Record<string, number>;
  expenses: Record<string, number>;
  totalInvestments: number;
  totalCash: number;
}

export interface SimulationEvent {
  id: string;
  month: number;
  amount: number;
  type: 'INFLOW' | 'OUTFLOW';
  label: string;
}

export interface CockpitMutationState {
  globalIncomeMultiplier: number;
  globalExpenseMultiplier: number;
  incomeMultipliers: Record<string, number>;
  expenseMultipliers: Record<string, number>;
  investmentRate: number;
  macroGrowthRate: number;
  events: SimulationEvent[];
}

export interface SimulationPoint {
  month: number;
  investments: number;
  cash: number;
  totalWealth: number;
  isMilestone?: boolean;
  milestoneLabel?: string;
}

export enum StatementFormat {
  AMEX_COBALT = 'AMEX_COBALT',
  WEALTHSIMPLE_VISA = 'WEALTHSIMPLE_VISA'
}

export interface StatementData {
  balance: number;
  transactions: Transaction[];
  totalSpent: number;
  format: StatementFormat;
  totalPages: number;
}

export type WriteStrategy = 'MERGE' | 'OVERWRITE';

export interface LedgerCommitPayload {
  monthIndex: number;
  strategy: WriteStrategy;
  updates: {
    ledgerCategory: string;
    ledgerSubCategory: string;
    value: number;
  }[];
}

export type SyncStatus = { type: 'success' | 'error' | 'warning', msg: string } | null;

export interface GlobalModalState {
  type: 'TRADE' | 'ASSET' | 'SUBSCRIPTION' | 'ACCOUNT' | null;
  initialData?: any;
}

export interface InspectorState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  transactions: Transaction[];
}

export interface SyncConflict {
  tab: string;
  localTimestamp: string;
  remoteTimestamp: string;
  dirtyCount: number;
}

export enum PaymentFrequency {
  MONTHLY = 'MONTHLY',
  BI_WEEKLY = 'BI_WEEKLY',
  ACC_BI_WEEKLY = 'ACC_BI_WEEKLY'
}

export interface MortgageInput {
  principal: number;
  interestRate: number;
  termYears: number;
  extraMonthly: number;
  extraAnnualPercent: number;
  lumpSumAmount: number;
  lumpSumMonth: number;
  frequency: PaymentFrequency;
  propertyTaxes: number;
  heatingCost: number;
  isStressTestEnabled: boolean;
  renewalRate: number;
}

export interface AmortizationPoint {
  period: number;
  year: number;
  monthLabel: number;
  balance: number;
  acceleratedBalance: number;
  totalInterest: number;
  acceleratedTotalInterest: number;
  standardPayment: number;
  acceleratedPayment: number;
  extraMonthly: number;
  lumpSum: number;
  pithTotal: number;
  isRenewal: boolean;
}

export interface MortgageScenario {
  id: string;
  name: string;
  inputs: MortgageInput;
  timestamp: number;
}

export interface VaultEnvelope {
  integrity: {
    signature: string;
    algorithm: "AES-GCM-256";
    version: string;
    origin_hint: string;
    sheet_id: string;
    timestamp: string;
    iv: string;
    salt: string;
  };
  encrypted_payload: string;
  payload?: Record<string, any>;
  ai_memory?: {
    merchants?: Record<string, string>;
    merchant_identities?: Record<string, string>;
    integration_mappings?: Record<string, string>;
  };
}

export interface UnifiedFinancialStore {
  assets: Asset[];
  investments: Investment[];
  trades: Trade[];
  subscriptions: Subscription[];
  accounts: BankAccount[];
  journalEntries: JournalEntry[];
  netWorthHistory: NetWorthEntry[];
  portfolioHistory: PortfolioLogEntry[];
  debtEntries: DebtEntry[];
  taxRecords: TaxRecord[];
}

export const INITIAL_FINANCIAL_STORE: UnifiedFinancialStore = {
  assets: [],
  investments: [],
  trades: [],
  subscriptions: [],
  accounts: [],
  journalEntries: [],
  netWorthHistory: [],
  portfolioHistory: [],
  debtEntries: [],
  taxRecords: []
};
