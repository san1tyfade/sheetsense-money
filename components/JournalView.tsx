import React, { useMemo, useState, useEffect, useRef } from 'react';
import { JournalEntry } from '../types';
import { X, Landmark, Clock, Filter, Pencil, Zap, Calendar, CreditCard, Terminal, Store } from 'lucide-react';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { useSearchProtocol } from '../hooks/useSearchProtocol';
import { useSelection } from '../hooks/useSelection';
import { formatBaseCurrency } from '../services/currencyService';
import { InstitutionalRegistryTable, ColumnDefinition } from './core-ui/InstitutionalRegistryTable';
import { PrivacyValue } from './core-ui/PrivacyValue';
import { SelectionActionMatrix } from './core-ui/SelectionActionMatrix';
import { RegistryModal } from './information/RegistryModal';
import { ManagedViewHeader } from './core-ui/ManagedViewHeader';
import { GlassCard } from './core-ui/GlassCard';
import { ManagedField } from './core-ui/ManagedField';
import { saveMerchantIdentity } from '../services/tools/toolMemoryService';
import { BulkEditModal } from './core-ui/BulkEditModal';

interface JournalViewProps {
    isSubView?: boolean;
}

const BATCH_SIZE = 50;

export const JournalView: React.FC<JournalViewProps> = ({ isSubView = false }) => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { journalEntries, isSyncing, isReadOnly, detailedExpenses, detailedIncome } = store;
  
  const search = useSearchProtocol();
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editForm, setEditForm] = useState<Partial<JournalEntry>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setIsSubmitting(true);
    try {
      // Strategy 3: If identity changed, save to memory
      if (editForm.canonicalName && editForm.canonicalName !== editingEntry.canonicalName) {
          await saveMerchantIdentity(editingEntry.description, editForm.canonicalName);
      }
      
      await crud.journal.edit({ ...editingEntry, ...editForm } as JournalEntry);
      setEditingEntry(null);
    } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  const handleBulkIdentityEdit = async (newIdentity: string) => {
      // Apply to all selected items
      const selectedEntries = journalEntries.filter(j => selection.selectedIds.has(j.id));
      
      // Update memory for each unique original description if strategy 3 is desired
      for (const entry of selectedEntries) {
          await saveMerchantIdentity(entry.description, newIdentity);
      }

      await crud.journal.bulkEdit(selection.selectedIds, { canonicalName: newIdentity });
      selection.clearSelection();
  };

  const filteredEntries = useMemo(() => {
    const term = search.searchTerm.toLowerCase();
    return journalEntries.filter(j => {
        const matchesSearch = j.description.toLowerCase().includes(term) || (j.canonicalName || '').toLowerCase().includes(term) || j.category.toLowerCase().includes(term) || j.source.toLowerCase().includes(term);
        const matchesStart = !startDate || j.date >= startDate;
        const matchesEnd = !endDate || j.date <= endDate;
        const matchesCat = categoryFilter === 'ALL' || j.category === categoryFilter;
        const matchesSource = sourceFilter === 'ALL' || j.source === sourceFilter;
        return matchesSearch && matchesStart && matchesEnd && matchesCat && matchesSource;
      }).sort((a, b) => sortDir === 'DESC' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  }, [journalEntries, search.searchTerm, sortDir, startDate, endDate, categoryFilter, sourceFilter]);

  const selection = useSelection(filteredEntries, isReadOnly);
  const displayedEntries = useMemo(() => filteredEntries.slice(0, visibleCount), [filteredEntries, visibleCount]);

  const columns: ColumnDefinition<JournalEntry>[] = [
    {
      key: 'date',
      header: 'Audit Timestamp',
      render: (j) => (
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono font-bold text-xs uppercase tracking-tighter">
          <Clock size={12} className="opacity-40" /> {j.date}
        </div>
      )
    },
    { 
        key: 'description', 
        header: 'Instrument Identity', 
        render: (j) => (
            <div className="flex flex-col gap-1">
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">{j.canonicalName || j.description}</span>
                {j.canonicalName && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter italic">Raw: {j.description}</span>}
            </div>
        )
    },
    {
      key: 'category',
      header: 'Logical Node',
      render: (j) => (
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{j.category}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{j.subCategory}</span>
        </div>
      )
    },
    {
      key: 'source',
      header: 'Source Context',
      render: (j) => (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/10 w-fit">
          <Landmark size={12} /><span className="text-[9px] font-black uppercase tracking-widest">{j.source}</span>
        </div>
      )
    },
    { key: 'amount', header: 'Node Impact', align: 'right', render: (j) => <PrivacyValue value={j.amount} className="font-mono font-black text-slate-900 dark:text-white text-base" /> }
  ];

  const allCategoryOptions = useMemo(() => {
    const list: { category: string, subCategory: string, label: string }[] = [];
    
    if (detailedExpenses?.categories) {
        detailedExpenses.categories.forEach(cat => cat.subCategories.forEach(sub => list.push({ category: cat.name.trim(), subCategory: sub.name.trim(), label: `${cat.name.trim()} › ${sub.name.trim()}` })));
    }
    
    if (detailedIncome?.categories) {
        detailedIncome.categories.forEach(cat => cat.subCategories.forEach(sub => list.push({ category: cat.name.trim(), subCategory: sub.name.trim(), label: `INCOME: ${cat.name.trim()} › ${sub.name.trim()}` })));
    }
    
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [detailedExpenses, detailedIncome]);

  return (
    <div className="space-y-8 animate-fade-in pb-24 relative">
      <ManagedViewHeader 
          title="Audit" titleAccent="Journal" hideTitle={isSubView} count={isSubView ? undefined : journalEntries.length} search={search}
          filters={<button onClick={() => setIsFiltersExpanded(!isFiltersExpanded)} className={`flex items-center gap-3 px-6 h-11 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${isFiltersExpanded ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 text-slate-400'}`}><Filter size={16} /> Matrix</button>}
          sort={{ label: sortDir, activeKey: sortDir, onClick: () => setSortDir(p => p === 'DESC' ? 'ASC' : 'DESC') }}
      />

      {isFiltersExpanded && (
        <GlassCard className="p-8 shadow-xl animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <ManagedField label="Start Bound"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-blue-500 text-slate-900 dark:text-white" /></ManagedField>
                <ManagedField label="End Bound"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-blue-500 text-slate-900 dark:text-white" /></ManagedField>
            </div>
        </GlassCard>
      )}

      <div className={`transition-all duration-700 ${isSyncing ? 'opacity-40 grayscale blur-[1px]' : ''}`}>
          <InstitutionalRegistryTable 
            data={displayedEntries}
            columns={columns}
            selection={selection}
            onEdit={(j) => { setEditingEntry(j); setEditForm({...j}); }}
            onDelete={crud.journal.delete}
            isReadOnly={isReadOnly}
            isLoading={isSyncing}
          />
      </div>

      <RegistryModal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Recalibrate Entry" icon={Pencil} iconColor="text-blue-500" isSubmitting={isSubmitting} onSubmit={handleSaveEdit}>
        <div className="space-y-6">
            <ManagedField label="Unified Identity" info="Strategy 3 Authority">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 h-14 focus-within:border-blue-500/50 transition-all">
                    <Store size={18} className="text-blue-500 shrink-0" />
                    <input 
                        type="text"
                        value={editForm.canonicalName || ''}
                        onChange={e => setEditForm({...editForm, canonicalName: e.target.value})}
                        className="bg-transparent w-full text-sm font-black uppercase tracking-widest outline-none text-slate-900 dark:text-white placeholder:text-slate-300"
                        placeholder={editingEntry?.description}
                    />
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mt-2 italic">Changes here will be remembered for all future ingestions of this merchant.</p>
            </ManagedField>

            <ManagedField label="Logic Target">
                <select 
                    value={allCategoryOptions.find(o => o.category === editForm.category && o.subCategory === editForm.subCategory)?.label || ''} 
                    onChange={e => { 
                        const match = allCategoryOptions.find(o => o.label === e.target.value); 
                        if (match) {
                            setEditForm({ ...editForm, category: match.category, subCategory: match.subCategory }); 
                        } else {
                            setEditForm({ ...editForm, category: 'Uncategorized', subCategory: 'Other' });
                        }
                    }} 
                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 appearance-none text-slate-900 dark:text-white shadow-inner cursor-pointer"
                >
                    <option value="">Uncategorized</option>
                    {allCategoryOptions.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                </select>
            </ManagedField>
        </div>
      </RegistryModal>

      <BulkEditModal 
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onConfirm={handleBulkIdentityEdit}
        count={selection.selectedIds.size}
        fieldName="Unified Identity"
        description="Enter canonical brand name"
      />

      <SelectionActionMatrix 
        onBulkDelete={crud.journal.bulkDelete} 
        onBulkEdit={() => setIsBulkEditOpen(true)}
        selectedIds={selection.selectedIds} 
        clearSelection={selection.clearSelection} 
        label="Transactions" 
      />

      <footer className="pt-20 pb-12 flex justify-center opacity-40">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
             <Terminal size={14} className="text-blue-500" /> Instance Build v2.7.0 Stable
          </div>
      </footer>
    </div>
  );
};