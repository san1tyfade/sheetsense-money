
import React, { useState, useMemo, useEffect } from 'react';
import { StatementProcessor } from './tools/StatementProcessor';
import { JournalView } from './JournalView';
import { useFinancialStore } from '../context/FinancialContext';
import { ViewHeader } from './core-ui/ViewHeader';
import { Terminal, LayoutGrid, Zap, History, Info, Activity, Calendar, Store, Database, Loader2, Radio, TrendingUp, TrendingDown, ShieldCheck, ShieldAlert, CheckCircle2, RotateCcw, Search, BarChart2, BookOpen } from 'lucide-react';
import { buildSpendingHierarchy, LeafType, HierarchyNode } from '../services/analytics/hierarchyService';
import { SpendTreemap } from './spend/SpendTreemap';
import { DrillBreadcrumbs } from './analytics/AnalyticsPrimitives';
import { CustomDateRange, ViewState } from '../types';
import { TemporalSovereign } from '../services/temporalService';
import { TimeFocusSelector } from './TimeFocusSelector';
import { haptics } from '../services/infrastructure/HapticService';
import { PrivacyValue } from './core-ui/PrivacyValue';
import { formatBaseCurrency } from '../services/currencyService';
import { PerspectiveToggle } from './core-ui/PerspectiveToggle';

type SpendMode = 'AUDIT' | 'INSIGHTS' | 'JOURNAL';

export const SpendView: React.FC = () => {
  const store = useFinancialStore();
  const { 
    detailedExpenses, setView, sync, journalEntries, timeline, 
    timeFocus, setTimeFocus, selectedYear, isSyncing, isFetchingPrices, isGhostMode,
    identityMatrix
  } = store;
  
  const [customRange, setCustomRange] = useState<CustomDateRange>({ 
    start: TemporalSovereign.toISO(new Date(selectedYear, 0, 1)), 
    end: TemporalSovereign.getLogicalTodayISO(selectedYear)
  });

  const [mode, setMode] = useState<SpendMode>('INSIGHTS');
  const [metric, setMetric] = useState<'VALUE' | 'COUNT'>('VALUE');
  const [leafType, setLeafType] = useState<LeafType>('MERCHANT');
  const [isPulseMode, setIsPulseMode] = useState(false);
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [hoverData, setHoverData] = useState<{ node: HierarchyNode, total: number } | null>(null);

  useEffect(() => {
    setCustomRange({
      start: TemporalSovereign.toISO(new Date(selectedYear, 0, 1)), 
      end: TemporalSovereign.getLogicalTodayISO(selectedYear)
    });
  }, [selectedYear]);

  const hierarchy = useMemo(() => 
    buildSpendingHierarchy(journalEntries || [], timeline || [], timeFocus, customRange, selectedYear, metric, leafType, isPulseMode, identityMatrix || {}),
    [journalEntries, timeline, timeFocus, customRange, selectedYear, metric, leafType, isPulseMode, identityMatrix]
  );

  const activeFocusNode = useMemo(() => {
    let node = hierarchy;
    if (!node) return null;
    for (const part of drillPath) {
      const found = node.children?.find(c => c.name === part);
      if (found) node = found;
      else break;
    }
    return node;
  }, [hierarchy, drillPath]);

  const unallocatedTotal = activeFocusNode?.unallocatedValue || 0;
  const isFullyReconciled = unallocatedTotal <= 0.01;

  useEffect(() => {
    setDrillPath([]);
    setHoverData(null);
  }, [isPulseMode, leafType]);

  const handlePulseToggle = () => {
    haptics.pulse('light');
    setIsPulseMode(!isPulseMode);
  };

  const handleMetricToggle = (m: 'VALUE' | 'COUNT') => {
    haptics.click('soft');
    setMetric(m);
  };

  const handleLeafToggle = (lt: LeafType) => {
    haptics.click('soft');
    setLeafType(lt);
  };

  const handleHoverChange = (node: HierarchyNode | null, total: number) => {
      if (node) {
          setHoverData({ node, total });
      } else {
          setHoverData(null);
      }
  };

  const modes: { id: SpendMode; label: string; icon: any }[] = [
    { id: 'INSIGHTS', label: 'Insights', icon: BarChart2 },
    { id: 'AUDIT', label: 'Audit', icon: Search },
    { id: 'JOURNAL', label: 'Journal', icon: BookOpen }
  ];

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in pb-24">
       <header className="pt-2 pb-2">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
           <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
             <div className="space-y-1">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
                  Resource <span className="text-blue-600 dark:text-blue-400">Spend</span>
                </h2>
             </div>
           </div>

           <div className="flex items-center gap-6">
              <PerspectiveToggle 
                options={modes}
                value={mode}
                onChange={setMode}
              />

              {(isSyncing || isFetchingPrices) && (
                <div className="hidden xl:flex items-center gap-4">
                  {isSyncing ? (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                      <Loader2 className="animate-spin text-blue-600" size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Syncing</span>
                    </div>
                  ) : isFetchingPrices && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <Radio className="animate-pulse text-emerald-500" size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Quotes</span>
                    </div>
                  )}
                </div>
              )}
           </div>
         </div>
       </header>

       <div className="flex-1 min-h-0 px-2 md:px-0">
            {mode === 'AUDIT' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StatementProcessor 
                        detailedExpenses={detailedExpenses}
                        onNavigate={(v: ViewState) => setView(v)}
                        onRefresh={() => sync(['expenses'])}
                    />
                </div>
            ) : mode === 'JOURNAL' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <JournalView isSubView={true} />
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-800/40 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 backdrop-blur-xl shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                <button 
                                    onClick={handlePulseToggle}
                                    title="Pulse Mode (Top 10)"
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isPulseMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Zap size={12} className={isPulseMode ? 'fill-current' : ''} />
                                    <span className="hidden sm:inline">Pulse</span>
                                </button>
                                <button 
                                    onClick={handlePulseToggle}
                                    title="Structure Mode (Hierarchical)"
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isPulseMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutGrid size={12} />
                                    <span className="hidden sm:inline">Hierarchy</span>
                                </button>
                            </div>

                            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                <button 
                                    onClick={() => handleMetricToggle('VALUE')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${metric === 'VALUE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Database size={12} />
                                    <span className="hidden sm:inline">$ Amount</span>
                                </button>
                                <button 
                                    onClick={() => handleMetricToggle('COUNT')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${metric === 'COUNT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Activity size={12} />
                                    <span className="hidden sm:inline">Frequency</span>
                                </button>
                            </div>

                            {!isPulseMode && (
                                <>
                                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <button 
                                            onClick={() => handleLeafToggle('MERCHANT')} 
                                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${leafType === 'MERCHANT' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Store size={12} />
                                            <span className="hidden sm:inline">Merchant</span>
                                        </button>
                                        <button 
                                            onClick={() => handleLeafToggle('MONTH')} 
                                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${leafType === 'MONTH' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Calendar size={12} />
                                            <span className="hidden sm:inline">Monthly</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <TimeFocusSelector current={timeFocus} onChange={setTimeFocus} customRange={customRange} onCustomRangeChange={setCustomRange} />
                            </div>
                            <div className="group relative shrink-0">
                                <Info size={16} className="text-slate-300 cursor-help hover:text-blue-500" />
                                <div className="absolute right-0 top-full mt-3 w-64 p-5 bg-slate-900 text-white text-[10px] font-bold leading-relaxed rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700">
                                    {isPulseMode ? "Pulse Mode ignores categories to highlight your Top 10 spending destinations globally." : "Heatmap intensity represents capital concentration relative to total volume."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isPulseMode && (
                        <div className="flex items-center justify-between gap-4 px-4 h-10 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                            <DrillBreadcrumbs 
                                path={drillPath} 
                                onReset={() => { haptics.click('soft'); setDrillPath([]); }} 
                                onPop={(idx) => { haptics.click('soft'); setDrillPath(prev => prev.slice(0, idx + 1)); }} 
                                type="Spending"
                            />
                            {drillPath.length > 0 && (
                                <button 
                                    onClick={() => { haptics.click('soft'); setDrillPath([]); }}
                                    className="flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-all active:scale-95 group"
                                >
                                    <RotateCcw size={12} className="group-hover:-rotate-45 transition-transform" />
                                    Reset Matrix
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 min-h-[500px] lg:h-[700px]">
                            <SpendTreemap 
                              root={hierarchy} 
                              drillPath={drillPath} 
                              onDrill={setDrillPath}
                              metric={metric}
                              onHover={handleHoverChange}
                            />
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            {/* Logic Cluster Inspect Box */}
                            <div className="bg-slate-950 p-10 rounded-[3rem] border-2 border-slate-900 text-center relative overflow-hidden hidden lg:flex flex-col justify-center min-h-[350px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                                
                                {hoverData ? (
                                    <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
                                        <div className="border-b border-slate-800 pb-5">
                                            <div className="flex justify-center mb-2">
                                                {hoverData.node.isJournalBacked && (
                                                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/20 uppercase tracking-widest">
                                                        <ShieldCheck size={10}/> Audited Node
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-tight truncate leading-tight">{hoverData.node.name}</h4>
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2">Active Logic Cluster</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 text-left">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Position</p>
                                                <PrivacyValue value={hoverData.node.value} className="text-lg font-black text-white font-mono" />
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mt-1">
                                                    {((hoverData.node.value / (hoverData.total || 1)) * 100).toFixed(1)}% weight
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monthly Flow</p>
                                                <PrivacyValue value={hoverData.node.avgMonthly || 0} className="text-lg font-black text-blue-400 font-mono" />
                                                {hoverData.node.variance !== undefined && (
                                                    <div className={`flex items-center gap-1 justify-end text-[10px] font-black uppercase mt-1 ${hoverData.node.variance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {hoverData.node.variance > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                                        {Math.abs(hoverData.node.variance).toFixed(1)}% vs Normal
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {hoverData.node.maxHit && (
                                            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Zap size={10} className="text-amber-500" /> Peak Interaction
                                                </span>
                                                <PrivacyValue value={hoverData.node.maxHit} className="text-sm font-black text-slate-300 font-mono" />
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
                                            <Terminal size={12} /> Logic_Cluster_Inspect_v2
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 animate-in fade-in duration-500">
                                        <Zap className="mx-auto mb-6 text-slate-700 animate-pulse" size={40} />
                                        <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4 flex items-center justify-center gap-4">
                                            <div className="w-6 h-[1px] bg-slate-800" /> Logical Audit <div className="w-6 h-[1px] bg-slate-800" />
                                        </h5>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-loose opacity-60">
                                            Hover over Heatmap segments to inspect high-fidelity constituent details. Temporal focus: {timeFocus}.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reconciliation Status Box */}
                            <div className={`p-10 rounded-[3rem] border-2 transition-all duration-700 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden group ${isFullyReconciled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-[0.08] transition-opacity"></div>
                                <div className="relative z-10 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-4 rounded-2xl shadow-inner ${isFullyReconciled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {isFullyReconciled ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reconciliation</p>
                                            <h4 className={`text-xl font-black uppercase tracking-tighter ${isFullyReconciled ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {isFullyReconciled ? 'Verified' : 'Incomplete'}
                                            </h4>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Unallocated Volume</p>
                                        <h2 className={`text-4xl font-black font-mono tracking-tighter ${isFullyReconciled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-white animate-pulse'}`}>
                                            <PrivacyValue value={unallocatedTotal} />
                                        </h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">
                                            {isFullyReconciled 
                                                ? "All Ledger nodes are backed by verified receipts." 
                                                : "Delta detected between Ledger totals and Journal events."}
                                        </p>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Database size={12} className="text-slate-400" />
                                            <span className="text-[8px] font-black uppercase text-slate-400">Context: {drillPath[drillPath.length - 1] || 'Global Root'}</span>
                                        </div>
                                        {!isFullyReconciled && (
                                            <button 
                                                onClick={() => setMode('AUDIT')}
                                                className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] hover:text-blue-600"
                                            >
                                                Resolve Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="flex justify-center opacity-30 pt-12 pb-8">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] flex items-center gap-4">
                             <Terminal size={14} /> Behavioral Insights v1.2.5 Final
                         </span>
                    </footer>
                </div>
            )}
       </div>
    </div>
  );
};
