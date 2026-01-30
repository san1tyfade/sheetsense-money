import React, { memo, useRef } from 'react';
import { TrendingUp, TrendingDown, Terminal, Lock } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';
import { PrivacyValue } from './PrivacyValue';
import { haptics } from '../../services/infrastructure/HapticService';

export type StatVariant = 'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'indigo';

interface InstitutionalStatCardProps {
    title: string;
    value: number | string;
    icon: any;
    variant?: StatVariant;
    isLoading?: boolean;
    change?: number | null;
    subValue?: string;
    isHistorical?: boolean;
    isCurrency?: boolean;
    precision?: number;
    onClick?: () => void;
}

/**
 * InstitutionalStatCard
 * Unitary authority for high-level metrics. Consolidates haptics, 
 * visual trends, and Ghost Mode compliance.
 */
export const InstitutionalStatCard = memo(({ 
    title, value, icon: Icon, variant = 'blue', isLoading, change, subValue, isHistorical, isCurrency = true, precision = 0, onClick 
}: InstitutionalStatCardProps) => {
    const { sync, densityMode } = useFinancialStore();
    const isCompact = densityMode === 'COMPACT';
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleInteractionStart = () => {
        if (onClick) {
            haptics.click('soft');
        } else {
            // Secret haptic sync shortcut
            timerRef.current = setTimeout(() => {
                haptics.pulse('light');
                sync();
            }, 600);
        }
    };

    const handleInteractionEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const themes: Record<StatVariant, { bg: string, text: string, glow: string, border: string, bar: string }> = {
        blue: { bg: 'bg-blue-600/10', text: 'text-blue-600 dark:text-blue-400', glow: 'bg-blue-600/10', border: 'hover:border-blue-600/40', bar: 'bg-blue-500' },
        emerald: { bg: 'bg-emerald-600/10', text: 'text-emerald-600 dark:text-emerald-400', glow: 'bg-emerald-600/10', border: 'hover:border-emerald-600/40', bar: 'bg-emerald-500' },
        purple: { bg: 'bg-purple-600/10', text: 'text-purple-600 dark:text-purple-400', glow: 'bg-purple-600/10', border: 'hover:border-purple-600/40', bar: 'bg-purple-500' },
        rose: { bg: 'bg-rose-600/10', text: 'text-rose-600 dark:text-rose-400', glow: 'bg-rose-600/10', border: 'hover:border-rose-600/40', bar: 'bg-rose-500' },
        amber: { bg: 'bg-amber-600/10', text: 'text-amber-600 dark:text-amber-400', glow: 'bg-amber-600/10', border: 'hover:border-amber-600/40', bar: 'bg-amber-500' },
        indigo: { bg: 'bg-indigo-600/10', text: 'text-indigo-600 dark:text-indigo-400', glow: 'bg-indigo-600/10', border: 'hover:border-indigo-600/40', bar: 'bg-indigo-500' }
    };

    const theme = themes[variant];
    const isPositive = change !== undefined && change !== null && change > 0;
    const isNegative = change !== undefined && change !== null && change < 0;

    return (
        <div 
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onClick={onClick}
            className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl relative overflow-hidden group ${theme.border} transition-all duration-500 shadow-sm hover:shadow-2xl select-none ss-card ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className={`absolute -top-20 -right-20 w-64 h-64 ${theme.glow} rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000`}></div>
            
            {isHistorical && (
                <div className="absolute top-4 right-4 opacity-10">
                    <Lock size={isCompact ? 24 : 32} className="text-slate-400" />
                </div>
            )}

            <div className="flex flex-col h-full justify-between relative z-10" style={{ gap: 'var(--ss-gap)' }}>
                <div className={isCompact ? 'space-y-4' : 'space-y-6'}>
                    <div className="flex justify-between items-start">
                        <div className={`${isCompact ? 'p-3' : 'p-4'} ${theme.bg} rounded-2xl ${theme.text} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                            <Icon size={isCompact ? 22 : 28} />
                        </div>
                        {change !== undefined && change !== null && !isLoading && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 font-mono font-black text-[9px] md:text-[10px] tracking-tighter ${isPositive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : isNegative ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : null}
                                {isPositive ? '+' : ''}{change.toFixed(1)}%
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.3em] text-slate-400`}>{title}</p>
                        <h3 className={`${isCompact ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'} font-black text-slate-900 dark:text-white tracking-tighter leading-none`}>
                            {isLoading ? (
                                <div className="h-10 w-48 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                            ) : (
                                <PrivacyValue 
                                    value={value} 
                                    format={isCurrency ? 'currency' : 'number'} 
                                    precision={precision} 
                                />
                            )}
                        </h3>
                        {subValue && (
                            <p className="text-[9px] font-black uppercase text-slate-400 mt-2 opacity-60 tracking-widest">{subValue}</p>
                        )}
                    </div>
                </div>

                {!isCompact && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                            <Terminal size={10} /> Node Intelligence
                        </span>
                        {isHistorical && <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">Archive Context</span>}
                    </div>
                )}
            </div>
        </div>
    );
});