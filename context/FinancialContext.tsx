import React from 'react';
import { IdentityProvider, useIdentity } from './IdentityContext';
import { SystemProvider, useSettings } from './SystemContext';
import { SyncProvider, useSync } from './SyncContext';
import { DataProvider, useFinanceData } from './DataContext';
import { rse } from '../services/sync/RSEEngine';

// Re-export domain hooks for atomic consumption
export { useIdentity } from './IdentityContext';
export { useSettings } from './SystemContext';
export { useSync } from './SyncContext';
export { useFinanceData } from './DataContext';

/**
 * FinancialProvider
 * The orchestrator that wraps the application in the domain-specific provider stack.
 */
export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IdentityProvider>
    <SystemProvider>
      <SyncProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </SyncProvider>
    </SystemProvider>
  </IdentityProvider>
);

/**
 * useFinancialStore
 * @deprecated Use atomic hooks (useFinanceData, useSettings, etc.) for better performance.
 * Maintained only for top-level App orchestration.
 */
export const useFinancialStore = () => {
  const identity = useIdentity();
  const system = useSettings();
  const syncStatus = useSync();
  const data = useFinanceData();

  const isReadOnly = system.selectedYear !== system.activeYear;
  const lastUpdated = system.lastUpdatedStr ? new Date(system.lastUpdatedStr) : null;

  return {
    ...identity,
    ...system,
    ...syncStatus,
    ...data,
    isReadOnly,
    lastUpdated,
    forceSync: () => data.sync(),
    commitDelta: () => rse.trigger()
  };
};