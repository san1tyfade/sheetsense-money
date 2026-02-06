import React, { useMemo, useState } from 'react';
import { Asset } from '../types';
import { Plus, Zap, Cpu } from 'lucide-react';
import { AssetCard } from './assets/AssetCard';
import { AssetEntryModal } from './assets/AssetEntryModal';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { useSelection } from '../hooks/useSelection';
import { useViewControls } from '../hooks/useViewControls';
import { InstitutionalRegistryTable, ColumnDefinition } from './core-ui/InstitutionalRegistryTable';
import { SelectionActionMatrix } from './core-ui/SelectionActionMatrix';
import { ManagedViewHeader } from './core-ui/ManagedViewHeader';
import { getAssetIcon } from '../services/domain/classificationHub';
import { convertToBase, getCurrencyFlag } from '../services/currencyService';
import { PrivacyValue } from './core-ui/PrivacyValue';

export const AssetsList: React.FC = () => {
  const { assets, isSyncing, rates, isReadOnly } = useFinancialStore();
  const crud = useFinancialActions();

  const controls = useViewControls<Asset>(
    assets,
    {
      value: (a, b) => convertToBase(b.value, b.currency, rates) - convertToBase(a.value, a.currency, rates),
      name: (a, b) => a.name.localeCompare(b.name)
    },
    (a, term) => a.name.toLowerCase().includes(term) || (a.type || '').toLowerCase().includes(term),
    'value'
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const selection = useSelection(controls.data, isReadOnly);

  const columns: ColumnDefinition<Asset>[] = [
    {
      key: 'name', header: 'Instrument Identity',
      render: (a) => (
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover/row:scale-105 transition-transform shadow-inner">{getAssetIcon(a.type)}</div>
          <div className="flex flex-col gap-1.5"><span className="font-black text-slate-900 dark:text-white tracking-widest uppercase text-base">{a.name}</span></div>
        </div>
      )
    },
    { key: 'type', header: 'Classification', render: (a) => <div className="inline-flex px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700">{a.type}</div> },
    { key: 'native', header: 'Native Valuation', align: 'right', render: (a) => <div className="flex items-center justify-end gap-2 text-slate-400 font-mono font-bold text-sm"><span className="text-[10px] opacity-40">{getCurrencyFlag(a.currency)}</span><PrivacyValue value={a.value} format="number" precision={2} /></div> },
    { key: 'value', header: 'Global Core (CAD)', align: 'right', render: (a) => <PrivacyValue value={convertToBase(a.value, a.currency, rates)} className="font-mono font-black text-slate-900 dark:text-white text-base" /> }
  ];

  return (
    <div className="space-y-6 md:space-y-12 animate-fade-in pb-24 relative">
      <ManagedViewHeader 
        title="Asset" titleAccent="Inventory" count={controls.data.length} search={controls.search}
        sort={{ label: controls.sort.key, activeKey: controls.sort.key, onClick: () => controls.sort.set(p => p === 'value' ? 'name' : 'value') }}
        viewToggle={{ isTable: controls.view.isTable, onToggle: controls.view.toggle }}
        actions={!isReadOnly && <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl shadow-xl active:scale-95 group"><Plus size={24} className="group-hover:rotate-90 transition-transform" /></button>}
      />

      <AssetEntryModal isOpen={isAddModalOpen || !!editingAsset} initialData={editingAsset} onClose={() => { setIsAddModalOpen(false); setEditingAsset(null); }} onSave={async (a) => editingAsset ? crud.assets.edit(a) : crud.assets.add(a)} />

      <div className={`transition-all duration-700 ${isSyncing ? 'opacity-40 grayscale blur-[2px]' : ''}`}>
        {controls.view.isTable ? (
          // Fix: Wrapped setEditingAsset in callback to satisfy InstitutionalRegistryTable onEdit requirement
          <InstitutionalRegistryTable data={controls.data} columns={columns} selection={selection} onEdit={(item: Asset) => setEditingAsset(item)} onDelete={crud.assets.delete} isReadOnly={isReadOnly} isLoading={isSyncing} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {controls.data.map(asset => <AssetCard key={asset.id} asset={asset} isLoading={isSyncing} exchangeRates={rates} onDelete={crud.assets.delete} onEdit={setEditingAsset} />)}
          </div>
        )}
      </div>

      <SelectionActionMatrix onBulkDelete={crud.assets.bulkDelete} selectedIds={selection.selectedIds} clearSelection={selection.clearSelection} label="Assets" />
    </div>
  );
};
