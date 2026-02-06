import React from 'react';
import { Info, ChevronRight, Home, Activity, Terminal } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { PrivacyValue } from '../core-ui/PrivacyValue';
import { InstitutionalStatCard, StatVariant } from '../core-ui/InstitutionalStatCard';
import { useFinancialStore } from '../../context/FinancialContext';

interface CardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  controls?: React.ReactNode;
  subtext?: string;
  className?: string;
  info?: string;
}

export const AnalyticsCard: React.FC<CardProps> = ({ title, icon: Icon, children, controls, subtext, className = "", info }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 md:p-10 rounded-[3rem] shadow-sm flex flex-col relative overflow-hidden group transition-all duration-500 hover:shadow-2xl ${className}`}>
    <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
    
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 relative z-10">
      <div className="space-y-1">
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 shadow-inner">
            <Icon size={24} />
          </div>
          {title}
          {info && (
            <div className="group/info relative">
              <Info size={16} className="text-slate-300 cursor-help hover:text-blue-500 transition-colors" />
              <div className="absolute left-0 bottom-full mb-3 w-72 p-4 bg-slate-900 text-white text-[11px] font-bold leading-relaxed rounded-[1.5rem] opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700">
                {info}
              </div>
            </div>
          )}
        </h3>
        {subtext && <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] pl-[64px]">{subtext}</p>}
      </div>
      {controls && <div className="shrink-0">{controls}</div>}
    </div>
    <div className="flex-1 min-h-0 w-full relative z-10">
      {children}
    </div>
  </div>
);

interface StatHighlightProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  isCurrency?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'info';
  isLoading?: boolean;
}

export const StatHighlight: React.FC<StatHighlightProps> = ({ 
  label, value, subValue, trend, isCurrency = true, variant = 'default', isLoading = false
}) => {
  const variantMap: Record<string, StatVariant> = {
      default: 'blue',
      success: 'emerald',
      danger: 'rose',
      info: 'indigo'
  };

  return (
    <InstitutionalStatCard 
        title={label}
        value={value}
        icon={Activity}
        variant={variantMap[variant]}
        change={trend}
        subValue={subValue}
        isCurrency={isCurrency}
        isLoading={isLoading}
    />
  );
};

export const StandardTooltip = ({ active, payload, label, isDarkMode }: any) => {
  const { isGhostMode } = useFinancialStore();
  if (!active || !payload?.length) return null;

  const total = payload.reduce((acc: number, p: any) => acc + (typeof p.value === 'number' ? p.value : 0), 0);
  
  const globalFinanceKeys = ['income', 'expense', 'value', 'principal', 'net', 'current', 'shadow', 'benchmark', 'portfolio'];
  const isAdditive = payload.length > 1 && 
    !payload.some((p: any) => globalFinanceKeys.includes(p.dataKey?.toString().toLowerCase()));

  const headerText = label || payload[0].payload.name || payload[0].payload.date || 'Details';

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-2 min-w-[200px] z-[100]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-800 pb-2 mb-1">
        {headerText}
      </p>
      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-6 text-[10px] font-black items-center">
            <div className="flex items-center gap-2 truncate flex-1">
              {p.color && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
              <span className="text-slate-500 uppercase truncate">{p.name || p.dataKey}</span>
            </div>
            <span className="text-white font-mono shrink-0">
              {isGhostMode ? '*****' : (typeof p.value === 'number' ? formatBaseCurrency(p.value) : p.value)}
            </span>
          </div>
        ))}
      </div>
      {isAdditive && total > 0 && (
        <div className="flex justify-between gap-6 text-[10px] font-black border-t border-slate-800 pt-2 mt-1">
          <span className="text-blue-400 uppercase tracking-[0.1em] font-black">Total Period</span>
          <span className="text-white font-mono font-black border-b border-blue-500/30">
            {isGhostMode ? '*****' : formatBaseCurrency(total)}
          </span>
        </div>
      )}
    </div>
  );
};

export const DrillBreadcrumbs: React.FC<{ path: string[]; onReset: () => void; onPop: (idx: number) => void; type: string }> = ({ path, onReset, onPop, type }) => (
  <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
    <button onClick={onReset} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${path.length === 0 ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
      <Home size={12} /> <span className="hidden xs:inline">ROOT</span>
    </button>
    {path.map((p, i) => (
      <React.Fragment key={i}>
        <ChevronRight size={10} className="text-slate-300 shrink-0" />
        <button onClick={() => onPop(i)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${i === path.length - 1 ? 'text-blue-600 bg-blue-500/10' : 'text-slate-400 hover:text-slate-900'}`}>
          {p}
        </button>
      </React.Fragment>
    ))}
  </nav>
);