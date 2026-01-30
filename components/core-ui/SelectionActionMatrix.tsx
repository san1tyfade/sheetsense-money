import React from 'react';
import { Trash2, X, Terminal, Pencil } from 'lucide-react';
import { haptics } from '../../services/infrastructure/HapticService';

interface SelectionActionMatrixProps {
  onBulkDelete: (ids: Set<string>) => Promise<void>;
  onBulkEdit?: () => void;
  selectedIds: Set<string>;
  clearSelection: () => void;
  label?: string;
}

export const SelectionActionMatrix: React.FC<SelectionActionMatrixProps> = ({ 
  onBulkDelete, 
  onBulkEdit,
  selectedIds, 
  clearSelection, 
  label = "Nodes" 
}) => {
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleBulkDelete = async () => {
      haptics.click('heavy');
      if (!confirm(`Irreversibly purge ${count} selected ${label.toLowerCase()}?`)) return;
      await onBulkDelete(selectedIds);
      clearSelection();
  };

  const handleBulkEdit = () => {
      haptics.click('light');
      onBulkEdit?.();
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-[500px] px-4 animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-950/95 backdrop-blur-xl border border-blue-500/20 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col sm:flex-row items-center p-1 gap-1">
        <div className="flex items-center gap-3 px-4 py-1.5 flex-1 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-800">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-blue-600/20">
            {count}
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{label} Selected</span>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
              <Terminal size={8} /> Queue_Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 w-full sm:w-auto">
          {onBulkEdit && (
            <button 
                onClick={handleBulkEdit}
                className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 group shadow-md"
            >
                <Pencil size={12} className="group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Bulk Modify</span>
            </button>
          )}

          <button 
            onClick={handleBulkDelete}
            className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl transition-all active:scale-95 group border border-rose-500/20"
          >
            <Trash2 size={12} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Purge</span>
          </button>
          
          <button 
            onClick={clearSelection}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all active:scale-95"
            title="Clear Intent"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};