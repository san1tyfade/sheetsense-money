import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Trade, TimeFocus } from '../types';
import { History, Plus, Filter, ArrowRightLeft, Check, Calendar, Zap, Clock, Landmark } from 'lucide-react';
import { filterAndProcessTrades, TradeGroup } from '../services/trades/tradeService';
import { TradeAssetAccordion } from './trades/TradeAssetAccordion';
import { TradeEntryModal } from './trades/TradeEntryModal';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { useSearchProtocol } from '../hooks/useSearchProtocol';
import { useSelection } from '../hooks/useSelection';
import { InstitutionalRegistryTable, ColumnDefinition } from './core-ui/InstitutionalRegistryTable';
import { SelectionActionMatrix } from './core-ui/SelectionActionMatrix';
import { ManagedViewHeader } from './core-ui/ManagedViewHeader';
import { PrivacyValue } from './core-ui/PrivacyValue';
import { BulkEditModal } from './core-ui/BulkEditModal';

export const TradesList: React.FC = () => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { trades, isSyncing: isLoading, isReadOnly, accounts } = store;

  const [viewMode, setViewMode] = useState<'BY_ASSET' | 'RECENT_HISTORY'>('BY_ASSET');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFocus>(TimeFocus.FULL_YEAR);
  const [hideExited, setHideExited] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const search = useSearchProtocol();

  const processedData = useMemo(() => 
    filterAndProcessTrades(trades, search.searchTerm, typeFilter, timeFilter, viewMode, sortDir, hideExited),
    [trades, search.searchTerm, typeFilter, timeFilter, viewMode, sortDir, hideExited]
  );

  const flatTradeList = useMemo(() => {
    if (viewMode === 'RECENT_HISTORY') return processedData as Trade[];
    return (processedData as TradeGroup[]).flatMap(g => g.trades);
  }, [processedData, viewMode]);

  const selection = useSelection(flatTradeList, isReadOnly);

  const accountOptions = useMemo(() => {
    const list = new Set<string>();
    accounts.forEach(a => {
        if (a.institution) list.add(a.institution.toUpperCase());
        if (a.name) list.add(a.name.toUpperCase());
    });
    trades.forEach(t => {
        if (t.account) list.add(t.account.toUpperCase());
    });
    return Array.from(list).sort().map(a => ({ value: a, label: a }));
  }, [accounts, trades]);

  const handleBulkAccountEdit = async (newAccount: string) => {
      await crud.trades.bulkEdit(selection.selectedIds, { account: newAccount });
      selection.clearSelection();
  };

  const columns: ColumnDefinition<Trade>[] = [
    {
      key: 'date',
      header: 'Interaction Timestamp',
      render: (t) => (
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono font-bold text-xs uppercase">
          <Clock size={12} className="opacity-40" /> {t.date}
        </div>
      )
    },
    {
      key: 'ticker',
      header: 'Asset Reference',
      render: (t) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">{t.ticker}</span>
          {t.account && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 mt-1 opacity-70"><Landmark size={8} /> {t.account}</span>}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Protocol Action',
      render: (t) => (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${
          t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-inner' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner'
        }`}>
          <Zap size={10} fill="currentColor" /> {t.type}
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Qty Depth',
      align: 'right',
      render: (t) => <PrivacyValue value={Math.abs(t.quantity)} format="number" precision={4} className="font-mono font-black text-slate-700 dark:text-slate-300 text-sm" />
    },
    {
      key: 'total',
      header: 'Node Settlement',
      align: 'right',
      render: (t) => <PrivacyValue value={Math.abs(t.total)} className="font-mono font-black text-slate-900 dark:text-white text-base" />
    }
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-24 relative">
      <ManagedViewHeader 
        title="Trade"
        titleAccent="Ledger"
        count={trades.length}
        search={search}
        filters={
          <div className="relative" ref={filterMenuRef}>
            <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} className={`relative p-3.5 rounded-xl border-2 transition-all ${typeFilter !== 'ALL' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
              <Filter size={18} />
            </button>
            {isFilterMenuOpen && (
              <div className="absolute left-0 top-full mt-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 rounded-[2rem] shadow-2xl z-[100] p-6 animate-in slide-in-from-top-2">
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-1.5">
                      {['ALL', 'BUY', 'SELL'].map(t => (
                        <button key={t} onClick={() => setTypeFilter(t as any)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${typeFilter === t ? 'bg-blue-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>{t}</button>
                      ))}
                    </div>
                 </div>
              </div>
            )}
          </div>
        }
        sort={{ label: sortDir, activeKey: sortDir, onClick: () => setSortDir(p => p === 'DESC' ? 'ASC' : 'DESC') }}
        viewToggle={{ isTable: viewMode === 'RECENT_HISTORY', onToggle: () => setViewMode(prev => prev === 'BY_ASSET' ? 'RECENT_HISTORY' : 'BY_ASSET') }}
        actions={!isReadOnly && (
          <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl shadow-xl transition-all active:scale-95 group">
            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          </button>
        )}
      />

      <TradeEntryModal isOpen={isAddModalOpen || !!editingTrade} initialData={editingTrade} onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); }} onSave={async (t) => editingTrade ? crud.trades.edit(t) : crud.trades.add(t)} />

      <BulkEditModal 
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onConfirm={handleBulkAccountEdit}
        count={selection.selectedIds.size}
        fieldName="Target Account"
        description="Enter or select institutional account"
        options={accountOptions}
      />

      <div className={`space-y-8 transition-all duration-700 ${isLoading ? 'opacity-40 grayscale blur-[2px] pointer-events-none' : ''}`}>
        {viewMode === 'BY_ASSET' ? (
          <div className="grid grid-cols-1 gap-6">
            {(processedData as TradeGroup[]).map(group => (
              <TradeAssetAccordion key={group.ticker} group={group} isLoading={isLoading} onDelete={crud.trades.delete} onEdit={setEditingTrade} isReadOnly={isReadOnly} selection={selection} />
            ))}
          </div>
        ) : (
          <InstitutionalRegistryTable 
            data={processedData as Trade[]}
            columns={columns}
            selection={selection}
            onEdit={(t) => setEditingTrade(t)}
            onDelete={(t) => crud.trades.delete(t)}
            isReadOnly={isReadOnly}
            isLoading={isLoading}
          />
        )}
      </div>

      <SelectionActionMatrix 
        onBulkDelete={crud.trades.bulkDelete} 
        onBulkEdit={() => setIsBulkEditOpen(true)}
        selectedIds={selection.selectedIds} 
        clearSelection={selection.clearSelection} 
        label="Events" 
      />
    </div>
  );
};