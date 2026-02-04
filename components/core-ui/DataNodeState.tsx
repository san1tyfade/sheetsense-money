
import React from 'react';
import { LayoutGrid, Loader2 } from 'lucide-react';

interface DataNodeStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export const DataNodeState: React.FC<DataNodeStateProps> = ({ 
  isLoading, isEmpty, emptyLabel = "Empty Registry", children, className = "" 
}) => {
  if (isLoading) {
    return (
      <div className={`relative min-h-[200px] overflow-hidden rounded-[2.5rem] bg-slate-100 dark:bg-slate-900 animate-pulse ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        <div className="flex flex-col items-center justify-center h-full gap-4">
           <Loader2 className="animate-spin text-blue-500 opacity-20" size={32} />
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center py-32 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900/10 ${className}`}>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl mb-6 shadow-inner">
          <LayoutGrid size={48} className="opacity-20" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">{emptyLabel}</p>
      </div>
    );
  }

  return <>{children}</>;
};
