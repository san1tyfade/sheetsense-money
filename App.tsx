import React, { useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { ViewDispatcher } from './components/ViewDispatcher';
import { GuidedTour } from './components/GuidedTour';
import { GlobalSearchOverlay } from './components/GlobalSearchOverlay';
import { MobileSearchFAB } from './components/MobileSearchFAB';
import { GlobalChronometer } from './components/core-ui/GlobalChronometer';
import { InspectorDrawer } from './components/core-ui/InspectorDrawer';
import { NotificationHost } from './components/core-ui/NotificationHost';
import { ConflictResolutionModal } from './components/core-ui/ConflictResolutionModal';
import { TradeEntryModal } from './components/trades/TradeEntryModal';
import { AssetEntryModal } from './components/assets/AssetEntryModal';
import { SubscriptionEntryModal } from './components/information/SubscriptionEntryModal';
import { AccountEntryModal } from './components/information/AccountEntryModal';
import { restoreSession, initGoogleAuth } from './services/authService';
import { useFinancialStore } from './context/FinancialContext';
import { useFinancialActions } from './hooks/useFinancialActions';
import { ViewState, TourStep } from './types';
import { ShieldCheck, Terminal, CloudAlert } from 'lucide-react';

const TOUR_STEPS: TourStep[] = [
  { targetId: 'nav-dashboard', title: 'Intelligence Core', content: 'Your financial nerve center. View atomic net worth, cash flow velocity, and asset distribution in real-time.', view: ViewState.DASHBOARD },
  { targetId: 'nav-assets', title: 'Inventory Matrix', content: 'Register your holdings across physical and digital classes. We handle multi-currency conversion automatically.', view: ViewState.ASSETS },
  { targetId: 'nav-income', title: 'The Ledger', content: 'Deep dive into spending habits. Toggle between visual flow analysis and a granular editable table.', view: ViewState.INCOME },
  { targetId: 'nav-cockpit', title: 'Strategic Cockpit', content: 'Run sophisticated wealth simulations. Drag income and expense nodes to see your future net worth trajectory.', view: ViewState.COCKPIT },
  { targetId: 'desktop-sync-btn', title: 'Global Sync', content: 'Everything is local-first. Use this to bridge your local vault with your private Google Spreadsheet.', view: ViewState.DASHBOARD }
];

export const App: React.FC = () => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { 
    authSession, sheetConfig, isDarkMode, isGhostMode, fontScale, densityMode,
    selectedYear, activeYear, isTourActive, setIsTourActive, notify,
    setView, currentView, isSyncing, globalModal, setGlobalModal, isDirty, dirtyCount,
    conflict, setConflict, sync
  } = store;

  useEffect(() => {
    if (authSession) restoreSession(authSession.token, authSession.expires);
    if (sheetConfig.clientId) initGoogleAuth(sheetConfig.clientId);
  }, [authSession, sheetConfig.clientId]);

  useEffect(() => {
    const scales = ['font-scale-small', 'font-scale-normal', 'font-scale-large'];
    document.documentElement.classList.remove(...scales);
    document.documentElement.classList.add(`font-scale-${fontScale.toLowerCase()}`);
    
    const densityClasses = ['density-zen', 'density-compact'];
    document.documentElement.classList.remove(...densityClasses);
    document.documentElement.classList.add(`density-${densityMode.toLowerCase()}`);
  }, [fontScale, densityMode]);

  const handleResolveConflict = async (action: 'OVERWRITE' | 'MERGE') => {
      setConflict(null);
      if (action === 'MERGE') await sync();
      else await store.commitDelta();
  };

  const showChronometer = [ViewState.DASHBOARD, ViewState.INCOME, ViewState.ANALYTICS, ViewState.COCKPIT].includes(currentView);

  return (
    <div className={`flex flex-col md:flex-row min-h-screen ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'} ${isGhostMode ? 'privacy-active' : ''} transition-colors duration-300`}>
      <Navigation />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        <header className={`sticky top-0 z-40 w-full px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-500 ${
          showChronometer 
          ? 'bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50' 
          : 'bg-transparent border-transparent'
        }`}>
          <div className="flex items-center gap-4">
            <div className="md:hidden font-black text-xl tracking-tighter uppercase text-slate-950 dark:text-white">Sheetsense</div>
            {showChronometer && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 opacity-60">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Local-First Persistence</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isDirty && !isSyncing && (
                <div className="hidden sm:flex items-center gap-2 text-amber-500 animate-in slide-in-from-right-4">
                  <CloudAlert size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{dirtyCount} Delta Pending</span>
                </div>
            )}
            {isSyncing && (
              <div className="hidden sm:flex items-center gap-2 text-blue-500 animate-pulse">
                <Terminal size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Processing Inbound Node</span>
              </div>
            )}
            {showChronometer && <GlobalChronometer />}
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          <div className="max-w-[1400px] mx-auto"><ViewDispatcher /></div>
        </div>
        <div className="h-20 md:hidden" />
      </main>

      <GlobalSearchOverlay />
      <MobileSearchFAB />
      <InspectorDrawer />
      <NotificationHost />
      
      {conflict && <ConflictResolutionModal conflict={conflict} onResolve={handleResolveConflict} onCancel={() => setConflict(null)} />}

      <TradeEntryModal 
        isOpen={globalModal.type === 'TRADE'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={async (t) => globalModal.initialData?.id ? crud.trades.edit(t) : crud.trades.add(t)} 
      />
      <AssetEntryModal 
        isOpen={globalModal.type === 'ASSET'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={async (a) => globalModal.initialData?.id ? crud.assets.edit(a) : crud.assets.add(a)} 
      />
      <SubscriptionEntryModal 
        isOpen={globalModal.type === 'SUBSCRIPTION'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={async (s) => globalModal.initialData?.id ? crud.subs.edit(s) : crud.subs.add(s)} 
      />
      <AccountEntryModal 
        isOpen={globalModal.type === 'ACCOUNT'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={async (acc) => globalModal.initialData?.id ? crud.accounts.edit(acc) : crud.accounts.add(acc)} 
      />

      {isTourActive && <GuidedTour steps={TOUR_STEPS} onComplete={() => setIsTourActive(false)} onStepChange={(view) => setView(view)} />}
    </div>
  );
};

export default App;
