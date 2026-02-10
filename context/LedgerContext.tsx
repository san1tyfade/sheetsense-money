
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Asset, Investment, Trade, Subscription, BankAccount, JournalEntry, NetWorthEntry, PortfolioLogEntry, DebtEntry, IncomeEntry, ExpenseEntry, LedgerData, TaxRecord, Transaction, ExchangeRates } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { reconcileInvestments } from '../services/portfolioService';
import { buildUnifiedTimeline } from '../services/temporalService';
import { getMerchantIdentities } from '../services/tools/toolMemoryService';
import { useValuatedHoldings, ValuatedHolding } from '../hooks/useValuatedHoldings';
import { useInterface } from './InterfaceContext';
// Import price engine to power live portfolio metrics
import { usePriceEngine } from '../hooks/usePriceEngine';

interface LedgerContextType {
  assets: Asset[];
  setAssets: (a: Asset[]) => void;
  investments: Investment[];
  setInvestments: (i: Investment[]) => void;
  trades: Trade[];
  setTrades: (t: Trade[]) => void;
  subscriptions: Subscription[];
  setSubscriptions: (s: Subscription[]) => void;
  accounts: BankAccount[];
  setAccounts: (a: BankAccount[]) => void;
  journalEntries: JournalEntry[];
  setJournalEntries: (j: JournalEntry[]) => void;
  netWorthHistory: NetWorthEntry[];
  setNetWorthHistory: (n: NetWorthEntry[]) => void;
  portfolioHistory: PortfolioLogEntry[];
  setPortfolioHistory: (p: PortfolioLogEntry[]) => void;
  debtEntries: DebtEntry[];
  setDebtEntries: (d: DebtEntry[]) => void;
  incomeData: IncomeEntry[];
  setIncomeData: (i: IncomeEntry[]) => void;
  expenseData: ExpenseEntry[];
  setExpenseData: (e: ExpenseEntry[]) => void;
  detailedIncome: LedgerData;
  setDetailedIncome: (d: LedgerData) => void;
  detailedExpenses: LedgerData;
  setDetailedExpenses: (d: LedgerData) => void;
  taxRecords: TaxRecord[];
  setTaxRecords: (t: TaxRecord[]) => void;
  reconciledInvestments: Investment[];
  valuatedHoldings: ValuatedHolding[];
  timeline: Transaction[];
  identityMatrix: Record<string, string>;
  refreshIdentityMatrix: () => Promise<void>;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  // Added derived and live status properties
  isReadOnly: boolean;
  livePrices: Record<string, number>;
  isFetchingPrices: boolean;
  isDirty: boolean;
  dirtyCount: number;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rates, activeYear } = useInterface();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [assets, setAssets] = useIndexedDB<Asset[]>('fintrack_assets', []);
  const [investments, setInvestments] = useIndexedDB<Investment[]>('fintrack_investments', []);
  const [trades, setTrades] = useIndexedDB<Trade[]>('fintrack_trades', []);
  const [subscriptions, setSubscriptions] = useIndexedDB<Subscription[]>('fintrack_subscriptions', []);
  const [accounts, setAccounts] = useIndexedDB<BankAccount[]>('fintrack_accounts', []);
  const [journalEntries, setJournalEntries] = useIndexedDB<JournalEntry[]>('fintrack_journal', []);
  const [netWorthHistory, setNetWorthHistory] = useIndexedDB<NetWorthEntry[]>('fintrack_nw_history', []);
  const [portfolioHistory, setPortfolioHistory] = useIndexedDB<PortfolioLogEntry[]>('fintrack_port_history', []);
  const [debtEntries, setDebtEntries] = useIndexedDB<DebtEntry[]>('fintrack_debt', []);
  const [incomeData, setIncomeData] = useIndexedDB<IncomeEntry[]>(`fintrack_income_${selectedYear}`, []);
  const [expenseData, setExpenseData] = useIndexedDB<ExpenseEntry[]>(`fintrack_expenses_${selectedYear}`, []);
  const [detailedIncome, setDetailedIncome] = useIndexedDB<LedgerData>(`fintrack_detailed_income_${selectedYear}`, { months: [], categories: [] });
  const [detailedExpenses, setDetailedExpenses] = useIndexedDB<LedgerData>(`fintrack_detailed_expenses_${selectedYear}`, { months: [], categories: [] });
  const [taxRecords, setTaxRecords] = useIndexedDB<TaxRecord[]>('fintrack_tax_records', []);

  const [timeline, setTimeline] = useState<Transaction[]>([]);
  const [identityMatrix, setIdentityMatrix] = useState<Record<string, string>>({});

  const reconciled = useMemo(() => reconcileInvestments(investments, trades), [investments, trades]);

  // Calculate distinct tickers for live price monitoring
  const tickers = useMemo(() => Array.from(new Set(reconciled.map(i => i.ticker))), [reconciled]);
  const { livePrices, isFetching: isFetchingPrices } = usePriceEngine(tickers);

  // Compute O(1) buffer for holdings rendering
  const valuatedHoldings = useValuatedHoldings(reconciled, trades, livePrices, rates);

  // Derived: Is the current context read-only (archived year)
  const isReadOnly = useMemo(() => selectedYear !== activeYear, [selectedYear, activeYear]);

  // Derived: Detection of uncommitted local changes
  const dirtyCount = useMemo(() => {
    let count = 0;
    const pools = [assets, investments, trades, subscriptions, accounts, journalEntries, taxRecords];
    pools.forEach(pool => {
      pool.forEach((item: any) => { if (item.isDirty) count++; });
    });
    return count;
  }, [assets, investments, trades, subscriptions, accounts, journalEntries, taxRecords]);

  const isDirty = dirtyCount > 0;

  const refreshIdentityMatrix = useCallback(async () => {
    try {
      const matrix = await getMerchantIdentities();
      setIdentityMatrix(matrix);
    } catch (e) {
      console.warn("Identity Hub offline.");
    }
  }, []);

  useEffect(() => {
    buildUnifiedTimeline(detailedIncome, detailedExpenses, selectedYear).then(setTimeline);
  }, [detailedIncome, detailedExpenses, selectedYear]);

  const value = useMemo(() => ({
    assets, setAssets, investments, setInvestments, trades, setTrades,
    subscriptions, setSubscriptions, accounts, setAccounts, journalEntries, setJournalEntries,
    netWorthHistory, setNetWorthHistory, portfolioHistory, setPortfolioHistory, debtEntries, setDebtEntries,
    incomeData, setIncomeData, expenseData, setExpenseData, detailedIncome, setDetailedIncome,
    detailedExpenses, setDetailedExpenses, taxRecords, setTaxRecords,
    reconciledInvestments: reconciled,
    valuatedHoldings,
    timeline, identityMatrix, refreshIdentityMatrix,
    selectedYear, setSelectedYear,
    isReadOnly, livePrices, isFetchingPrices, isDirty, dirtyCount
  }), [assets, investments, trades, subscriptions, accounts, journalEntries, netWorthHistory, portfolioHistory, debtEntries, incomeData, expenseData, detailedIncome, detailedExpenses, taxRecords, reconciled, valuatedHoldings, timeline, identityMatrix, selectedYear, isReadOnly, livePrices, isFetchingPrices, isDirty, dirtyCount]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedger must be used within LedgerProvider');
  return context;
};
