import React, { createContext, useContext, useState, useCallback } from 'react';
import { ViewState, FontScale, DensityMode, GlobalModalState, InspectorState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface SystemContextType {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (v: boolean) => void;
  isTourActive: boolean;
  setIsTourActive: (v: boolean) => void;
  globalModal: GlobalModalState;
  setGlobalModal: (s: GlobalModalState) => void;
  inspector: InspectorState;
  setInspector: (s: InspectorState) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean | ((p: boolean) => boolean)) => void;
  isGhostMode: boolean;
  setIsGhostMode: (v: boolean | ((p: boolean) => boolean)) => void;
  fontScale: FontScale;
  setFontScale: (v: FontScale) => void;
  densityMode: DensityMode;
  setDensityMode: (v: DensityMode) => void;
  activeYear: number;
  setActiveYear: (y: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  aiModelPreference: string;
  setAiModelPreference: (m: string) => void;
  lastUpdatedStr: string | null;
  setLastUpdatedStr: (s: string | null) => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setViewRaw] = useState<ViewState>(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page === 'privacy') return ViewState.PRIVACY;
    if (page === 'terms') return ViewState.TERMS;
    return ViewState.DASHBOARD;
  });

  const setView = useCallback((v: ViewState) => {
    setViewRaw(v);
    const params = new URLSearchParams(window.location.search);
    if (v === ViewState.PRIVACY) params.set('page', 'privacy');
    else if (v === ViewState.TERMS) params.set('page', 'terms');
    else params.delete('page');
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [globalModal, setGlobalModal] = useState<GlobalModalState>({ type: null });
  const [inspector, setInspector] = useState<InspectorState>({ isOpen: false, title: '', subtitle: '', transactions: [] });

  const [isDarkMode, setIsDarkMode] = useIndexedDB<boolean>('fintrack_dark_mode', true);
  const [isGhostMode, setIsGhostMode] = useIndexedDB<boolean>('fintrack_ghost_mode', false);
  const [fontScale, setFontScale] = useIndexedDB<FontScale>('fintrack_font_scale', FontScale.NORMAL);
  const [densityMode, setDensityMode] = useIndexedDB<DensityMode>('fintrack_density_mode', DensityMode.ZEN);
  const [activeYear, setActiveYear] = useIndexedDB<number>('fintrack_active_year', new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [aiModelPreference, setAiModelPreference] = useIndexedDB<string>('fintrack_ai_model', 'gemini-3-flash-preview');
  const [lastUpdatedStr, setLastUpdatedStr] = useIndexedDB<string | null>('fintrack_last_updated', null);

  return (
    <SystemContext.Provider value={{ 
      currentView, setView, isSearchOpen, setIsSearchOpen, isTourActive, setIsTourActive, 
      globalModal, setGlobalModal, inspector, setInspector,
      isDarkMode, setIsDarkMode, isGhostMode, setIsGhostMode, fontScale, setFontScale, 
      densityMode, setDensityMode, activeYear, setActiveYear, selectedYear, setSelectedYear, 
      aiModelPreference, setAiModelPreference, lastUpdatedStr, setLastUpdatedStr
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SystemContext);
  if (!context) throw new Error('useSettings must be used within SystemProvider');
  return context;
};
