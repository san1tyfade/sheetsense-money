import React, { useMemo, useState, useCallback } from 'react';
import { CustomDateRange } from '../types';
import { Wallet, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { calculateDashboardAggregates, resolveAttribution, processNetIncomeTrend } from '../services/dashboard/dashboardService';
import { StatsCard } from './dashboard/DashboardStats';
import { WealthDriversCard } from './dashboard/WealthDrivers';
import { NetWorthChart, IncomeChart, AllocationChart, DrilldownView } from './dashboard/DashboardCharts';
import { useFinanceData, useSettings, useSync } from '../context/FinancialContext';
import { ViewHeader } from './core-ui/ViewHeader';
import { TemporalSovereign } from '../services/temporalService';
import { FinancialEngine } from '../services/math/FinancialEngine';

export const Dashboard: React.FC = () => {
  const { 
    assets, netWorthHistory, incomeData, expenseData, debtEntries, accounts, 
    rates, reconciledInvestments, livePrices, trades, discovery, sync, timeFocus, setTimeFocus
  } = useFinanceData();

  const { isDarkMode, selectedYear, setSelectedYear, activeYear } = useSettings();
  const { isSyncing } = useSync();

  const isReadOnly = selectedYear !== activeYear;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => ({ 
    start: TemporalSovereign.toISO(new Date(selectedYear, 0, 1)), 
    end: TemporalSovereign.getLogicalTodayISO(selectedYear)
  }));

  const aggregates = useMemo(() => 
    calculateDashboardAggregates(assets, debtEntries, rates, reconciledInvestments, livePrices, trades),
    [assets, debtEntries, rates, reconciledInvestments, livePrices, trades]
  );

  const attributionData = useMemo(() => 
    resolveAttribution(aggregates.netWorth, netWorthHistory, incomeData, expenseData, timeFocus, customRange, selectedYear),
    [aggregates.netWorth, netWorthHistory, incomeData, expenseData, timeFocus, customRange, selectedYear]
  );

  const netWorthChange = useMemo(() => {
    if (netWorthHistory.length < 1) return null;
    const sorted = [...netWorthHistory].filter(d => d.date.startsWith(String(selectedYear))).sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return null;
    const latestLoggedValue = sorted[0].value;
    return FinancialEngine.change(aggregates.netWorth, latestLoggedValue);
  }, [aggregates.netWorth, netWorthHistory, selectedYear]);

  const netIncomeData = useMemo(() => 
    processNetIncomeTrend(incomeData, expenseData, selectedYear),
    [incomeData, expenseData, selectedYear]
  );

  const chartData = useMemo(() => [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date)), [netWorthHistory]);

  const handleSync = useCallback(() => {
    sync();
  }, [sync]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-24">
      <ViewHeader 
        title="Intelligence"
        titleAccent="Dashboard"
        actions={
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white p-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group"
          >
            <RefreshCw size={28} className={`${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          </button>
        }
      />

      <div className={`transition-all duration-700 space-y-6 md:space-y-8 ${isSyncing ? 'opacity-50 grayscale blur-[1px] pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-2 md:px-0">
            <StatsCard title="Atomic Net Worth" value={aggregates.netWorth} icon={Activity} color="blue" isLoading={isSyncing} change={netWorthChange} isHistorical={isReadOnly} />
            <StatsCard title="Portfolio Core" value={aggregates.totalInvestments} icon={ArrowUpRight} color="emerald" isLoading={isSyncing} isHistorical={isReadOnly} />
            <StatsCard title="Global Liquidity" value={aggregates.totalCash} icon={Wallet} color="purple" isLoading={isSyncing} isHistorical={isReadOnly} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 px-2 md:px-0">
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
                    data={aggregates.allocationData} 
                    selectedCategory={selectedCategory} 
                    onSelect={setSelectedCategory} 
                    isDarkMode={isDarkMode} 
                />
            </div>
        </div>

        {selectedCategory && (
            <div className="px-2 md:px-0">
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
  );
};