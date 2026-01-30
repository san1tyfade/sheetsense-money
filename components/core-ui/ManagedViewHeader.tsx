import React from 'react';
import { Search, X, ChevronDown, Filter, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';
import { DensityMode } from '../../types';
import { haptics } from '../../services/infrastructure/HapticService';

interface ManagedViewHeaderProps {
  title: string;
  titleAccent?: string;
  count?: number;
  countLabel?: string;
  search: {
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    isExpanded: boolean;
    toggle: () => void;
    clear: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  };
  filters?: React.ReactNode;
  sort?: {
    label: string;
    onClick: () => void;
    activeKey: string;
  };
  viewToggle?: {
    isTable: boolean;
    onToggle: () => void;
  };
  actions?: React.ReactNode;
  hideTitle?: boolean;
}

export const ManagedViewHeader: React.FC<ManagedViewHeaderProps> = ({
  title, titleAccent, count, countLabel = "Nodes", search, filters, sort, viewToggle, actions, hideTitle = false
}) => {
  const { densityMode } = useFinancialStore();
  const isCompact = densityMode === DensityMode.COMPACT;

  const handleSearchToggle = () => {
    haptics.click('soft');
    search.toggle();
  };

  const handleSortClick = () => {
    haptics.click('soft');
    sort?.onClick();
  };

  const handleViewToggle = () => {
    haptics.click('soft');
    viewToggle?.onToggle();
  };

  return (
    <div className={`space-y-6 md:space-y-10 ${isCompact ? 'mb-2' : 'mb-6'} relative z-[45]`}>
      {/* Level 1: Identification & Primary Actions */}
      {!hideTitle && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="space-y-1">
              <h2 className={`${isCompact ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase`}>
                {title} {titleAccent && <span className="text-blue-600 dark:text-blue-400">{titleAccent}</span>}
              </h2>
            </div>
            
            <div className="flex items-center gap-5">
              {count !== undefined && (
                <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20 sm:w-24 sm:h-24'} bg-slate-950 dark:bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center shrink-0 group transition-all relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors rounded-[inherit]"></div>
                  <span className={`${isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'} font-black text-white tracking-tighter relative z-10`}>{count}</span>
                  <span className={`${isCompact ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'} font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1`}>{countLabel}</span>
                </div>
              )}
              {actions}
            </div>
          </div>
        </div>
      )}

      {/* Level 2: Discovery Matrix (Search/Filter/Sort) */}
      <div className={`${isCompact ? 'p-2 md:p-3 rounded-[1.5rem]' : 'p-2 md:p-6 rounded-[2rem] md:rounded-[3rem]'} bg-white/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/50 backdrop-blur-md shadow-xl relative z-40`}>
        <div className="flex items-center gap-1 sm:gap-2 px-1 py-1">
          {/* Unified Search Engine */}
          <div className={`flex items-center transition-all duration-500 overflow-hidden shrink-0 ${search.isExpanded ? 'bg-slate-100 dark:bg-slate-950 w-full sm:w-64 md:w-96' : 'w-11 sm:w-12'} rounded-xl border border-slate-200 dark:border-slate-700 h-10 sm:h-11 md:h-12`}>
            <button 
              onClick={handleSearchToggle} 
              className={`flex items-center justify-center shrink-0 w-11 sm:w-12 h-full transition-colors ${search.isExpanded ? 'text-blue-500' : 'text-slate-400'}`}
            >
              <Search size={18} strokeWidth={search.isExpanded ? 3 : 2} />
            </button>
            <input 
              ref={search.inputRef}
              type="text" 
              placeholder="DISCOVER..." 
              value={search.searchTerm} 
              onChange={e => search.setSearchTerm(e.target.value)} 
              className="flex-1 bg-transparent border-none text-[10px] font-black tracking-widest outline-none text-slate-900 dark:text-white uppercase placeholder:text-slate-400"
            />
            {search.searchTerm && (
              <button onClick={search.clear} className="px-2 sm:px-3 text-slate-400 hover:text-rose-500 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          <div className={`h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 sm:mx-2 shrink-0 ${search.isExpanded ? 'hidden sm:block' : 'block'}`} />

          {/* View-Specific Filter Injection Slot */}
          <div className={`flex-1 min-w-0 items-center gap-1 sm:gap-2 relative ${search.isExpanded ? 'hidden sm:flex' : 'flex'}`}>
            {filters}
          </div>

          <div className={`h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 sm:mx-2 shrink-0 ${search.isExpanded ? 'hidden' : 'block'}`} />

          {/* Core Logistic Controls */}
          <div className={`flex items-center gap-1 sm:gap-2 ml-auto shrink-0 ${search.isExpanded ? 'hidden sm:flex' : 'flex'}`}>
            {sort && (
              <button 
                onClick={handleSortClick}
                className="flex items-center gap-1.5 sm:gap-3 px-3 sm:px-5 h-10 sm:h-11 md:h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors shadow-inner whitespace-nowrap"
              >
                <ArrowUpDown size={14} />
                <span>{sort.activeKey.substring(0, 3)}</span>
              </button>
            )}

            {viewToggle && (
              <button 
                onClick={handleViewToggle}
                className={`flex items-center justify-center gap-2 w-10 sm:w-12 md:w-auto md:px-4 h-10 sm:h-11 md:h-12 border rounded-xl transition-all shadow-sm shrink-0 ${viewToggle.isTable ? 'bg-indigo-500 text-white border-indigo-600 shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500'}`}
                title={viewToggle.isTable ? "Table Protocol Active" : "Card Protocol Active"}
              >
                {viewToggle.isTable ? <List size={18} /> : <LayoutGrid size={18} />}
                <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">
                  {viewToggle.isTable ? 'Matrix' : 'Grid'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};