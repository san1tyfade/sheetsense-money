
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Asset, Investment, Trade, Subscription, BankAccount,
  SheetConfig, NetWorthEntry, PortfolioLogEntry, DebtEntry,
  IncomeEntry, ExpenseEntry, ExchangeRates, LedgerData,
  UserProfile, TaxRecord, TimeFocus, Transaction, JournalEntry,
  ViewState, SyncStatus, FontScale, GlobalModalState, InspectorState,
  DensityMode, AppNotification, NotificationType, SyncConflict,
  UnifiedFinancialStore, INITIAL_FINANCIAL_STORE
} from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { usePersistentStore } from '../hooks/usePersistentStore';
import { useFinanceSync } from '../hooks/useFinanceSync';
import { fetchLiveRates } from '../services/currencyService';
import { buildUnifiedTimeline } from '../services/temporalService';
import { reconcileInvestments } from '../services/portfolioService';
import { signOut as googleSignOut } from '../services/authService';
import { usePriceEngine } from '../hooks/usePriceEngine';
import { normalizeTicker } from '../services/deterministicUtils';
import { haptics } from '../services/infrastructure/HapticService';
import { AppError, IEP } from '../services/infrastructure/ErrorHandler';
import { getMerchantIdentities } from '../services/tools/toolMemoryService';

interface SystemSettings {
  isDarkMode: boolean;
  isGhostMode: boolean;
  fontScale: FontScale;
  densityMode: DensityMode;
  activeYear: number;
  aiModelPreference: string;
  sheetUrl: string;
  lastUpdatedStr: string | null;
  sheetConfig: SheetConfig;
}

const DEFAULT_SETTINGS: SystemSettings = {
  isDarkMode: true,
  isGhostMode: false,
  fontScale: FontScale.NORMAL,
  densityMode: DensityMode.ZEN,
  activeYear: new Date().getFullYear(),
  aiModelPreference: 'gemini-3-flash-preview',
  sheetUrl: '',
  lastUpdatedStr: null,
  sheetConfig: {
    sheetId: '',
    clientId: '953749430238-3d0q078koppal8i2qs92ctfe5dbon994.apps.googleusercontent.com',
    tabNames: { assets: 'Assets', investments: 'Investments', trades: 'Trades', subscriptions: 'Subscriptions', accounts: 'Institutions', logData: 'logdata', portfolioLog: 'portfoliolog', debt: 'debt', income: 'Income', expenses: 'Expenses', journal: 'journal' }
  }
};

interface FinancialContextType {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (v: boolean) => void;
  globalModal: GlobalModalState;
  setGlobalModal: (s: GlobalModalState) => void;
  inspector: InspectorState;
  setInspector: (s: InspectorState) => void;
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings> | ((prev: SystemSettings) => Partial<SystemSettings>)) => void;
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile | null) => void;
  authSession: { token: string, expires: number } | null;
  setAuthSession: (s: { token: string, expires: number } | null) => void;
  signOut: () => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  timeFocus: TimeFocus;
  setTimeFocus: (f: TimeFocus) => void;
  isReadOnly: boolean;
  isTourActive: boolean;
  setIsTourActive: (v: boolean) => void;
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
  statementResults: Transaction[];
  setStatementResults: (v: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  statementBalance: number;
  setStatementBalance: (b: number) => void;
  statementFormat: string | null;
  setStatementFormat: (f: string | null) => void;
  rates: ExchangeRates;
  isFetchingRates: boolean;
  timeline: Transaction[];
  reconciledInvestments: Investment[];
  livePrices: Record<string, number>;
  isFetchingPrices: boolean;
  lastPriceUpdate: Date | null;
  sync: (tabs?: (keyof SheetConfig['tabNames'])[]) => Promise<void>;
  syncAllArchives: () => Promise<void>;
  commitDelta: () => Promise<void>;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  syncingTabs: Set<string>;
  syncStatus: SyncStatus;
  discovery: any;
  notifications: AppNotification[];
  notify: (type: NotificationType, title: string, message: string, code?: string, duration?: number) => void;
  dismissNotification: (id: string) => void;
  isDirty: boolean;
  dirtyCount: number;
  conflict: SyncConflict | null;
  setConflict: (c: SyncConflict | null) => void;
  handleError: (err: any) => void;
  identityMatrix: Record<string, string>;
  refreshIdentityMatrix: () => Promise<void>;
  sheetConfig: SheetConfig;
  setSheetConfig: (c: SheetConfig) => void;
  sheetUrl: string;
  setSheetUrl: (u: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: any) => void;
  isGhostMode: boolean;
  setIsGhostMode: (v: any) => void;
  fontScale: FontScale;
  setFontScale: (v: any) => void;
  densityMode: DensityMode;
  setDensityMode: (v: any) => void;
  activeYear: number;
  setActiveYear: (y: number) => void;
  aiModelPreference: string;
  setAiModelPreference: (m: string) => void;
  lastUpdated: Date | null;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setViewRaw] = useState<ViewState>(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page === 'privacy') return ViewState.PRIVACY;
    if (page === 'terms') return ViewState.TERMS;
    return ViewState.DASHBOARD;
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [globalModal, setGlobalModal] = useState<GlobalModalState>({ type: null });
  const [inspector, setInspector] = useState<InspectorState>({ isOpen: false, title: '', subtitle: '', transactions: [] });

  const [settings, setSettingsRaw] = useIndexedDB<SystemSettings>('fintrack_system_settings', DEFAULT_SETTINGS);

  const updateSettings = useCallback((updates: Partial<SystemSettings> | ((prev: SystemSettings) => Partial<SystemSettings>)) => {
    setSettingsRaw(prev => {
      const next = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...next };
    });
  }, [setSettingsRaw]);

  const [userProfile, setUserProfile] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [authSession, setAuthSession] = useIndexedDB<{ token: string, expires: number } | null>('fintrack_auth_session', null);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.FULL_YEAR);

  // UNIFIED STORE
  // Consolidates 10+ separate atoms into one persistent object
  const { store, update: updateStore } = usePersistentStore<UnifiedFinancialStore>('fintrack_unified_store_v1', INITIAL_FINANCIAL_STORE);

  const {
    assets, investments, trades, subscriptions, accounts,
    journalEntries, netWorthHistory, portfolioHistory, debtEntries, taxRecords
  } = store;

  const createSetter = <K extends keyof UnifiedFinancialStore>(key: K) => (value: UnifiedFinancialStore[K] | ((prev: UnifiedFinancialStore[K]) => UnifiedFinancialStore[K])) => {
    updateStore(prevStore => {
      const currentSlice = prevStore[key];
      const calculatedValue = typeof value === 'function'
        ? (value as any)(currentSlice)
        : value;
      return { [key]: calculatedValue } as any;
    });
  };

  const setAssets = useMemo(() => createSetter('assets'), [updateStore]);
  const setInvestments = useMemo(() => createSetter('investments'), [updateStore]);
  const setTrades = useMemo(() => createSetter('trades'), [updateStore]);
  const setSubscriptions = useMemo(() => createSetter('subscriptions'), [updateStore]);
  const setAccounts = useMemo(() => createSetter('accounts'), [updateStore]);
  const setJournalEntries = useMemo(() => createSetter('journalEntries'), [updateStore]);
  const setNetWorthHistory = useMemo(() => createSetter('netWorthHistory'), [updateStore]);
  const setPortfolioHistory = useMemo(() => createSetter('portfolioHistory'), [updateStore]);
  const setDebtEntries = useMemo(() => createSetter('debtEntries'), [updateStore]);
  // Helper for TaxRecords is direct
  const setTaxRecords = useMemo(() => createSetter('taxRecords'), [updateStore]);

  const [incomeData, setIncomeData] = useIndexedDB<IncomeEntry[]>(`fintrack_income_${selectedYear}`, []);
  const [expenseData, setExpenseData] = useIndexedDB<ExpenseEntry[]>(`fintrack_expenses_${selectedYear}`, []);
  const [detailedIncome, setDetailedIncome] = useIndexedDB<LedgerData>(`fintrack_detailed_income_${selectedYear}`, { months: [], categories: [] });
  const [detailedExpenses, setDetailedExpenses] = useIndexedDB<LedgerData>(`fintrack_detailed_expenses_${selectedYear}`, { months: [], categories: [] });

  const [statementResults, setStatementResults] = useIndexedDB<Transaction[]>('fintrack_statement_results', []);
  const [statementBalance, setStatementBalance] = useIndexedDB<number>('fintrack_statement_balance', 0);
  const [statementFormat, setStatementFormat] = useIndexedDB<string | null>('fintrack_statement_format', null);

  const [rates, setRates] = useIndexedDB<ExchangeRates>('fintrack_fx_rates', { 'CAD': 1 });
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [timeline, setTimeline] = useState<Transaction[]>([]);
  const [identityMatrix, setIdentityMatrix] = useState<Record<string, string>>({});

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notify = useCallback((type: NotificationType, title: string, message: string, code?: string, duration: number = 5000) => {
    const id = crypto.randomUUID();
    if (type === 'error') haptics.click('heavy'); else haptics.click('light');
    setNotifications(prev => [...prev, { id, type, title, message, code, duration }]);
  }, []);

  const handleError = useCallback((err: any) => {
    console.error("[Sovereign Fault]", err);
    if (err instanceof AppError) {
      if (err.severity !== 'SILENT') {
        notify('error', err.name === 'AppError' ? 'Fault Detected' : err.name, err.message, err.code);
      }
    } else {
      notify('error', 'Unexpected Error', err.message || "An unhandled exception occurred.");
    }
  }, [notify]);

  const refreshIdentityMatrix = useCallback(async () => {
    try {
      const matrix = await getMerchantIdentities();
      setIdentityMatrix(matrix);
    } catch (e) {
      console.warn("Identity Hub offline.");
    }
  }, []);

  const dirtyCount = useMemo(() => {
    return [assets, trades, subscriptions, accounts, taxRecords, journalEntries].reduce((sum, pool) => sum + pool.filter((i: any) => i.isDirty).length, 0);
  }, [assets, trades, subscriptions, accounts, taxRecords, journalEntries]);

  const isDirty = dirtyCount > 0;

  const dismissNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

  const setView = useCallback((v: ViewState) => {
    haptics.click('soft');
    setViewRaw(v);
    const params = new URLSearchParams(window.location.search);
    if (v === ViewState.PRIVACY) params.set('page', 'privacy');
    else if (v === ViewState.TERMS) params.set('page', 'terms');
    else params.delete('page');
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
  }, []);

  const refreshRates = useCallback(async () => {
    setIsFetchingRates(true);
    try { const newRates = await fetchLiveRates(); setRates(newRates); } catch (e) { console.warn("FX Rates: Refresh failed."); } finally { setIsFetchingRates(false); }
  }, [setRates]);

  const allTickers = useMemo(() => {
    const tickers = new Set<string>();
    investments.forEach(i => tickers.add(normalizeTicker(i.ticker)));
    trades.forEach(t => tickers.add(normalizeTicker(t.ticker)));
    assets.forEach(a => {
      const nameMatch = a.name.match(/\(([A-Z.]+)\)/);
      if (nameMatch) tickers.add(normalizeTicker(nameMatch[1]));
      else if ((a.type || '').toUpperCase().includes('CRYPTO') || a.name.toUpperCase().includes('BITCOIN')) tickers.add('BTC');
    });
    return Array.from(tickers).filter(t => t !== 'UNKNOWN' && t !== 'CASH');
  }, [investments, trades, assets]);

  const { livePrices, isFetching: isFetchingPrices, lastUpdated: lastPriceUpdate } = usePriceEngine(allTickers);

  const dispatcher = useMemo(() => ({
    setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setJournalEntries, setNetWorthHistory, setPortfolioHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedIncome, setDetailedExpenses,
    setLastUpdatedStr: (date: string | null) => updateSettings({ lastUpdatedStr: date }),
    setAuthSession,
    setActiveYear: (year: number) => updateSettings({ activeYear: year })
  }), [setAssets, setInvestments, setTrades, setSubscriptions, setAccounts, setJournalEntries, setNetWorthHistory, setPortfolioHistory, setDebtEntries, setIncomeData, setExpenseData, setDetailedIncome, setDetailedExpenses, setAuthSession, updateSettings]);

  const { sync: baseSync, commitDeltas, isSyncing, setIsSyncing, syncingTabs, syncStatus, conflict, setConflict, discovery: rawDiscovery } = useFinanceSync(settings.sheetConfig, dispatcher, settings.activeYear, selectedYear);
  const discovery = useMemo(() => rawDiscovery, [rawDiscovery.remoteArchives, rawDiscovery.scan]);

  const sync = useCallback(async (tabs?: (keyof SheetConfig['tabNames'])[]) => {
    haptics.pulse('light');
    const dataPools = { assets, trades, subscriptions, accounts, taxRecords, journalEntries, investments, incomeData, expenseData, detailedIncome, detailedExpenses };
    try {
      await Promise.all([baseSync(tabs, dataPools), refreshRates(), refreshIdentityMatrix()]);
    } catch (e) {
      handleError(e);
    }
  }, [baseSync, refreshRates, refreshIdentityMatrix, assets, trades, subscriptions, accounts, taxRecords, journalEntries, investments, incomeData, expenseData, detailedIncome, detailedExpenses, handleError]);

  const syncAllArchives = useCallback(async () => {
    await sync(); if (discovery?.scan) await discovery.scan();
  }, [sync, discovery]);

  const commitDelta = useCallback(async () => {
    setIsSyncing(true);
    notify('info', 'Uplink Initiated', `Pushing ${dirtyCount} delta nodes to cloud...`);
    try {
      await Promise.all([
        commitDeltas('assets', assets),
        commitDeltas('trades', trades),
        commitDeltas('subscriptions', subscriptions),
        commitDeltas('accounts', accounts),
        commitDeltas('journal', journalEntries)
      ]);
      await baseSync();
      notify('success', 'Delta Optimized', 'Cloud and Hardware are now synchronized.');
    } catch (e: any) { handleError(e); } finally { setIsSyncing(false); }
  }, [commitDeltas, assets, trades, subscriptions, accounts, journalEntries, dirtyCount, notify, baseSync, setIsSyncing, handleError]);

  const signOut = () => { googleSignOut(); setAuthSession(null); setUserProfile(null); };

  useEffect(() => { refreshRates(); refreshIdentityMatrix(); }, [refreshRates, refreshIdentityMatrix]);

  // Logical Timeline Generation with built-in Fault Tolerance
  useEffect(() => {
    buildUnifiedTimeline().then(setTimeline).catch(handleError);
  }, [detailedIncome, detailedExpenses, settings.activeYear, selectedYear, handleError]);

  useEffect(() => {
    if (settings.sheetConfig.sheetId && authSession && discovery.scan) discovery.scan();
  }, [settings.sheetConfig.sheetId, authSession, discovery.scan]);

  useEffect(() => {
    if (!settings.sheetConfig.sheetId || !authSession) return;
    const interval = setInterval(() => { if (!isSyncing && !isDirty) sync(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.sheetConfig.sheetId, authSession, isSyncing, isDirty, sync]);

  const reconciled = useMemo(() => reconcileInvestments(investments, trades), [investments, trades]);
  const isReadOnly = useMemo(() => selectedYear !== settings.activeYear, [selectedYear, settings.activeYear]);

  const value = {
    currentView, setView, isSearchOpen, setIsSearchOpen, globalModal, setGlobalModal, inspector, setInspector, settings, updateSettings, userProfile, setUserProfile, authSession, setAuthSession,
    signOut, selectedYear, setSelectedYear, timeFocus, setTimeFocus, isReadOnly, isTourActive, setIsTourActive, assets,
    setAssets, investments, setInvestments, trades, setTrades, subscriptions, setSubscriptions, accounts,
    setAccounts, journalEntries, setJournalEntries, netWorthHistory, setNetWorthHistory, portfolioHistory, setPortfolioHistory, debtEntries,
    setDebtEntries, incomeData, setIncomeData, expenseData, setExpenseData, detailedIncome, setDetailedIncome,
    detailedExpenses, setDetailedExpenses, taxRecords, setTaxRecords, statementResults, setStatementResults,
    statementBalance, setStatementBalance, statementFormat, setStatementFormat, rates, isFetchingRates,
    timeline, reconciledInvestments: reconciled, livePrices, isFetchingPrices, lastPriceUpdate,
    sync, syncAllArchives, commitDelta, isSyncing, setIsSyncing, syncingTabs, syncStatus, discovery,
    notifications, notify, dismissNotification, isDirty, dirtyCount, conflict, setConflict, handleError,
    identityMatrix, refreshIdentityMatrix,
    sheetConfig: settings.sheetConfig,
    setSheetConfig: (c: SheetConfig) => updateSettings({ sheetConfig: c }),
    sheetUrl: settings.sheetUrl,
    setSheetUrl: (u: string) => updateSettings({ sheetUrl: u }),
    isDarkMode: settings.isDarkMode,
    setIsDarkMode: (v: any) => updateSettings(prev => ({ isDarkMode: typeof v === 'function' ? v(prev.isDarkMode) : v })),
    isGhostMode: settings.isGhostMode,
    setIsGhostMode: (v: any) => updateSettings(prev => ({ isGhostMode: typeof v === 'function' ? v(prev.isGhostMode) : v })),
    fontScale: settings.fontScale,
    setFontScale: (v: any) => updateSettings(prev => ({ fontScale: typeof v === 'function' ? v(prev.fontScale) : v })),
    densityMode: settings.densityMode,
    setDensityMode: (v: any) => updateSettings(prev => ({ densityMode: typeof v === 'function' ? v(prev.densityMode) : v })),
    activeYear: settings.activeYear,
    setActiveYear: (y: number) => updateSettings({ activeYear: y }),
    aiModelPreference: settings.aiModelPreference,
    setAiModelPreference: (m: string) => updateSettings({ aiModelPreference: m }),
    lastUpdated: settings.lastUpdatedStr ? new Date(settings.lastUpdatedStr) : null
  };

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancialStore = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) throw new Error('useFinancialStore error');
  return context;
};
