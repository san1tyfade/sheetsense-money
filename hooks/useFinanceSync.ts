import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Asset, Investment, Trade, Subscription, BankAccount, JournalEntry,
  NetWorthEntry, PortfolioLogEntry, DebtEntry, IncomeEntry,
  ExpenseEntry, LedgerData, SheetConfig, IncomeAndExpenses,
  SyncStatus, SyncConflict
} from '../types';
import { signIn } from '../services/authService';
import { fetchSheetData, fetchTabNames } from '../services/sheetService';
import { parseRawData } from '../services/deterministicUtils';
// Fix: Imported commitItemToSheet to support delta persistence
import { commitItemToSheet } from '../services/sheetWriteService';

interface SyncDispatcher {
  setAssets: (data: Asset[]) => void;
  setInvestments: (data: Investment[]) => void;
  setTrades: (data: Trade[]) => void;
  setSubscriptions: (data: Subscription[]) => void;
  setAccounts: (data: BankAccount[]) => void;
  setJournalEntries: (data: JournalEntry[]) => void;
  setNetWorthHistory: (data: NetWorthEntry[]) => void;
  setPortfolioHistory: (data: PortfolioLogEntry[]) => void;
  setDebtEntries: (data: DebtEntry[]) => void;
  setIncomeData: (data: IncomeEntry[]) => void;
  setExpenseData: (data: ExpenseEntry[]) => void;
  setDetailedIncome: (data: LedgerData) => void;
  setDetailedExpenses: (data: LedgerData) => void;
  setLastUpdatedStr: (date: string | null) => void;
  setAuthSession: (session: { token: string, expires: number } | null) => void;
  setActiveYear: (year: number) => void;
}

export function useFinanceSync(config: SheetConfig, dispatcher: SyncDispatcher, activeYear: number, selectedYear: number) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  const [remoteArchives, setRemoteArchives] = useState<number[]>([activeYear]);
  const [allRemoteTabNames, setAllRemoteTabNames] = useState<string[]>([]);
  const isDiscoveryRunning = useRef(false);

  useEffect(() => {
    if (activeYear) {
      setRemoteArchives(prev => {
        if (prev.includes(activeYear)) return prev;
        return [...prev, activeYear].sort((a, b) => b - a);
      });
    }
  }, [activeYear]);

  const scanForRemoteArchives = useCallback(async () => {
    if (!config.sheetId || isDiscoveryRunning.current) return;

    isDiscoveryRunning.current = true;
    try {
      const tabNames = await fetchTabNames(config.sheetId);
      setAllRemoteTabNames(tabNames);

      const foundYears = new Set<number>();
      tabNames.forEach(name => {
        const match = name.match(/[ -]?(\d{2,4})$/);
        if (match) {
          const yearPart = match[1].trim();
          const year = yearPart.length === 2 ? 2000 + parseInt(yearPart) : parseInt(yearPart);
          if (year > 2000 && year < 2100) foundYears.add(year);
        }
      });
      if (activeYear) foundYears.add(activeYear);

      const finalArchives = Array.from(foundYears).sort((a, b) => b - a);
      if (finalArchives.length > 0) {
        setRemoteArchives(finalArchives);
      }
    } catch (e) {
      console.warn("Discovery Engine: Remote scan failed", e);
    } finally {
      isDiscoveryRunning.current = false;
    }
  }, [config.sheetId, activeYear]);

  const resolveRemoteTabName = (requestedName: string, availableNames: string[], year?: number): string => {
    if (availableNames.length === 0) return requestedName;
    const exactMatch = availableNames.find(n => n === requestedName);
    if (exactMatch) return exactMatch;
    if (year) {
      const yearShort = String(year).slice(-2);
      const yearFull = String(year);
      const base = requestedName.split('-')[0].split(' ')[0].toLowerCase();
      const archivalMatch = availableNames.find(n => {
        const low = n.toLowerCase();
        return low.includes(base) && (low.endsWith(yearShort) || low.endsWith(yearFull));
      });
      if (archivalMatch) return archivalMatch;
    }
    return availableNames.find(n => n.toLowerCase() === requestedName.toLowerCase()) || requestedName;
  };

  // Fix: Implemented commitDeltas to support uplink operations in FinancialContext
  const commitDeltas = useCallback(async (tabKey: keyof SheetConfig['tabNames'], pool: any[]) => {
    const dirty = pool.filter((i: any) => i.isDirty);
    if (dirty.length === 0) return;
    const tabName = config.tabNames[tabKey];
    for (const item of dirty) {
      await commitItemToSheet(config.sheetId, tabName, item, tabKey);
    }
  }, [config]);

  const sync = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[], dataPools?: Record<string, any>) => {
    if (!config.sheetId) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const session = await signIn();
      dispatcher.setAuthSession(session);
    } catch (e: any) {
      setSyncStatus({ type: 'error', msg: "Auth failed." });
      setIsSyncing(false);
      return;
    }
    const targets = specificTabs && specificTabs.length > 0 ? specificTabs : (Object.keys(config.tabNames) as (keyof SheetConfig['tabNames'])[]);
    targets.forEach(t => setSyncingTabs(prev => new Set(prev).add(t)));
    const fetchSafe = async <T,>(tabName: string, type: any): Promise<T> => {
      const rawData = await fetchSheetData(config.sheetId, tabName);
      return await parseRawData<T>(rawData, type);
    };
    try {
      await Promise.all(targets.map(async key => {
        const baseName = config.tabNames[key];
        const isHistorical = selectedYear !== activeYear;
        const actualTabName = resolveRemoteTabName(
          (isHistorical && ['income', 'expenses'].includes(key)) ? `${baseName}-${String(selectedYear).slice(-2)}` : baseName,
          allRemoteTabNames,
          isHistorical ? selectedYear : undefined
        );

        const pool = dataPools ? (dataPools[key] || dataPools[`${key}Entries`] || dataPools[`${key}Data`] || dataPools[key]) : undefined;
        let dirtyCount = 0;
        if (Array.isArray(pool)) {
          dirtyCount = pool.filter((i: any) => i.isDirty).length;
        }

        if (dirtyCount > 0) {
          setConflict({ tab: key, localTimestamp: new Date().toISOString(), remoteTimestamp: new Date().toISOString(), dirtyCount });
          throw new Error("CONFLICT_DETECTED");
        }

        try {
          switch (key) {
            case 'assets': dispatcher.setAssets(await fetchSafe<Asset[]>(actualTabName, 'assets')); break;
            case 'investments': dispatcher.setInvestments(await fetchSafe(actualTabName, 'investments')); break;
            case 'trades': dispatcher.setTrades(await fetchSafe(actualTabName, 'trades')); break;
            case 'subscriptions': dispatcher.setSubscriptions(await fetchSafe(actualTabName, 'subscriptions')); break;
            case 'accounts': dispatcher.setAccounts(await fetchSafe(actualTabName, 'accounts')); break;
            case 'journal': dispatcher.setJournalEntries(await fetchSafe<JournalEntry[]>(actualTabName, 'journal')); break;
            case 'logData': dispatcher.setNetWorthHistory(await fetchSafe<NetWorthEntry[]>(actualTabName, 'logData')); break;
            case 'portfolioLog': dispatcher.setPortfolioHistory(await fetchSafe<PortfolioLogEntry[]>(actualTabName, 'portfolioLog')); break;
            case 'debt': dispatcher.setDebtEntries(await fetchSafe<DebtEntry[]>(actualTabName, 'debt')); break;
            case 'income':
              const finData = await fetchSafe<IncomeAndExpenses>(actualTabName, 'income');
              dispatcher.setIncomeData(finData.income);
              dispatcher.setExpenseData(finData.expenses);
              dispatcher.setDetailedIncome(await fetchSafe<LedgerData>(actualTabName, 'detailedIncome'));
              if (config.tabNames.expenses === config.tabNames.income) dispatcher.setDetailedExpenses(await fetchSafe(actualTabName, 'detailedExpenses'));
              break;
            case 'expenses':
              if (config.tabNames.expenses !== config.tabNames.income) dispatcher.setDetailedExpenses(await fetchSafe(actualTabName, 'detailedExpenses'));
              break;
          }
        } finally {
          setSyncingTabs(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
      }));
      dispatcher.setLastUpdatedStr(new Date().toISOString());
      setSyncStatus({ type: 'success', msg: 'Core Synchronized' });
    } catch (e: any) {
      if (e.message !== 'CONFLICT_DETECTED') {
        setSyncStatus({ type: 'error', msg: e.message || "Sync failed." });
        setSyncingTabs(new Set());
      }
    } finally {
      setIsSyncing(false);
    }
  }, [config, activeYear, selectedYear, dispatcher, allRemoteTabNames]);

  return { sync, commitDeltas, isSyncing, setIsSyncing, syncingTabs, syncStatus, conflict, setConflict, discovery: { remoteArchives, scan: scanForRemoteArchives } };
}