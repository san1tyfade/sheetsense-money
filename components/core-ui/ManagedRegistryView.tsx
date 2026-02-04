import React, { useState } from 'react';
import { ManagedEntity, ViewState } from '../../types';
import { ManagedViewHeader } from './ManagedViewHeader';
import { InstitutionalRegistryTable, ColumnDefinition } from './InstitutionalRegistryTable';
import { SelectionActionMatrix } from './SelectionActionMatrix';
import { DataNodeState } from './DataNodeState';
import { BulkEditModal } from './BulkEditModal';
import { useSelection } from '../../hooks/useSelection';
import { useViewControls } from '../../hooks/useViewControls';
import { useFinancialStore } from '../../context/FinancialContext';
import { useFinancialActions } from '../../hooks/useFinancialActions';

interface ManagedRegistryViewProps<T extends ManagedEntity> {
    title: string;
    titleAccent: string;
    label: string;
    data: T[];
    columns: ColumnDefinition<T>[];
    sortFns: Record<string, (a: T, b: T) => number>;
    filterFn: (item: T, term: string) => boolean;
    defaultSort: string;
    modalType: 'TRADE' | 'ASSET' | 'SUBSCRIPTION' | 'ACCOUNT' | null;
    bulkEditField?: { name: string, description: string, options?: { value: string, label: string }[] };
    renderCustomGrid?: (items: T[]) => React.ReactNode;
    renderCustomAccordion?: (items: T[], selection: any, onEdit: (i: T) => void) => React.ReactNode;
}

export function ManagedRegistryView<T extends ManagedEntity>({
    title, titleAccent, label, data, columns, sortFns, filterFn, defaultSort, modalType, bulkEditField, renderCustomGrid, renderCustomAccordion
}: ManagedRegistryViewProps<T>) {
    const { isSyncing, isReadOnly, setGlobalModal } = useFinancialStore();
    const crud = useFinancialActions();

    const controls = useViewControls<T>(data, sortFns, filterFn, defaultSort);
    const selection = useSelection(controls.data, isReadOnly);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    const handleBulkEdit = async (value: string) => {
        const tabKey = modalType?.toLowerCase() + 's';
        const controller = (crud as any)[modalType?.toLowerCase() === 'subscription' ? 'subs' : (modalType?.toLowerCase() + 's')];
        if (controller?.bulkEdit) {
            await controller.bulkEdit(selection.selectedIds, { [bulkEditField!.name]: value });
            selection.clearSelection();
        }
    };

    return (
        <div className="space-y-6 md:space-y-12 animate-fade-in pb-24 relative">
            <ManagedViewHeader 
                title={title} titleAccent={titleAccent} count={controls.data.length} countLabel={label} search={controls.search}
                sort={{ label: controls.sort.key, activeKey: controls.sort.key, onClick: () => controls.sort.set(p => Object.keys(sortFns).find(k => k !== p) || p) }}
                viewToggle={renderCustomGrid || renderCustomAccordion ? { isTable: controls.view.isTable, onToggle: controls.view.toggle } : undefined}
                actions={!isReadOnly && modalType && (
                    <button onClick={() => setGlobalModal({ type: modalType })} className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl shadow-xl active:scale-95 group">
                        <span className="font-black">+</span>
                    </button>
                )}
            />

            <DataNodeState isLoading={isSyncing} isEmpty={data.length === 0} emptyLabel={`No ${label} logged in current chapter`}>
                <div className={`transition-all duration-700 ${isSyncing ? 'opacity-40 grayscale blur-[2px]' : ''}`}>
                    {controls.view.isTable ? (
                        <InstitutionalRegistryTable 
                            data={controls.data} columns={columns} selection={selection} isReadOnly={isReadOnly}
                            onEdit={(item) => setGlobalModal({ type: modalType, initialData: item })}
                            onDelete={(item) => (crud as any)[modalType?.toLowerCase() === 'subscription' ? 'subs' : (modalType?.toLowerCase() + 's')]?.delete(item)}
                        />
                    ) : (
                        renderCustomGrid ? renderCustomGrid(controls.data) : 
                        renderCustomAccordion ? renderCustomAccordion(controls.data, selection, (i) => setGlobalModal({ type: modalType, initialData: i })) : null
                    )}
                </div>
            </DataNodeState>

            <SelectionActionMatrix 
                label={label} selectedIds={selection.selectedIds} clearSelection={selection.clearSelection}
                onBulkDelete={(ids) => (crud as any)[modalType?.toLowerCase() === 'subscription' ? 'subs' : (modalType?.toLowerCase() + 's')]?.bulkDelete(ids)}
                onBulkEdit={bulkEditField ? () => setIsBulkEditOpen(true) : undefined}
            />

            {bulkEditField && (
                <BulkEditModal 
                    isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} onConfirm={handleBulkEdit}
                    count={selection.selectedIds.size} fieldName={bulkEditField.description} description={`Update ${bulkEditField.description}`}
                    options={bulkEditField.options}
                />
            )}
        </div>
    );
}