
import React, { useMemo, useState, useEffect } from 'react';
import { Gauge, RefreshCw, BrainCircuit, Sparkles, Loader2, Database, History, Play, AlertCircle } from 'lucide-react';
import { CockpitMutationState, CockpitBaseline } from '../../types';
import { extractCockpitBaseline } from '../../services/cockpit/baselineEngine';
import { runWealthSimulation } from '../../services/cockpit/projectionEngine';
import { StrategicSankey } from './StrategicSankey';
import { StrategicControls } from './StrategicControls';
import { ProjectionChart } from './ProjectionChart';
import { useFinancialStore } from '../../context/FinancialContext';

export const CockpitView: React.FC = () => {
  const { 
    timeline, assets, debtEntries, rates: exchangeRates, 
    reconciledInvestments, livePrices, trades,
    isDarkMode, discovery, isSyncing, syncAllArchives, selectedYear 
  } = useFinancialStore();
  
  const baseline: CockpitBaseline = useMemo(() => 
    extractCockpitBaseline(
        timeline, 
        assets, 
        debtEntries, 
        exchangeRates, 
        reconciledInvestments, 
        livePrices, 
        trades
    ),
    [timeline, assets, debtEntries, exchangeRates, reconciledInvestments, livePrices, trades]
  );

  const [projectionYears, setProjectionYears] = useState<number>(30);
  const [mutation, setMutation] = useState<CockpitMutationState>({
    globalIncomeMultiplier: 1.0,
    globalExpenseMultiplier: 1.0,
    incomeMultipliers: {},
    expenseMultipliers: {},
    investmentRate: 0.20, 
    macroGrowthRate: 0.07,
    events: []
  });

  const simulationResult = useMemo(() => 
    runWealthSimulation(baseline, mutation, projectionYears),
    [baseline, mutation, projectionYears]
  );

  const initialWealth: number = baseline.totalInvestments + baseline.totalCash;

  const hasInsufficientData = useMemo(() => {
    return timeline.length < 5 && (discovery.remoteArchives.length > 1);
  }, [timeline.length, discovery.remoteArchives.length]);

  useEffect(() => {
    if (hasInsufficientData && !isSyncing && discovery.remoteArchives.length > 1) {
      syncAllArchives();
    }
  }, [hasInsufficientData, isSyncing, discovery.remoteArchives.length, syncAllArchives]);

  const handleReset = () => {
    setMutation({ 
      globalIncomeMultiplier: 1.0, 
      globalExpenseMultiplier: 1.0, 
      incomeMultipliers: {}, 
      expenseMultipliers: {}, 
      investmentRate: 0.20, 
      macroGrowthRate: 0.07, 
      events: [] 
    });
  };

  if (hasInsufficientData) {
      return (
          <div className="max-w-4xl mx-auto py-20 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3.5rem] p-16 shadow-2xl text-center space-y-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-blue-500/10 transition-colors duration-1000"></div>
                  
                  <div className="flex justify-center">
                      <div className="p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-600/20 animate-pulse">
                          <BrainCircuit size={48} />
                      </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence Acquisition Required</h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                          The Strategic Cockpit requires historical financial data to establish a baseline. We detected <span className="text-blue-500 font-bold">{discovery.remoteArchives.length - 1} archive chapters</span> awaiting ingestion.
                      </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <div className="flex gap-4">
                          <div className="shrink-0 p-2 bg-white dark:bg-slate-800 rounded-xl text-emerald-500 shadow-sm"><Database size={20}/></div>
                          <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Deep Sync Protocol</h4>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Fetches income and expense details across all discovered financial years.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <div className="shrink-0 p-2 bg-white dark:bg-slate-800 rounded-xl text-amber-500 shadow-sm"><History size={20}/></div>
                          <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Median Analysis</h4>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Establishes "Typical Month" markers to ensure simulation accuracy.</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex flex-col gap-4 max-w-sm mx-auto">
                      <button 
                        onClick={syncAllArchives} 
                        disabled={isSyncing}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 uppercase text-[11px] tracking-[0.2em]"
                      >
                        {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                        {isSyncing ? 'Ingesting Archives...' : 'Initialize Intelligence'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-fade-in pb-24 px-2">
      <header className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
              Strategic <span className="text-blue-600 dark:text-blue-400">Cockpit</span>
            </h2>
            
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group">
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors"></div>
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter relative z-10">{selectedYear}</span>
                <span className="text-[8px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1">Context</span>
              </div>
              
              <button 
                onClick={handleReset}
                className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white p-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group"
                title="Reset Simulation"
              >
                  <RefreshCw size={28} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>

          <div className="flex bg-white dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm backdrop-blur-sm overflow-hidden shrink-0">
            {[1, 5, 10, 30].map(yr => (
              <button 
                key={yr}
                onClick={() => setProjectionYears(yr)}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${projectionYears === yr ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                {yr}Y Horizon
              </button>
            ))}
          </div>
        </div>
      </header>

      {timeline.length < 2 && (
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-3xl flex items-center gap-4">
              <AlertCircle className="text-amber-500 shrink-0" size={24} />
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Limited Baseline: Projecting using sparse transaction history. Simulation may be unstable.
              </p>
          </div>
      )}

      <StrategicSankey 
        baseline={baseline} 
        mutation={mutation} 
        onMutationChange={setMutation} 
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
          <div className="xl:col-span-3">
              <StrategicControls 
                mutation={mutation} 
                onMutationChange={setMutation} 
                baseline={baseline}
              />
          </div>

          <div className="xl:col-span-9">
              <ProjectionChart 
                result={simulationResult} 
                initialWealth={initialWealth}
                isDarkMode={isDarkMode} 
              />
          </div>
      </div>
    </div>
  );
};
