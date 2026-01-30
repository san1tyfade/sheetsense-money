import React, { useEffect, useState } from 'react';
import { X, ChevronUp, ChevronDown, Zap, Target, TrendingUp, Info } from 'lucide-react';
import { CockpitBaseline, CockpitMutationState } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';

interface TacticalBottomSheetProps {
  isOpen: boolean;
  nodeId: string | null;
  onClose: () => void;
  mutation: CockpitMutationState;
  onMutationChange: (m: CockpitMutationState) => void;
  baseline: CockpitBaseline;
}

export const TacticalBottomSheet: React.FC<TacticalBottomSheetProps> = ({
  isOpen, nodeId, onClose, mutation, onMutationChange, baseline
}) => {
  if (!isOpen || !nodeId) return null;

  const nodeLabel = nodeId === 'income_root' ? 'Gross Income' 
                  : nodeId === 'savings' ? 'Aggregate Spending' 
                  : nodeId === 'invested' ? 'Reinvestment Ratio'
                  : nodeId.replace('exp-', '');

  const getMultiplier = () => {
      if (nodeId === 'income_root') return mutation.globalIncomeMultiplier;
      if (nodeId === 'savings') return mutation.globalExpenseMultiplier;
      if (nodeId === 'invested') return mutation.investmentRate;
      return mutation.expenseMultipliers[nodeId.replace('exp-', '')] ?? 1.0;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      updateValue(val);
  };

  const updateValue = (newVal: number) => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(5);
    
    if (nodeId === 'income_root') {
        onMutationChange({ ...mutation, globalIncomeMultiplier: newVal });
    } else if (nodeId === 'savings') {
        onMutationChange({ ...mutation, globalExpenseMultiplier: newVal });
    } else if (nodeId === 'invested') {
        onMutationChange({ ...mutation, investmentRate: Math.min(1, Math.max(0, newVal)) });
    } else {
        const cat = nodeId.replace('exp-', '');
        onMutationChange({ ...mutation, expenseMultipliers: { ...mutation.expenseMultipliers, [cat]: newVal } });
    }
  };

  const currentMultiplier = getMultiplier();
  const step = nodeId === 'invested' ? 0.01 : 0.05;
  const min = nodeId === 'invested' ? 0 : 0.5;
  const max = nodeId === 'invested' ? 1 : 3.0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-8 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-full duration-500">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />
          
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 tracking-[0.2em]">
                    <Zap size={12} className="fill-current" /> Tactical Override
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {nodeLabel}
                </h3>
            </div>
            <button 
                onClick={onClose} 
                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-rose-500 transition-all active:scale-90"
            >
                <X size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="space-y-10">
              <div className="flex flex-col items-center justify-center p-10 bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Strategic Scalar</span>
                  <div className="flex items-center gap-8">
                      <button 
                        onClick={() => updateValue(currentMultiplier - step)}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-slate-400 active:bg-blue-500 active:text-white transition-all"
                      >
                        <ChevronDown size={28} strokeWidth={3} />
                      </button>
                      <div className="text-center min-w-[120px]">
                          <span className={`text-4xl font-black font-mono tracking-tighter ${currentMultiplier !== 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300'}`}>
                              {(currentMultiplier * 100).toFixed(0)}%
                          </span>
                      </div>
                      <button 
                        onClick={() => updateValue(currentMultiplier + step)}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-slate-400 active:bg-blue-500 active:text-white transition-all"
                      >
                        <ChevronUp size={28} strokeWidth={3} />
                      </button>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex justify-between px-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Nominal</span>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Aggressive</span>
                  </div>
                  <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    step={step} 
                    value={currentMultiplier} 
                    onChange={handleSliderChange}
                    className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-inner border border-slate-200 dark:border-slate-700" 
                  />
              </div>

              <div className="flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
                      <Target size={20} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulation Impact</p>
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-bold mt-1">
                          Adjustment detected. Net Wealth trajectory recalculated in local logic buffer.
                      </p>
                  </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all"
              >
                Apply Scenario
              </button>
          </div>
      </div>
    </div>
  );
};
