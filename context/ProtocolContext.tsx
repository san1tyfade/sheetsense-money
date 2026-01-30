
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { SheetConfig, UserProfile, SyncStatus, AppNotification, NotificationType, SyncConflict } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { haptics } from '../services/infrastructure/HapticService';
import { AppError, IEP } from '../services/infrastructure/ErrorHandler';
import { signOut as googleSignOut } from '../services/authService';
import { useFinanceSync } from '../hooks/useFinanceSync';
import { useLedger } from './LedgerContext';
import { useInterface } from './InterfaceContext';

interface ProtocolContextType {
  authSession: { token: string; expires: number } | null;
  setAuthSession: (s: { token: string; expires: number } | null) => void;
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile | null) => void;
  sheetConfig: SheetConfig;
  setSheetConfig: (c: SheetConfig) => void;
  syncStatus: SyncStatus;
  isSyncing: boolean;
  syncingTabs: Set<string>;
  conflict: SyncConflict | null;
  setConflict: (c: SyncConflict | null) => void;
  discovery: {
      remoteArchives: number[];
      scan: () => Promise<void>;
  };
  sync: (specificTabs?: (keyof SheetConfig['tabNames'])[], dataPools?: Record<string, any>) => Promise<void>;
  commitDelta: (tabKey?: keyof SheetConfig['tabNames'], pool?: any[]) => Promise<void>;
  notifications: AppNotification[];
  notify: (type: NotificationType, title: string, message: string, code?: string, duration?: number) => void;
  dismissNotification: (id: string) => void;
  handleError: (err: any) => void;
  lastUpdated: Date | null;
  setLastUpdatedStr: (d: string | null) => void;
  signOut: () => void;
  syncAllArchives: () => Promise<void>;
  // Added properties for uncommitted changes visibility
  isDirty: boolean;
  dirtyCount: number;
}

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export const ProtocolProvider: React.FC<{ children: React.ReactNode, defaultSettings: any }> = ({ children, defaultSettings }) => {
  const ledger = useLedger();
  const ui = useInterface();

  const [authSession, setAuthSession] = useIndexedDB<{token: string, expires: number} | null>('fintrack_auth_session', null);
  const [userProfile, setUserProfile] = useIndexedDB<UserProfile | null>('fintrack_user_profile', null);
  const [sheetConfig, setSheetConfig] = useIndexedDB<SheetConfig>('fintrack_sheet_config', defaultSettings.sheetConfig);
  const [lastUpdatedStr, setLastUpdatedStr] = useIndexedDB<string | null>('fintrack_last_updated', null);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  // Initialize Sync Engine
  const syncEngine = useFinanceSync(
    sheetConfig, 
    { 
        ...ledger, 
        setAuthSession, 
        setLastUpdatedStr,
        setActiveYear: ui.setActiveYear
    }, 
    ui.activeYear, 
    ledger.selectedYear
  );

  const notify = useCallback((type: NotificationType, title: string, message: string, code?: string, duration: number = 5000) => {
    const id = crypto.randomUUID();
    if (type === 'error') haptics.click('heavy'); else haptics.click('light');
    setNotifications(prev => [...prev, { id, type, title, message, code, duration }]);
  }, []);

  const dismissNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

  const handleError = useCallback((err: any) => {
    console.error("[Protocol Fault]", err);
    if (err instanceof AppError) {
      if (err.severity !== 'SILENT') notify('error', 'Fault Detected', err.message, err.code);
    } else {
      notify('error', 'Unexpected Error', err.message || "An unhandled exception occurred.");
    }
  }, [notify]);

  const signOut = useCallback(() => {
    googleSignOut();
    setAuthSession(null);
    setUserProfile(null);
  }, [setAuthSession, setUserProfile]);

  const syncAllArchives = useCallback(async () => {
      if (syncEngine.discovery.remoteArchives.length > 0) {
          notify('info', 'Deep Sync', 'Beginning ingestion of historical archives...');
          // Implementation of bulk year sync would go here
          await syncEngine.sync(['income', 'expenses']);
      }
  }, [syncEngine, notify]);

  const value = useMemo(() => ({
    authSession, setAuthSession, userProfile, setUserProfile, sheetConfig, setSheetConfig,
    notifications, notify, dismissNotification, handleError,
    lastUpdated: lastUpdatedStr ? new Date(lastUpdatedStr) : null,
    setLastUpdatedStr, signOut,
    syncAllArchives,
    // Merge sync engine
    sync: syncEngine.sync,
    commitDelta: async (key?: any, pool?: any) => {
        if (key && pool) await syncEngine.commitDeltas(key, pool);
        else notify('info', 'Commit Delta', 'Targeted commit required.');
    },
    isSyncing: syncEngine.isSyncing,
    syncingTabs: syncEngine.syncingTabs,
    syncStatus: syncEngine.syncStatus,
    conflict: syncEngine.conflict,
    setConflict: syncEngine.setConflict,
    discovery: syncEngine.discovery,
    // Provide dirty state calculated in LedgerContext
    isDirty: ledger.isDirty,
    dirtyCount: ledger.dirtyCount
  }), [authSession, userProfile, sheetConfig, notifications, lastUpdatedStr, setAuthSession, setUserProfile, setSheetConfig, setLastUpdatedStr, signOut, notify, dismissNotification, handleError, syncEngine, syncAllArchives, ledger.isDirty, ledger.dirtyCount]);

  return <ProtocolContext.Provider value={value}>{children}</ProtocolContext.Provider>;
};

export const useProtocol = () => {
  const context = useContext(ProtocolContext);
  if (!context) throw new Error('useProtocol must be used within ProtocolProvider');
  return context;
};
