import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Asset, Investment, Trade, Subscription, BankAccount, 
  NetWorthEntry, PortfolioLogEntry, DebtEntry, 
  IncomeEntry, ExpenseEntry, ExchangeRates, LedgerData, 
  TaxRecord, Transaction, JournalEntry, TimeFocus
} from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { useIdentity } from './IdentityContext';
import { useSettings } from './SystemContext';
import { useSync } from './SyncContext';
import { useFinanceSync } from '../hooks/useFinanceSync';
import { fetchLiveRates } from '../services/currencyService';
import { buildUnifiedTimeline } from '../services/temporalService';
import { reconcileInvestments } from '../services/portfolioService';
import { usePriceEngine } from '../hooks/usePriceEngine';
import { normalizeTicker } from '../services/deterministicUtils';
import { getMerchantIdentities } from '../services/tools/toolMemoryService';

interface DataContextType {
  assets: Asset[]; setAssets: (a: Asset[]) => void;
  investments: Investment[]; setInvestments: (i: Investment[]) => void;
  trades: Trade[]; setTrades: (t: Trade[]) => void;
  subscriptions: Subscription[]; setSubscriptions: (s: Subscription[]) => void;
  accounts: BankAccount[]; setAccounts: (a: BankAccount[]) => void;
  journalEntries: JournalEntry[]; setJournalEntries: (j: JournalEntry[]) => void;
  netWorthHistory: NetWorthEntry[]; setNetWorthHistory: (n: NetWorthEntry[]) => void;
  portfolioHistory: PortfolioLogEntry[]; setPortfolioHistory: (p: PortfolioLogEntry[]) => void;
  debtEntries: DebtEntry[]; setDebtEntries: (d: DebtEntry[]) => void;
  incomeData: IncomeEntry[]; setIncomeData: (i: IncomeEntry[]) => void;
  expenseData: ExpenseEntry[]; setExpenseData: (e: ExpenseEntry[]) => void;
  detailedIncome: LedgerData; setDetailedIncome: (d: LedgerData) => void;
  detailedExpenses: LedgerData; setDetailedExpenses: (d: LedgerData) => void;
  taxRecords: TaxRecord[]; setTaxRecords: (t: TaxRecord[]) => void;
  statementResults: Transaction[]; setStatementResults: (v: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  statementBalance: number; setStatementBalance: (b: number) => void;
  statementFormat: string | null; setStatementFormat: (f: string | null) => void;
  rates: ExchangeRates; isFetchingRates: boolean;
  timeline: Transaction[]; reconciledInvestments: Investment[];
  livePrices: Record<string, number>; isFetchingPrices: boolean; lastPriceUpdate: Date | null;
  sync: (tabs?: any) => Promise<void>; syncAllArchives: () => Promise<void>;
  discovery: any; identityMatrix: Record<string, string>; refreshIdentityMatrix: () => Promise<void>;
  timeFocus: TimeFocus; setTimeFocus: (f: TimeFocus) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fix: Moved setActiveYear from useIdentity destructuring to useSettings destructuring
  const { authSession, setAuthSession, sheetConfig } = useIdentity();
  const { selectedYear, lastUpdatedStr, setLastUpdatedStr, setActiveYear } = useSettings();
  const { isSyncing, setIsSyncing, setSyncingTabs, setSyncStatus, handleError } = useSync();

  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.FULL_YEAR);
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
  const [statementResults, setStatementResults] = useIndexedDB<Transaction[]>('fintrack_statement_results', []);
  const [statementBalance, setStatementBalance] = useIndexedDB<number>('fintrack_statement_balance', 0);
  const [statementFormat, setStatementFormat] = useIndexedDB<string | null>('fintrack_statement_format', null);
  const [rates, setRates] = useIndexedDB<ExchangeRates>('fintrack_fx_rates', { 'CAD': 1 });
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [timeline, setTimeline] = useState<Transaction[]>([]);
  const [identityMatrix, setIdentityMatrix] = useState<Record<string, string>>({});

  const refreshIdentityMatrix = useCallback(async () => {
    try { const matrix = await getMerchantIdentities(); setIdentityMatrix(matrix); } catch (e) { console.warn("Identity Hub offline."); }
  }, []);

  const dispatcher = useMemo(() => ({ 
    setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setJournalEntries, setNetWorthHistory, setPortfolioHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedIncome, setDetailedExpenses, 
    setLastUpdatedStr, setAuthSession, setActiveYear 
  }), [setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setJournalEntries, setNetWorthHistory, setPortfolioHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedIncome, setDetailedExpenses, setLastUpdatedStr, setAuthSession, setActiveYear]);

  const { sync: baseSync, discovery } = useFinanceSync(sheetConfig, dispatcher as any, selectedYear, selectedYear);

  const refreshRates = useCallback(async () => {
    setIsFetchingRates(true);
    try { const newRates = await fetchLiveRates(); setRates(newRates); } catch (e) { console.warn("FX Rates: Refresh failed."); } finally { setIsFetchingRates(false); }
  }, [setRates]);

  const allTickers = useMemo(() => {
    const tks = new Set<string>();
    investments.forEach(i => tks.add(normalizeTicker(i.ticker)));
    trades.forEach(t => tks.add(normalizeTicker(t.ticker)));
    return Array.from(tks).filter(t => t !== 'UNKNOWN' && t !== 'CASH');
  }, [investments, trades]);

  const { livePrices, isFetching: isFetchingPrices, lastUpdated: lastPriceUpdate } = usePriceEngine(allTickers);

  const sync = useCallback(async (tabs?: any) => {
    try { await Promise.all([baseSync(tabs), refreshRates(), refreshIdentityMatrix()]); } catch (e) { handleError(e); }
  }, [baseSync, refreshRates, refreshIdentityMatrix, handleError]);

  const syncAllArchives = useCallback(async () => {
    await sync(); if (discovery?.scan) await discovery.scan();
  }, [sync, discovery]);

  useEffect(() => { refreshRates(); refreshIdentityMatrix(); }, [refreshRates, refreshIdentityMatrix]);
  useEffect(() => { buildUnifiedTimeline().then(setTimeline); }, [detailedIncome, detailedExpenses]);

  const reconciled = useMemo(() => reconcileInvestments(investments, trades), [investments, trades]);

  return (
    <DataContext.Provider value={{ 
      assets, setAssets, investments, setInvestments, trades, setTrades, subscriptions, setSubscriptions, 
      accounts, setAccounts, journalEntries, setJournalEntries, netWorthHistory, setNetWorthHistory, 
      portfolioHistory, setPortfolioHistory, debtEntries, setDebtEntries, incomeData, setIncomeData, 
      expenseData, setExpenseData, detailedIncome, setDetailedIncome, detailedExpenses, setDetailedExpenses, 
      taxRecords, setTaxRecords, statementResults, setStatementResults, statementBalance, setStatementBalance, 
      statementFormat, setStatementFormat, rates, isFetchingRates, timeline, reconciledInvestments: reconciled, 
      livePrices, isFetchingPrices, lastPriceUpdate, sync, syncAllArchives, discovery, identityMatrix, refreshIdentityMatrix,
      timeFocus, setTimeFocus
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useFinanceData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useFinanceData must be used within DataProvider');
  return context;
};