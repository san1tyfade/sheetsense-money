import React, { useState, memo } from 'react';
import { Trade } from '../../types';
import { TradeGroup } from '../../services/trades/tradeService';
import { ChevronRight, Archive, Terminal } from 'lucide-react';
import { TradeHistoryTable } from './TradeHistoryTable';
import { SelectionManager } from '../../hooks/useSelection';

interface TradeAssetAccordionProps {
    group: TradeGroup;
    isLoading: boolean;
    onDelete?: (t: Trade) => Promise<void>;
    onEdit: (t: Trade) => void;
    isReadOnly: boolean;
    selection: SelectionManager<Trade>;
}

export const TradeAssetAccordion: React.FC<TradeAssetAccordionProps> = memo(({ 
    group, isLoading, onDelete, onEdit, isReadOnly, selection 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { ticker, trades, stats } = group;

    return (
        <div className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-500 hover:border-blue-500/30 backdrop-blur-xl ${stats.isExited ? 'opacity-60' : ''}`}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex flex-col lg:flex-row lg:items-center justify-between p-8 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left gap-8"
            >
                <div className="flex items-center gap-8 flex-1">
                    <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700 shadow-inner transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-[0.2em] uppercase leading-none">{ticker}</h3>
                            {stats.isExited && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-300 dark:border-slate-600">
                                    <Archive size={10} /> Exited
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                           <Terminal size={10} /> {trades.length} Historical Node Interactions
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-10 lg:gap-16 items-center tabular-nums">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Position</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white text-base leading-none ghost-blur">{stats.netQty.toLocaleString()} <span className="text-[10px] text-slate-400 opacity-60">U</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Entry Basis</p>
                        <p className="font-mono font-black text-slate-900 dark:text-white text-base leading-none ghost-blur">${stats.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-950/20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <TradeHistoryTable 
                        trades={trades} 
                        isLoading={isLoading} 
                        onDelete={onDelete} 
                        onEdit={onEdit} 
                        isReadOnly={isReadOnly} 
                        compact={true}
                        selection={selection}
                    />
                </div>
            )}
        </div>
    );
});
