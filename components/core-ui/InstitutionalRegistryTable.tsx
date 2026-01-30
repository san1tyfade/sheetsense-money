import React from 'react';
import { Pencil, Trash2, Cpu } from 'lucide-react';
import { SelectionManager } from '../../hooks/useSelection';
import { DirtyGlyph } from './DirtyGlyph';
import { InstitutionalTable, InstitutionalTableHead, InstitutionalTableBody } from './InstitutionalTable';

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface InstitutionalRegistryTableProps<T extends { id: string; isDirty?: boolean; rowIndex?: number; isManaged?: boolean }> {
  data: T[];
  columns: ColumnDefinition<T>[];
  selection: SelectionManager<T>;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
}

export function InstitutionalRegistryTable<T extends { id: string; isDirty?: boolean; rowIndex?: number; isManaged?: boolean }>({
  data, columns, selection, onEdit, onDelete, isReadOnly, isLoading
}: InstitutionalRegistryTableProps<T>) {
  
  // Calculate local "Select All" state based on the actual items being rendered in this instance
  const isSubsetAllSelected = data.length > 0 && data.every(item => selection.selectedIds.has(item.id));
  
  const handleLocalToggleAll = () => {
    if (isReadOnly) return;
    const ids = data.map(item => item.id);
    if (isSubsetAllSelected) {
        selection.deselectItems(ids);
    } else {
        selection.selectItems(ids);
    }
  };

  return (
    <InstitutionalTable>
      <InstitutionalTableHead>
        <tr>
          {!isReadOnly && (
            <th className="px-6 py-6 w-12 text-center">
              <input 
                type="checkbox" 
                checked={isSubsetAllSelected} 
                onChange={handleLocalToggleAll} 
                className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500/20 cursor-pointer" 
              />
            </th>
          )}
          {columns.map(col => (
            <th key={col.key} className={`px-10 py-6 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`} style={{ width: col.width }}>{col.header}</th>
          ))}
          <th className="px-10 py-6 w-24"></th>
        </tr>
      </InstitutionalTableHead>
      <InstitutionalTableBody>
        {data.map((item, idx) => {
          const isSelected = selection.selectedIds.has(item.id);
          return (
            <tr key={item.id} onClick={(e) => selection.handleRowClick(e, item, idx)} className={`transition-colors group/row tabular-nums cursor-pointer relative ${isSelected ? 'bg-blue-500/10' : 'hover:bg-blue-500/5'}`}>
              {!isReadOnly && (
                <td className="px-6 py-8 text-center" onClick={(e) => e.stopPropagation()}>
                  <DirtyGlyph active={item.isDirty} />
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => selection.toggleSelection(item.id)} 
                    className="w-4 h-4 rounded border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer" 
                  />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key} className={`px-10 py-8 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
              <td className="px-10 py-8 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                    {!isReadOnly ? (
                      <>
                        {onEdit && (!item.isManaged) && <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl active:scale-90 shadow-sm transition-all"><Pencil size={14} /></button>}
                        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-xl active:scale-90 shadow-sm transition-all"><Trash2 size={14} /></button>}
                      </>
                    ) : item.isManaged && <div className="p-2.5 text-slate-200 dark:text-slate-800" title="Managed Node"><Cpu size={14} /></div>}
                </div>
              </td>
            </tr>
          );
        })}
      </InstitutionalTableBody>
    </InstitutionalTable>
  );
}