
import React, { useState, useMemo, useEffect } from 'react';
import { TimeFocus, CustomDateRange, AnalyticsSubView } from '../types';
import { ChevronRight, Settings2, Columns, ArrowUpDown, Clock, Zap, X, Check, BarChart2, TrendingUp } from 'lucide-react';
import { TimeFocusSelector } from './TimeFocusSelector';
import { FlowAnalytics } from './analytics/FlowAnalytics';
import { PortfolioAnalytics } from './analytics/PortfolioAnalytics';
import { useFinancialStore } from '../context/FinancialContext';
import { getTemporalWindows } from '../services/temporalService';
import { PerspectiveToggle } from './core-ui/PerspectiveToggle';

export const AnalyticsView: React.FC = () => {
  const store = useFinancialStore();
  const { portfolioHistory, selectedYear, reconciledInvestments: investments, isSyncing: isLoading, trades } = store;

  const [subView, setSubView] = useState<AnalyticsSubView>('FLOW');
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedAccount, setSelectedAccount] = useState('TOTAL');
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [sortMode, setSortMode] = useState<'TOTAL' | 'VARIANCE'>('TOTAL');
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(TimeFocus.ROLLING_12M);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const windows = useMemo(() => getTemporalWindows(timeFocus, customRange, selectedYear), [timeFocus, customRange, selectedYear]);
  
  const formattedRange = useMemo(() => {
    const dStart = new Date(windows.current.start + 'T00:00:00');
    const dEnd = new Date(windows.current.end + 'T00:00:00');
    
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return "Processing Sequence...";

    const startStr = dStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
    const endStr = dEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });

    return `${startStr} — ${endStr}`;
  }, [windows]);

  const views: { id: AnalyticsSubView; label: string; icon: any }[] = [
    { id: 'FLOW', label: 'Flow', icon: BarChart2 },
    { id: 'PORTFOLIO', label: 'Returns', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6 md:space-y-12 animate-fade-in pb-24 tabular-nums">
      <header className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="flex items-center justify-between md:justify-start gap-6 sm:gap-10">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
              Intelligence <span className="text-blue-600 dark:text-blue-400">Hub</span>
            </h2>
            
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group">
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                <span className="text-xl sm:text-3xl font-black text-white tracking-tighter relative z-10">{selectedYear}</span>
                <span className="text-[7px] sm:text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10">Context</span>
            </div>
          </div>

          <nav className="flex flex-col md:flex-row md:items-center gap-4">
            <PerspectiveToggle 
              options={views}
              value={subView}
              onChange={setSubView}
            />

            {subView === 'FLOW' && (
               <div className="flex items-center justify-center gap-4 md:ml-4 border-l-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6">
                  <button onClick={() => setActiveType('EXPENSE')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'EXPENSE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>Expenses</button>
                  <span className="text-slate-300 dark:text-slate-700 font-light text-xs">/</span>
                  <button onClick={() => setActiveType('INCOME')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeType === 'INCOME' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>Incomes</button>
               </div>
            )}
          </nav>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800/40 p-3 md:p-6 rounded-[2rem] md:rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 shadow-sm backdrop-blur-xl mx-2">
        <div className="flex flex-row gap-4 items-center justify-between w-full">
             <div className="flex-1 min-w-0">
                <TimeFocusSelector current={timeFocus} onChange={setTimeFocus} customRange={customRange} onCustomRangeChange={setCustomRange} />
                <div className="flex items-center gap-2 mt-2 px-3 md:hidden">
                    <Clock size={10} className="text-blue-500 opacity-50" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{formattedRange}</span>
                </div>
             </div>
             
             {subView === 'FLOW' && (
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="md:hidden p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all shrink-0"
                    aria-label="Logic Settings"
                >
                    <Settings2 size={18} />
                </button>
             )}

             <div className="hidden md:flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                        {formattedRange}
                    </span>
                </div>
                {subView === 'FLOW' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isComparisonMode ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/30 shadow-sm'}`}>
                        <Columns size={14} /> Delta
                        </button>
                        <button onClick={() => setSortMode(p => p === 'TOTAL' ? 'VARIANCE' : 'TOTAL')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortMode === 'VARIANCE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/30 shadow-sm'}`}>
                        <ArrowUpDown size={14} /> {sortMode === 'TOTAL' ? 'Magnitude' : 'Volatility'}
                        </button>
                    </div>
                )}
             </div>
        </div>
      </div>

      <div className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLoading ? 'opacity-40 grayscale blur-[2px] pointer-events-none' : 'opacity-100'}`}>
        {subView === 'FLOW' ? (
          <FlowAnalytics timeline={store.timeline} timeFocus={timeFocus} customRange={customRange} activeType={activeType} isComparisonMode={isComparisonMode} sortMode={sortMode} />
        ) : (
          <PortfolioAnalytics 
            history={store.portfolioHistory} 
            trades={store.trades} 
            investments={investments} 
            timeFocus={timeFocus} 
            customRange={customRange} 
            selectedAccount={selectedAccount} 
            onAccountChange={setSelectedAccount}
            selectedYear={selectedYear}
          />
        )}
      </div>

      {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex items-end animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
              <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-8 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-full duration-500">
                  <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />
                  
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Settings2 size={20} className="text-blue-500" /> Interaction Protocol
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
                  </div>

                  <div className="space-y-6">
                      <button 
                        onClick={() => setIsComparisonMode(!isComparisonMode)}
                        className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${isComparisonMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-500'}`}
                      >
                          <div className="flex items-center gap-4">
                              <Columns size={20} />
                              <span className="text-xs font-black uppercase tracking-widest">Delta Comparison</span>
                          </div>
                          {isComparisonMode && <Check size={18} strokeWidth={3} />}
                      </button>

                      <button 
                        onClick={() => setSortMode(p => p === 'TOTAL' ? 'VARIANCE' : 'TOTAL')}
                        className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${sortMode === 'VARIANCE' ? 'bg-blue-500/10 border-blue-500 text-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-500'}`}
                      >
                          <div className="flex items-center gap-4">
                              <ArrowUpDown size={20} />
                              <span className="text-xs font-black uppercase tracking-widest">{sortMode === 'TOTAL' ? 'Magnitude Priority' : 'Volatility Priority'}</span>
                          </div>
                          <Zap size={18} className={sortMode === 'VARIANCE' ? 'text-blue-500 fill-blue-500' : 'opacity-20'} />
                      </button>

                      <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] mt-6 shadow-xl"
                      >
                        Apply Logic
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      <footer className="pt-20 pb-12 flex justify-center opacity-40">
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 group">
           <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] group-hover:animate-ping" />
           Predictive Modeling & Statistical Inference Engine
        </div>
      </footer>
    </div>
  );
};
