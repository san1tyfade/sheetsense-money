
import React from 'react';
import { Loader2, Radio } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';
import { DensityMode } from '../../types';

interface PerspectiveHeaderProps {
    title: string;
    titleAccent?: string;
    count?: number;
    countLabel?: string;
    slots?: {
        discovery?: React.ReactNode;
        context?: React.ReactNode;
        actions?: React.ReactNode;
        filters?: React.ReactNode;
    };
    showStatus?: boolean;
    // added hideTitle prop to support nested sub-views
    hideTitle?: boolean;
}

export const PerspectiveHeader: React.FC<PerspectiveHeaderProps> = ({
    title, titleAccent, count, countLabel = "Nodes", slots, showStatus = true, hideTitle = false
}) => {
    const { isSyncing, isFetchingPrices, densityMode } = useFinancialStore();
    const isCompact = densityMode === DensityMode.COMPACT;

    return (
        <div className={`space-y-6 md:space-y-10 ${isCompact ? 'mb-2' : 'mb-6'} relative z-[45]`}>
            {/* Level 1: Identity & Contextual Signal */}
            {/* conditional rendering added to support hideTitle flag */}
            {!hideTitle && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                        <div className="space-y-1">
                            <h2 className={`${isCompact ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase`}>
                                {title} {titleAccent && <span className="text-blue-600 dark:text-blue-400">{titleAccent}</span>}
                            </h2>
                        </div>
                        
                        <div className="flex items-center gap-5">
                            {count !== undefined && (
                                <div className={`${isCompact ? 'w-14 h-14' : 'w-20 h-20 sm:w-24 sm:h-24'} bg-slate-950 dark:bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center shrink-0 group transition-all relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors rounded-[inherit]"></div>
                                    <span className={`${isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'} font-black text-white tracking-tighter relative z-10`}>{count}</span>
                                    <span className={`${isCompact ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'} font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1`}>{countLabel}</span>
                                </div>
                            )}
                            {slots?.actions}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {slots?.context}
                        {showStatus && (isSyncing || isFetchingPrices) && (
                            <div className="flex items-center gap-3">
                                {isSyncing ? (
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-sm animate-in fade-in">
                                        <Loader2 className="animate-spin text-blue-600" size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Transmission</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm animate-in fade-in">
                                        <Radio className="animate-pulse text-emerald-500" size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Live Feed</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Level 2: Discovery Layer (Injected Slot) */}
            {slots?.discovery && (
                <div className={`${isCompact ? 'p-2 md:p-3 rounded-[1.5rem]' : 'p-2 md:p-6 rounded-[2rem] md:rounded-[3rem]'} bg-white/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/50 backdrop-blur-md shadow-xl relative z-40`}>
                    {slots.discovery}
                </div>
            )}
        </div>
    );
};
