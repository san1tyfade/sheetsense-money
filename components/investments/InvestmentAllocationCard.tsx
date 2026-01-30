
import React, { memo } from 'react';
import { ChevronRight, Terminal } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';

interface InvestmentAllocationCardProps {
    title: string;
    value: number;
    total: number;
    icon: any;
    colorClass: string;
    isLoading: boolean;
    onClick: () => void;
    isSelected: boolean;
}

export const InvestmentAllocationCard = memo(({ 
    title, value, total, icon: Icon, colorClass, isLoading, onClick, isSelected 
}: InvestmentAllocationCardProps) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  
  // Explicit color mapping to ensure Tailwind compiler picks up the utility classes
  const colorMap: Record<string, { bg: string, border: string, fill: string, text: string }> = {
    'text-blue-500': { bg: 'bg-blue-500/5', border: 'border-blue-500/40', fill: 'bg-blue-500', text: 'text-blue-500' },
    'text-orange-500': { bg: 'bg-orange-500/5', border: 'border-orange-500/40', fill: 'bg-orange-500', text: 'text-orange-500' },
    'text-blue-400': { bg: 'bg-blue-400/5', border: 'border-blue-400/40', fill: 'bg-blue-400', text: 'text-blue-400' },
    'text-emerald-500': { bg: 'bg-emerald-500/5', border: 'border-emerald-500/40', fill: 'bg-emerald-500', text: 'text-emerald-500' },
  };

  const theme = colorMap[colorClass] || colorMap['text-blue-500'];
  
  return (
    <button 
        onClick={onClick}
        className={`w-full text-left bg-white dark:bg-slate-800/40 border p-8 rounded-[2.5rem] flex flex-col justify-between transition-all duration-500 relative overflow-hidden backdrop-blur-xl group active:scale-[0.98] ${
            isSelected 
            ? 'border-blue-500 shadow-2xl -translate-y-1' 
            : `border-slate-200 dark:border-slate-700/50 ${theme.border} shadow-sm hover:shadow-xl`
        }`}
    >
        <div className={`absolute -top-20 -right-20 w-64 h-64 ${theme.bg} rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000`}></div>
        
        <div className="flex justify-between items-start mb-10 relative z-10">
            <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 ${colorClass} shadow-inner transition-transform duration-500 group-hover:scale-110`}>
                <Icon size={24} />
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Node Weight</span>
                <p className={`text-xl font-black font-mono leading-none mt-1 ${colorClass}`}>{percent.toFixed(1)}%</p>
            </div>
        </div>

        <div className="space-y-1 relative z-10">
            <h4 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] truncate pr-4" title={title}>{title}</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center tracking-tighter ghost-blur leading-none">
                {isLoading ? (
                    <div className="h-10 w-40 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                ) : (
                    formatBaseCurrency(value).replace(/\.00$/, '')
                )}
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center relative z-10">
            <div className="h-1 flex-1 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden mr-4 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-1000 ${theme.fill}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                <Terminal size={10} /> Node {isSelected ? 'Focus' : 'Active'}
            </span>
        </div>
    </button>
  );
});
