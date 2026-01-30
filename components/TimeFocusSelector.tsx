
import React from 'react';
import { TimeFocus, CustomDateRange } from '../types';
import { Calendar } from 'lucide-react';

interface TimeFocusSelectorProps {
    current: TimeFocus;
    onChange: (focus: TimeFocus) => void;
    customRange?: CustomDateRange;
    onCustomRangeChange?: (range: CustomDateRange) => void;
    disabled?: boolean;
}

export const TimeFocusSelector: React.FC<TimeFocusSelectorProps> = ({ 
    current, onChange, customRange, onCustomRangeChange, disabled 
}) => {
    const options = [
        { id: TimeFocus.MTD, label: 'MTD' },
        { id: TimeFocus.QTD, label: 'QTD' },
        { id: TimeFocus.YTD, label: 'YTD' },
        { id: TimeFocus.ROLLING_12M, label: '12M' },
        { id: TimeFocus.FULL_YEAR, label: 'ALL' },
        { id: TimeFocus.CUSTOM, label: 'CUSTOM' },
    ];

    return (
        <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className={`overflow-x-auto no-scrollbar scroll-smooth flex ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl md:rounded-2xl border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap gap-1 shadow-inner">
                    {options.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 snap-center ${
                                current === opt.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {current === TimeFocus.CUSTOM && customRange && onCustomRangeChange && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-top-1 duration-300 self-center md:self-start">
                    <div className="flex items-center gap-2 px-2 text-slate-400">
                        <Calendar size={14} />
                    </div>
                    <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
                        className="bg-transparent text-[10px] font-bold outline-none text-slate-600 dark:text-slate-300"
                    />
                    <span className="text-[10px] font-black text-slate-300 uppercase">to</span>
                    <input 
                        type="date" 
                        value={customRange.end}
                        onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
                        className="bg-transparent text-[10px] font-bold outline-none text-slate-600 dark:text-slate-300"
                    />
                </div>
            )}
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
