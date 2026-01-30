
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ViewState, DensityMode, FontScale, GlobalModalState, InspectorState, ExchangeRates, Transaction, TimeFocus } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface InterfaceContextType {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (v: boolean) => void;
  isGhostMode: boolean;
  // Update: Support functional updates for setters using useIndexedDB
  setIsGhostMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  densityMode: DensityMode;
  setDensityMode: (v: DensityMode | ((prev: DensityMode) => DensityMode)) => void;
  fontScale: FontScale;
  setFontScale: (v: FontScale | ((prev: FontScale) => FontScale)) => void;
  globalModal: GlobalModalState;
  setGlobalModal: (s: GlobalModalState) => void;
  inspector: InspectorState;
  setInspector: (s: InspectorState) => void;
  isTourActive: boolean;
  setIsTourActive: (v: boolean) => void;
  rates: ExchangeRates;
  setRates: (r: ExchangeRates) => void;
  activeYear: number;
  setActiveYear: (y: number) => void;
  aiModelPreference: string;
  setAiModelPreference: (m: string) => void;
  statementResults: Transaction[];
  setStatementResults: (v: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  statementBalance: number;
  setStatementBalance: (b: number) => void;
  statementFormat: string | null;
  setStatementFormat: (f: string | null) => void;
  // Added missing properties for global interface state
  timeFocus: TimeFocus;
  setTimeFocus: (f: TimeFocus) => void;
  sheetUrl: string;
  setSheetUrl: (u: string) => void;
}

const InterfaceContext = createContext<InterfaceContextType | undefined>(undefined);

export const InterfaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setViewRaw] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isGhostMode, setIsGhostMode] = useIndexedDB('fintrack_ghost_mode', false);
  const [isDarkMode, setIsDarkMode] = useIndexedDB('fintrack_dark_mode', true);
  const [densityMode, setDensityMode] = useIndexedDB('fintrack_density', DensityMode.ZEN);
  const [fontScale, setFontScale] = useIndexedDB('fintrack_font_scale', FontScale.NORMAL);
  const [activeYear, setActiveYear] = useIndexedDB('fintrack_active_year', new Date().getFullYear());
  const [aiModelPreference, setAiModelPreference] = useIndexedDB('fintrack_ai_model', 'gemini-3-flash-preview');
  const [rates, setRates] = useIndexedDB<ExchangeRates>('fintrack_fx_rates', { 'CAD': 1 });
  
  const [globalModal, setGlobalModal] = useState<GlobalModalState>({ type: null });
  const [inspector, setInspector] = useState<InspectorState>({ isOpen: false, title: '', subtitle: '', transactions: [] });

  const [statementResults, setStatementResults] = useIndexedDB<Transaction[]>('fintrack_statement_results', []);
  const [statementBalance, setStatementBalance] = useIndexedDB<number>('fintrack_statement_balance', 0);
  const [statementFormat, setStatementFormat] = useIndexedDB<string | null>('fintrack_statement_format', null);

  // Added missing persistent states for time focus and spreadsheet URL
  const [timeFocus, setTimeFocus] = useIndexedDB<TimeFocus>('fintrack_time_focus', TimeFocus.YTD);
  const [sheetUrl, setSheetUrl] = useIndexedDB<string>('fintrack_sheet_url', '');

  const setView = useCallback((v: ViewState) => {
    setViewRaw(v);
    const url = new URL(window.location.href);
    url.searchParams.set('view', v.toLowerCase());
    window.history.pushState({}, '', url);
  }, []);

  const value = useMemo(() => ({
    currentView, setView, isSearchOpen, setIsSearchOpen, isGhostMode, setIsGhostMode,
    isDarkMode, setIsDarkMode, densityMode, setDensityMode, fontScale, setFontScale,
    globalModal, setGlobalModal, inspector, setInspector, isTourActive, setIsTourActive,
    rates, setRates, activeYear, setActiveYear, aiModelPreference, setAiModelPreference,
    statementResults, setStatementResults, statementBalance, setStatementBalance, statementFormat, setStatementFormat,
    timeFocus, setTimeFocus, sheetUrl, setSheetUrl
  }), [currentView, isSearchOpen, isGhostMode, isDarkMode, densityMode, fontScale, globalModal, inspector, isTourActive, rates, activeYear, aiModelPreference, statementResults, statementBalance, statementFormat, timeFocus, sheetUrl]);

  return <InterfaceContext.Provider value={value}>{children}</InterfaceContext.Provider>;
};

export const useInterface = () => {
  const context = useContext(InterfaceContext);
  if (!context) throw new Error('useInterface must be used within InterfaceProvider');
  return context;
};
