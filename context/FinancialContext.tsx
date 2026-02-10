
import React, { createContext, useContext, useMemo } from 'react';
import { SheetConfig, FontScale, DensityMode } from '../types';
import { InterfaceProvider, useInterface } from './InterfaceContext';
import { LedgerProvider, useLedger } from './LedgerContext';
import { ProtocolProvider, useProtocol } from './ProtocolContext';

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

/**
 * Legacy Context Wrapper
 * This ensures backward compatibility while we migrate components to the granular hooks.
 */
const FinancialContext = createContext<any>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <InterfaceProvider>
      <LedgerProvider>
        <ProtocolProvider defaultSettings={DEFAULT_SETTINGS}>
          {children}
        </ProtocolProvider>
      </LedgerProvider>
    </InterfaceProvider>
  );
};

export const useFinancialStore = () => {
  const ui = useInterface();
  const ledger = useLedger();
  const protocol = useProtocol();

  // Combine into a monolithic object to satisfy legacy consumers
  // We use a memo to prevent re-creating this object unless the underlying contexts change
  // Note: This effectively defeats the optimization for components still using useFinancialStore,
  // but allows granular components to bypass it.
  return useMemo(() => ({
    ...ui,
    ...ledger,
    ...protocol,

    // Polyfill for flattened settings object
    settings: {
      isDarkMode: ui.isDarkMode,
      isGhostMode: ui.isGhostMode,
      fontScale: ui.fontScale,
      densityMode: ui.densityMode,
      activeYear: ui.activeYear,
      aiModelPreference: ui.aiModelPreference,
      sheetUrl: ui.sheetUrl,
      lastUpdatedStr: protocol.lastUpdated ? protocol.lastUpdated.toISOString() : null,
      sheetConfig: protocol.sheetConfig
    },
    updateSettings: (vals: any) => {
      // Dispatch updates to appropriate contexts
      if (vals.activeYear !== undefined) ui.setActiveYear(vals.activeYear);
      if (vals.isDarkMode !== undefined) ui.setIsDarkMode(vals.isDarkMode);
      if (vals.isGhostMode !== undefined) ui.setIsGhostMode(vals.isGhostMode);
      if (vals.lastUpdatedStr !== undefined) protocol.setLastUpdatedStr(vals.lastUpdatedStr);
      // ... extend as needed for legacy compatibility
    }

  }), [ui, ledger, protocol]);
};
