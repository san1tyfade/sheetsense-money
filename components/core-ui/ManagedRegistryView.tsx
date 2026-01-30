
import React from 'react';
import { Plus } from 'lucide-react';
import { PerspectiveHeader } from './PerspectiveHeader';
import { InstitutionalRegistryTable, ColumnDefinition } from './InstitutionalRegistryTable';
import { SelectionActionMatrix } from './SelectionActionMatrix';
import { useViewControls } from '../../hooks/useViewControls';
import { useSelection } from '../../hooks/useSelection';
import { useSovereignAction } from '../../hooks/useSovereignAction';
import { useFinancialStore } from '../../context/FinancialContext';

interface ManagedRegistryViewProps<T> {
  schemaId: string;
  tabKey: string;
  data: T[];
  setData: (data: T[]) => void;
  columns: ColumnDefinition<T>[];
  sortFns: Record<string, (a: T, b: T) => number>;
  filterFn: (item: T, term: string) => boolean;
  defaultSort: string;
  title: string;
  titleAccent: string;
  modalType: 'TRADE' | 'ASSET' | 'SUBSCRIPTION' | 'ACCOUNT';
  label: string;
  // added hideTitle prop to fix IntrinsicAttributes error in JournalView
  hideTitle?: boolean;
}

export function ManagedRegistryView<T extends { id: string; isDirty?: boolean; rowIndex?: number; isManaged?: boolean }>({
  schemaId, tabKey, data, setData, columns, sortFns, filterFn, defaultSort, title, titleAccent, modalType, label, hideTitle
}: ManagedRegistryViewProps<T>) {
  const { isSyncing, isReadOnly, setGlobalModal } = useFinancialStore();
  const crud = useSovereignAction<T>(schemaId, tabKey, data, setData);

  const controls = useViewControls<T>(
    data,
    sortFns,
    filterFn,
    defaultSort
  );

  const selection = useSelection(controls.data, isReadOnly);

  return (
    <div className="space-y-6 md:space-y-12 animate-fade-in pb-24 relative">
      <PerspectiveHeader 
        title={title} 
        titleAccent={titleAccent} 
        count={controls.data.length}
        // pass through hideTitle to PerspectiveHeader
        hideTitle={hideTitle}
        slots={{
          discovery: (
            <div className="flex items-center gap-1 sm:gap-2 px-1 py-1">
              <div className={`flex items-center transition-all duration-500 overflow-hidden shrink-0 ${controls.search.isExpanded ? 'bg-slate-100 dark:bg-slate-950 w-full sm:w-64 md:w-96' : 'w-11 sm:w-12'} rounded-xl border border-slate-200 dark:border-slate-700 h-10 sm:h-11 md:h-12`}>
                <button onClick={controls.search.toggle} className={`flex items-center justify-center shrink-0 w-11 sm:w-12 h-full transition-colors ${controls.search.isExpanded ? 'text-blue-500' : 'text-slate-400'}`}>
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                <input ref={controls.search.inputRef} type="text" placeholder="DISCOVER..." value={controls.search.searchTerm} onChange={e => controls.search.setSearchTerm(e.target.value)} className="flex-1 bg-transparent border-none text-[10px] font-black tracking-widest outline-none text-slate-900 dark:text-white uppercase placeholder:text-slate-400" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                 <button onClick={() => controls.view.toggle()} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
                    {controls.view.isTable ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" strokeWidth="2" /></svg>}
                 </button>
              </div>
            </div>
          ),
          actions: !isReadOnly && (
            <button onClick={() => setGlobalModal({ type: modalType })} className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl shadow-xl active:scale-95 group">
              <Plus size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
          )
        }}
      />

      <div className={`transition-all duration-700 ${isSyncing ? 'opacity-40 grayscale blur-[2px]' : ''}`}>
        <InstitutionalRegistryTable 
            data={controls.data} 
            columns={columns} 
            selection={selection} 
            onEdit={(item: T) => setGlobalModal({ type: modalType, initialData: item })} 
            onDelete={crud.delete} 
            isReadOnly={isReadOnly} 
            isLoading={isSyncing} 
        />
      </div>

      <SelectionActionMatrix onBulkDelete={crud.bulkDelete} selectedIds={selection.selectedIds} clearSelection={selection.clearSelection} label={label} />
    </div>
  );
}
