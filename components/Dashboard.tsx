
import React, { useMemo, useState } from 'react';
import { TimeFocus, CustomDateRange, ViewState } from '../types';
import { Wallet, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { calculateDashboardAggregates, resolveAttribution, processNetIncomeTrend } from '../services/dashboard/dashboardService';
import { StatsCard } from './dashboard/DashboardStats';
import { WealthDriversCard } from './dashboard/WealthDrivers';
import { NetWorthChart, IncomeChart, AllocationChart, DrilldownView } from './dashboard/DashboardCharts';
import { useFinancialStore } from '../context/FinancialContext';
import { ViewHeader } from './core-ui/ViewHeader';
import { TemporalSovereign } from '../services/temporalService';
import { FinancialEngine } from '../services/math/FinancialEngine';

export const Dashboard: React.FC = () => {
  const store = useFinancialStore();
  const { 
    assets, netWorthHistory, incomeData, expenseData, debtEntries, accounts, 
    isSyncing, rates, isDarkMode, selectedYear, timeFocus, setTimeFocus, 
    discovery, setSelectedYear, setView, isReadOnly,
    reconciledInvestments, livePrices, trades, sync
  } = store;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<CustomDateRange>({ 
    start: TemporalSovereign.toISO(new Date(selectedYear, 0, 1)), 
    end: TemporalSovereign.getLogicalTodayISO(selectedYear)
  });

  const { netWorth, totalInvestments, totalCash, allocationData } = useMemo(() => 
    calculateDashboardAggregates(assets, debtEntries, rates, reconciledInvestments, livePrices, trades),
    [assets, debtEntries, rates, reconciledInvestments, livePrices, trades]
  );

  const attributionData = useMemo(() => 
    resolveAttribution(netWorth, netWorthHistory, incomeData, expenseData, timeFocus, customRange, selectedYear),
    [netWorth, netWorthHistory, incomeData, expenseData, timeFocus, customRange, selectedYear]
  );

  const netWorthChange = useMemo(() => {
    if (netWorthHistory.length < 1) return null;
    const sorted = [...netWorthHistory].filter(d => d.date.startsWith(String(selectedYear))).sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return null;
    const latestLoggedValue = sorted[0].value;
    return FinancialEngine.change(netWorth, latestLoggedValue);
  }, [netWorth, netWorthHistory, selectedYear]);

  const netIncomeData = useMemo(() => 
    processNetIncomeTrend(incomeData, expenseData, selectedYear),
    [incomeData, expenseData, selectedYear]
  );

  const chartData = useMemo(() => [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date)), [netWorthHistory]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-24">
      <ViewHeader 
        title="Intelligence"
        titleAccent="Dashboard"
        actions={
          <button 
            onClick={() => sync()}
            disabled={isSyncing}
            className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white p-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group"
          >
            <RefreshCw size={28} className={`${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          </button>
        }
      />

      <div className={`transition-all duration-700 space-y-6 md:space-y-8 ${isSyncing ? 'opacity-50 grayscale blur-[1px] pointer-events-none' : ''}`}>
        {/* Top Row: Core Financial Pulse */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-2 md:px-0">
            <StatsCard title="Atomic Net Worth" value={netWorth} icon={Activity} color="blue" isLoading={isSyncing} change={netWorthChange} isHistorical={isReadOnly} />
            <StatsCard title="Portfolio Core" value={totalInvestments} icon={ArrowUpRight} color="emerald" isLoading={isSyncing} isHistorical={isReadOnly} />
            <StatsCard title="Global Liquidity" value={totalCash} icon={Wallet} color="purple" isLoading={isSyncing} isHistorical={isReadOnly} />
        </div>

        {/* Unified Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 px-2 md:px-0">
            {/* Left Column: Temporal History & Flow Dynamics */}
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <NetWorthChart 
                  data={chartData} 
                  isDarkMode={isDarkMode} 
                  selectedYear={selectedYear} 
                  isHistorical={isReadOnly} 
                  timeFocus={timeFocus} 
                  onFocusChange={setTimeFocus} 
                  customRange={customRange} 
                  onCustomRangeChange={setCustomRange} 
                  incomeData={incomeData} 
                  expenseData={expenseData} 
                  startValue={attributionData.startValue} 
                  availableYears={discovery.remoteArchives} 
                  onYearChange={setSelectedYear} 
                />
                
                <IncomeChart 
                    data={netIncomeData} 
                    incomeData={incomeData}
                    expenseData={expenseData}
                    isDarkMode={isDarkMode} 
                />
            </div>

            {/* Right Column: Allocation and Distribution Metrics */}
            <div className="lg:col-span-4 space-y-6 md:space-y-8">
                <WealthDriversCard 
                    assets={assets} 
                    debtEntries={debtEntries} 
                    accounts={accounts}
                    exchangeRates={rates}
                    isLoading={isSyncing} 
                    reconciledInvestments={reconciledInvestments}
                    livePrices={livePrices}
                    trades={trades}
                />
                
                <AllocationChart 
                    data={allocationData} 
                    selectedCategory={selectedCategory} 
                    onSelect={setSelectedCategory} 
                    isDarkMode={isDarkMode} 
                />

                {selectedCategory && allocationData.length > 0 && (
                    <div className="lg:hidden animate-fade-in-up">
                        <DrilldownView 
                            category={selectedCategory} 
                            assets={assets.filter(a => (a.type || 'Other') === selectedCategory)} 
                            exchangeRates={rates} 
                            onClose={() => setSelectedCategory(null)} 
                        />
                    </div>
                )}
            </div>
        </div>

        {selectedCategory && allocationData.length > 0 && (
            <div className="hidden lg:block px-2 md:px-0">
                <DrilldownView 
                    category={selectedCategory} 
                    assets={assets.filter(a => (a.type || 'Other') === selectedCategory)} 
                    exchangeRates={rates} 
                    onClose={() => setSelectedCategory(null)} 
                />
            </div>
        )}

        <footer className="mt-12 pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-center pb-12">
            <button 
                onClick={() => setView(ViewState.PRIVACY)}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-4 group"
            >
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                Identity Governance & Infrastructure Standards
            </button>
        </footer>
      </div>
    </div>
  );
};
