
import React, { useState, useMemo } from 'react';
import { Subscription, BankAccount } from '../types';
import { Landmark, ShieldCheck, Receipt, Menu, X, ChevronRight, Terminal } from 'lucide-react';
import { TaxRoomTracker } from './information/TaxRoomTracker';
import { CommitmentsTab } from './information/CommitmentsTab';
import { AccountsRegistryTab } from './information/AccountsRegistryTab';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { PerspectiveToggle } from './core-ui/PerspectiveToggle';
import { StatusState } from './shared/StatusState';

type InfoTab = 'tax' | 'commitments' | 'accounts';

export const InformationView: React.FC = () => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { subscriptions, accounts, taxRecords, isSyncing: isLoading, isReadOnly, setTaxRecords, setGlobalModal } = store;

  const [activeTab, setActiveTab] = useState<InfoTab>('tax');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs: { id: InfoTab; label: string; icon: any; desc: string }[] = [
    { id: 'tax', label: 'Tax Matrix', icon: ShieldCheck, desc: 'Contribution room & limits' },
    { id: 'commitments', label: 'Commitments', icon: Receipt, desc: 'Recurring costs & debt' },
    { id: 'accounts', label: 'Institutions', icon: Landmark, desc: 'Bank accounts & identity' }
  ];

  const activeTabInfo = tabs.find(t => t.id === activeTab);
  const activeCountBadge = useMemo(() => {
    if (activeTab === 'tax') return { val: taxRecords.length, label: 'Logs' };
    if (activeTab === 'commitments') return { val: subscriptions.length, label: 'Subs' };
    return { val: accounts.length, label: 'Banks' };
  }, [activeTab, taxRecords, subscriptions, accounts]);

  return (
    <div className="space-y-12 animate-fade-in pb-24 px-2 md:px-0 tabular-nums">
      <header className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="space-y-1">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col">
                Institutional <span className="text-blue-600 dark:text-blue-400">Registry</span>
              </h2>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group">
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors"></div>
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter relative z-10">{activeCountBadge.val}</span>
                <span className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1">{activeCountBadge.label}</span>
              </div>
              <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl active:scale-95 transition-all"><Menu size={20} /></button>
            </div>
          </div>

          <PerspectiveToggle
            options={tabs.map(t => ({ id: t.id, label: t.label.split(' ')[0], icon: t.icon }))}
            value={activeTab}
            onChange={setActiveTab}
            className="hidden md:flex"
          />
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registry Hub</h3><button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-400"><X size={24} /></button></div>
            <div className="space-y-4">{tabs.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setIsMenuOpen(false); }} className={`w-full flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${activeTab === t.id ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300'}`}>
                <div className="flex items-center gap-5 text-left"><div className={`p-3 rounded-2xl ${activeTab === t.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><t.icon size={20} /></div><div><p className="font-black uppercase text-xs tracking-widest">{t.label}</p><p className="text-[10px] opacity-60 font-bold mt-0.5">{t.desc}</p></div></div><ChevronRight size={18} className={activeTab === t.id ? 'opacity-100' : 'opacity-20'} /></button>))}
            </div>
          </div>
        </div>
      )}

      <StatusState isLoading={isLoading} loadingMessage="Syncing Registry Data...">
        {activeTab === 'tax' && <TaxRoomTracker taxRecords={taxRecords} isLoading={isLoading} onAddTaxRecord={async r => setTaxRecords([...taxRecords, r])} onEditTaxRecord={async r => setTaxRecords(taxRecords.map(old => old.id === r.id ? r : old))} onDeleteTaxRecord={async r => setTaxRecords(taxRecords.filter(old => old.id !== r.id))} />}
        {activeTab === 'commitments' && <CommitmentsTab subscriptions={subscriptions} debtEntries={store.debtEntries} isLoading={isLoading} isReadOnly={isReadOnly} onAdd={() => setGlobalModal({ type: 'SUBSCRIPTION' })} onEdit={(s) => setGlobalModal({ type: 'SUBSCRIPTION', initialData: s })} onDelete={crud.subs.delete} />}
        {activeTab === 'accounts' && <AccountsRegistryTab accounts={accounts} isReadOnly={isReadOnly} onAdd={() => setGlobalModal({ type: 'ACCOUNT' })} onEdit={(acc) => setGlobalModal({ type: 'ACCOUNT', initialData: acc })} onDelete={crud.accounts.delete} />}
      </StatusState>

      <footer className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-center pb-12 opacity-50">
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          <Terminal size={14} className="text-blue-500" /> Authorized Registry Instance v2.7.0
        </div>
      </footer>
    </div>
  );
};
