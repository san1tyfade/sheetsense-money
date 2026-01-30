
import React, { useState } from 'react';
import { IncomeAnalysis } from './income/IncomeAnalysis';
import { IncomeLedger } from './income/IncomeLedger';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { ViewHeader } from './core-ui/ViewHeader';
import { PerspectiveToggle } from './core-ui/PerspectiveToggle';
import { BarChart2, BookOpen } from 'lucide-react';

type ViewMode = 'ANALYSIS' | 'LEDGER';

export const IncomeView: React.FC = () => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { detailedExpenses, detailedIncome, isSyncing: isLoading, isDarkMode, isReadOnly, selectedYear, activeYear, setSelectedYear } = store;

  const [mode, setMode] = useState<ViewMode>('ANALYSIS');

  const modes: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'ANALYSIS', label: 'Analysis', icon: BarChart2 },
    { id: 'LEDGER', label: 'Ledger', icon: BookOpen }
  ];

  return (
    <div className="h-full flex flex-col space-y-12 animate-fade-in">
       <ViewHeader 
        title="Cash"
        titleAccent="Flow"
      />

       <PerspectiveToggle 
          options={modes}
          value={mode}
          onChange={setMode}
          className="px-2"
       />

       <div className="flex-1 min-h-0">
           {mode === 'ANALYSIS' ? (
               <IncomeAnalysis 
                 incomeData={store.incomeData} 
                 expenseData={store.expenseData} 
                 detailedExpenses={detailedExpenses} 
                 isLoading={isLoading} 
                 isDarkMode={isDarkMode} 
                 selectedYear={selectedYear}
               />
           ) : (
               <IncomeLedger 
                   expenseData={detailedExpenses || { months: [], categories: [] }} 
                   incomeData={detailedIncome || { months: [], categories: [] }}
                   isLoading={isLoading} 
                   isReadOnly={isReadOnly}
                   selectedYear={selectedYear}
                   activeYear={activeYear}
                   onYearChange={setSelectedYear}
                   onUpdateExpense={crud.ledger.updateExpense} 
                   onUpdateIncome={crud.ledger.updateIncome}
                />
           )}
       </div>
    </div>
  );
};
