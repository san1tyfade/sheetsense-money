
import React, { useState } from 'react';
import { IncomeAnalysis } from './income/IncomeAnalysis';
import { IncomeLedger } from './income/IncomeLedger';
import { useFinancialStore } from '../context/FinancialContext';
import { useFinancialActions } from '../hooks/useFinancialActions';
import { ViewHeader } from './core-ui/ViewHeader';

type ViewMode = 'ANALYSIS' | 'LEDGER';

export const IncomeView: React.FC = () => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { detailedExpenses, detailedIncome, isSyncing: isLoading, isDarkMode, isReadOnly, selectedYear, activeYear, setSelectedYear } = store;

  const [mode, setMode] = useState<ViewMode>('ANALYSIS');

  return (
    <div className="h-full flex flex-col space-y-12 animate-fade-in">
       <ViewHeader 
        title="Cash"
        titleAccent="Flow"
      />

       <nav className="flex items-center gap-3 px-2 text-base font-black tracking-tight">
          <button 
            onClick={() => setMode('ANALYSIS')}
            className={`transition-all duration-300 hover:text-slate-900 dark:hover:text-white ${mode === 'ANALYSIS' ? 'text-slate-900 dark:text-white scale-105 underline decoration-blue-500 decoration-2 underline-offset-8' : 'text-slate-400'}`}
          >
            Analysis
          </button>
          <span className="text-slate-200 dark:text-slate-700 font-light text-lg">/</span>
          <button 
            onClick={() => setMode('LEDGER')}
            className={`transition-all duration-300 hover:text-slate-900 dark:hover:text-white ${mode === 'LEDGER' ? 'text-slate-900 dark:text-white scale-105 underline decoration-blue-500 decoration-2 underline-offset-8' : 'text-slate-400'}`}
          >
            Ledger
          </button>
      </nav>

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
