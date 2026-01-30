
import React from 'react';
import { useFinancialStore } from '../../context/FinancialContext';
import { DensityMode } from '../../types';

interface InstitutionalTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Registry Table Container
 * Standardizes the 3rem rounded borders and heavy dark header styling.
 * Now reacts to DensityMode for industrial scaling.
 */
export const InstitutionalTable: React.FC<InstitutionalTableProps> = ({ children, className = "" }) => {
  const { densityMode } = useFinancialStore();
  const isCompact = densityMode === DensityMode.COMPACT;

  return (
    <div className={`overflow-hidden transition-all duration-500 ${
        isCompact ? 'rounded-[1.5rem] border' : 'rounded-[2.5rem] md:rounded-[3rem] border-2 shadow-2xl'
    } border-slate-950 dark:border-slate-800 bg-white dark:bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-full">
          {children}
        </table>
      </div>
    </div>
  );
};

export const InstitutionalTableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { densityMode } = useFinancialStore();
  const isCompact = densityMode === DensityMode.COMPACT;
  
  return (
    <thead className={`bg-slate-950 dark:bg-slate-950 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ${
        isCompact ? 'border-b border-slate-800' : ''
    }`}>
      {children}
    </thead>
  );
};

export const InstitutionalTableBody: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <tbody className={`divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/10 ${className}`}>
    {children}
  </tbody>
);
