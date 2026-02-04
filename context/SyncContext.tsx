import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SyncStatus, AppNotification, NotificationType, SyncConflict } from '../types';
import { haptics } from '../services/infrastructure/HapticService';
import { AppError } from '../services/infrastructure/ErrorHandler';
import { rse } from '../services/sync/RSEEngine';

interface SyncContextType {
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  syncingTabs: Set<string>;
  setSyncingTabs: React.Dispatch<React.SetStateAction<Set<string>>>;
  syncStatus: SyncStatus;
  setSyncStatus: (s: SyncStatus) => void;
  conflict: SyncConflict | null;
  setConflict: (c: SyncConflict | null) => void;
  notifications: AppNotification[];
  notify: (type: NotificationType, title: string, message: string, code?: string, duration?: number) => void;
  dismissNotification: (id: string) => void;
  handleError: (err: any) => void;
  isDirty: boolean;
  dirtyCount: number;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingTabs, setSyncingTabs] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [rseProcessing, setRseProcessing] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);

  const notify = useCallback((type: NotificationType, title: string, message: string, code?: string, duration: number = 5000) => {
    const id = crypto.randomUUID();
    if (type === 'error') haptics.click('heavy'); else haptics.click('light');
    setNotifications(prev => [...prev, { id, type, title, message, code, duration }]);
  }, []);

  const dismissNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

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

  useEffect(() => {
    rse.getPendingCount().then(setPendingMutations);
    // Fix: Changed subscribe to subscribeToEvents to correctly receive and handle RSEEvent payloads
    return rse.subscribeToEvents((ev: any) => {
        if (ev.type === 'QUEUE_STATUS') {
            setRseProcessing(ev.isSyncing);
            setPendingMutations(ev.count);
        } else if (ev.type === 'CONFLICT') {
            setConflict(ev.conflict);
        }
    });
  }, []);

  return (
    <SyncContext.Provider value={{ 
      isSyncing: isSyncing || rseProcessing, setIsSyncing, syncingTabs, setSyncingTabs, syncStatus, setSyncStatus, 
      conflict, setConflict, notifications, notify, dismissNotification, handleError,
      isDirty: pendingMutations > 0, dirtyCount: pendingMutations
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
};