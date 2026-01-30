import React from 'react';
import { Loader2, Radio } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';

interface ViewHeaderProps {
  title: string;
  titleAccent?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  contextBadge?: React.ReactNode;
  showStatus?: boolean;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({ 
  title, titleAccent, subtitle, actions, contextBadge, showStatus = true 
}) => {
  const { isSyncing, isFetchingPrices } = useFinancialStore();

  return (
    <header className="pt-2 pb-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
              {title} {titleAccent && <span className="text-blue-600 dark:text-blue-400">{titleAccent}</span>}
            </h2>
            {subtitle && <p className="md:hidden text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em]">{subtitle}</p>}
          </div>
          
          <div className="flex items-center gap-5">
            {contextBadge}
            {actions}
          </div>
        </div>

        {showStatus && (isSyncing || isFetchingPrices) && (
          <div className="flex flex-col items-end gap-3 px-2 md:px-0">
            <div className="flex items-center gap-4">
              {isSyncing ? (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="animate-spin text-blue-600" size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Syncing Engine</span>
                </div>
              ) : isFetchingPrices && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Radio className="animate-pulse text-emerald-500" size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Live Quotes</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};