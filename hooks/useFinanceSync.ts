import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Asset, Investment, Trade, Subscription, BankAccount, JournalEntry,
  NetWorthEntry, PortfolioLogEntry, DebtEntry, IncomeEntry,
  ExpenseEntry, LedgerData, SheetConfig, IncomeAndExpenses,
  SyncStatus, SyncConflict, SyncMetadata
} from '../types';
import { signIn } from '../services/authService';
import { fetchSheetData, fetchTabNames } from '../services/sheetService';
import { parseRawData } from '../services/deterministicUtils';
import { googleClient } from '../services/infrastructure/GoogleClient';
import { openDatabase, DB_CONFIG } from '../services/infrastructure/DatabaseProvider';

export interface SyncDispatcher {
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

/**
 * useFinanceSync: Inbound Cloud Connectivity
 * Standardized hook for fetching and parsing spreadsheet data.
 */
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
      if (finalArchives.length > 0) setRemoteArchives(finalArchives);
    } catch (e) {
      console.warn("[Discovery] Remote scan failed", e);
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

  const sync = useCallback(async (specificTabs?: (keyof SheetConfig['tabNames'])[], localState?: Record<string, any[]>) => {
    if (!config.sheetId) return;

    // Conflict Check
    if (localState) {
      const targets = specificTabs && specificTabs.length > 0 ? specificTabs : (Object.keys(config.tabNames) as (keyof SheetConfig['tabNames'])[]);
      for (const target of targets) {
        const items = localState[target];
        if (items && Array.isArray(items)) {
          const dirtyCount = items.filter((i: any) => i.isDirty).length;
          if (dirtyCount > 0) {
            setConflict({ tab: target, dirtyCount });
            return; // Abort sync
          }
        }
      }
    }
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
      const fileMeta = await googleClient.request(`https://www.googleapis.com/drive/v3/files/${config.sheetId}?fields=modifiedTime`);
      const remoteModifiedTime = fileMeta.modifiedTime;

      await Promise.all(targets.map(async key => {
        const baseName = config.tabNames[key];
        const isHistorical = selectedYear !== activeYear;
        const actualTabName = resolveRemoteTabName(
          (isHistorical && ['income', 'expenses'].includes(key)) ? `${baseName}-${String(selectedYear).slice(-2)}` : baseName,
          allRemoteTabNames,
          isHistorical ? selectedYear : undefined
        );

        try {
          let data: any;
          switch (key) {
            case 'assets': data = await fetchSafe<Asset[]>(actualTabName, 'assets'); dispatcher.setAssets(data); break;
            case 'investments': data = await fetchSafe(actualTabName, 'investments'); dispatcher.setInvestments(data); break;
            case 'trades': data = await fetchSafe(actualTabName, 'trades'); dispatcher.setTrades(data); break;
            case 'subscriptions': data = await fetchSafe(actualTabName, 'subscriptions'); dispatcher.setSubscriptions(data); break;
            case 'accounts': data = await fetchSafe(actualTabName, 'accounts'); dispatcher.setAccounts(data); break;
            case 'journal': data = await fetchSafe<JournalEntry[]>(actualTabName, 'journal'); dispatcher.setJournalEntries(data); break;
            case 'logData': data = await fetchSafe<NetWorthEntry[]>(actualTabName, 'logData'); dispatcher.setNetWorthHistory(data); break;
            case 'portfolioLog': data = await fetchSafe<PortfolioLogEntry[]>(actualTabName, 'portfolioLog'); dispatcher.setPortfolioHistory(data); break;
            case 'debt': data = await fetchSafe<DebtEntry[]>(actualTabName, 'debt'); dispatcher.setDebtEntries(data); break;
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

          const db = await openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
          const tx = db.transaction(DB_CONFIG.SYNC.METADATA, 'readwrite');
          const meta: SyncMetadata = {
            tab: key,
            lastSyncTimestamp: remoteModifiedTime,
            lastSyncHash: 'verified'
          };
          tx.objectStore(DB_CONFIG.SYNC.METADATA).put(meta);

        } finally {
          setSyncingTabs(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
      }));
      dispatcher.setLastUpdatedStr(new Date().toISOString());
      setSyncStatus({ type: 'success', msg: 'Nodes Reconciled' });
    } catch (e: any) {
      setSyncStatus({ type: 'error', msg: e.message || "Sync failed." });
      setSyncingTabs(new Set());
    } finally {
      setIsSyncing(false);
    }
  }, [config, activeYear, selectedYear, dispatcher, allRemoteTabNames]);

  return { sync, isSyncing, syncingTabs, syncStatus, conflict, setConflict, discovery: { remoteArchives, scan: scanForRemoteArchives } };
}
