
import React, { useEffect, useState } from 'react';
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
import { RegistryModal } from './components/information/RegistryModal';
import { restoreSession, initGoogleAuth } from './services/authService';
import { useFinancialStore } from './context/FinancialContext';
import { useFinancialActions } from './hooks/useFinancialActions';
import { ViewState, TourStep, Subscription, BankAccount, DensityMode } from './types';
import { ShieldCheck, Terminal, Receipt, Landmark, ArrowRightLeft, CreditCard, CloudAlert } from 'lucide-react';
import { PRIMARY_CURRENCY } from './services/currencyService';

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

  const isReadOnly = selectedYear !== activeYear;

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

  // Global Modal Form State
  const [subForm, setSubForm] = useState<Partial<Subscription>>({});
  const [accForm, setAccForm] = useState<Partial<BankAccount>>({});
  const [isSubmittingGlobal, setIsSubmittingGlobal] = useState(false);

  useEffect(() => {
    if (globalModal.type === 'SUBSCRIPTION') {
        setSubForm(globalModal.initialData || { name: '', cost: 0, period: 'Monthly', category: 'General', active: true });
    }
    if (globalModal.type === 'ACCOUNT') {
        setAccForm(globalModal.initialData || { institution: '', name: '', type: 'Checking', paymentType: 'Card', transactionType: 'Debit', currency: PRIMARY_CURRENCY, purpose: '' });
    }
  }, [globalModal]);

  const handleGlobalSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmittingGlobal(true);
    try {
      await crud.subs.add(subForm as Subscription);
      setGlobalModal({ type: null });
      notify('success', 'Commitment Provisioned', `${subForm.name} added to registry.`);
    } catch (err: any) { 
      notify('error', 'Provision Failed', err.message || err);
    } finally { setIsSubmittingGlobal(false); }
  };

  const handleGlobalAccSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmittingGlobal(true);
    try {
      await crud.accounts.add(accForm as BankAccount);
      setGlobalModal({ type: null });
      notify('success', 'Institution Linked', `${accForm.institution} registered in vault.`);
    } catch (err: any) { 
        notify('error', 'Mapping Failed', err.message || err);
    } finally { setIsSubmittingGlobal(false); }
  };

  const handleResolveConflict = async (action: 'OVERWRITE' | 'MERGE') => {
      setConflict(null);
      if (action === 'MERGE') {
          // Simply pull remote and re-apply local state (local-first state persists in context)
          await sync();
      } else {
          // Perform the commit immediately
          await store.commitDelta();
      }
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
            <div className="md:hidden font-black text-xl tracking-tighter uppercase text-slate-950 dark:text-white">
              Sheetsense
            </div>
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
          <div className="max-w-[1400px] mx-auto">
            <ViewDispatcher />
          </div>
        </div>
        
        <div className="h-20 md:hidden" />
      </main>

      <GlobalSearchOverlay />
      <MobileSearchFAB />
      <InspectorDrawer />
      <NotificationHost />
      
      {conflict && (
          <ConflictResolutionModal 
            conflict={conflict} 
            onResolve={handleResolveConflict} 
            onCancel={() => setConflict(null)} 
          />
      )}

      {/* Global Orchestration Modals */}
      <TradeEntryModal 
        isOpen={globalModal.type === 'TRADE'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={crud.trades.add} 
      />
      <AssetEntryModal 
        isOpen={globalModal.type === 'ASSET'} 
        initialData={globalModal.initialData} 
        onClose={() => setGlobalModal({ type: null })} 
        onSave={crud.assets.add} 
      />

      <RegistryModal 
        isOpen={globalModal.type === 'SUBSCRIPTION'} 
        onClose={() => setGlobalModal({ type: null })} 
        title="New Commitment" 
        icon={Receipt} 
        iconColor="text-indigo-500" 
        isSubmitting={isSubmittingGlobal} 
        onSubmit={handleGlobalSubSubmit}
      >
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Name</label><input type="text" value={subForm.name || ''} onChange={e => setSubForm({...subForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount</label><input type="number" step="any" value={subForm.cost || ''} onChange={e => setSubForm({...subForm, cost: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold font-mono outline-none text-slate-900 dark:text-white" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Period</label><select value={subForm.period} onChange={e => setSubForm({...subForm, period: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none text-slate-900 dark:text-white cursor-pointer"><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option><option value="Weekly">Weekly</option></select></div>
          </div>
        </div>
      </RegistryModal>

      <RegistryModal 
        isOpen={globalModal.type === 'ACCOUNT'} 
        onClose={() => setGlobalModal({ type: null })} 
        title="Register Institution" 
        icon={Landmark} 
        iconColor="text-emerald-500" 
        isSubmitting={isSubmittingGlobal} 
        onSubmit={handleGlobalAccSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bank Name</label><input type="text" value={accForm.institution || ''} onChange={e => setAccForm({...accForm, institution: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-900 dark:text-white" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Label</label><input type="text" value={accForm.name || ''} onChange={e => setAccForm({...accForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-900 dark:text-white" placeholder="e.g. Primary" required /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <ArrowRightLeft size={10} className="text-blue-500" /> Flow Class
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => setAccForm({...accForm, transactionType: 'Debit'})} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${accForm.transactionType === 'Debit' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}>Debit</button>
                    <button type="button" onClick={() => setAccForm({...accForm, transactionType: 'Credit'})} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${accForm.transactionType === 'Credit' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Credit</button>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <CreditCard size={10} className="text-blue-500" /> Network Type
                </label>
                <div className="relative">
                  <input 
                    list="global-payment-types" 
                    value={accForm.paymentType || ''} 
                    onChange={e => setAccForm({...accForm, paymentType: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest outline-none focus:border-blue-500 text-slate-900 dark:text-white" 
                    placeholder="e.g. Card, Cash..."
                  />
                  <datalist id="global-payment-types">
                      <option value="Card" />
                      <option value="Cash" />
                      <option value="Transfer" />
                      <option value="Crypto" />
                      <option value="Physical" />
                  </datalist>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account Type</label><input type="text" placeholder="e.g. Checking" value={accForm.type || ''} onChange={e => setAccForm({...accForm, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last 4</label><input type="text" maxLength={4} inputMode="numeric" value={accForm.accountNumber || ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setAccForm({...accForm, accountNumber: val}); }} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black font-mono outline-none text-slate-900 dark:text-white" /></div>
          </div>
        </div>
      </RegistryModal>

      {isTourActive && (
        <GuidedTour 
          steps={TOUR_STEPS} 
          onComplete={() => setIsTourActive(false)} 
          onStepChange={(view) => setView(view)} 
        />
      )}
    </div>
  );
};

export default App;
