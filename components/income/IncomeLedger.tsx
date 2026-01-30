
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LedgerData } from '../../types';
// Added missing Lock and RefreshCw imports to resolve component errors
import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight, FileX, History, LogOut, Terminal, Layers, Eye, EyeOff, Save, Lock, RefreshCw } from 'lucide-react';
import { PrivacyValue } from '../core-ui/PrivacyValue';

interface IncomeLedgerProps {
  expenseData: LedgerData;
  incomeData: LedgerData;
  isLoading: boolean;
  isReadOnly?: boolean;
  selectedYear?: number;
  activeYear?: number;
  onYearChange?: (year: number) => void;
  onUpdateExpense: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
  onUpdateIncome: (category: string, subCategory: string, monthIndex: number, newValue: number) => Promise<void>;
}

const EditableCell = ({ value, onSave, isReadOnly = false }: { value: number, onSave: (v: number) => Promise<void>, isReadOnly?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value.toString());
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            await save();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(value.toString());
        }
    };

    const save = async () => {
        const num = parseFloat(tempValue);
        if (isNaN(num)) {
            setTempValue(value.toString());
            setIsEditing(false);
            return;
        }

        if (num === value) {
            setIsEditing(false);
            return;
        }

        setStatus('saving');
        setIsEditing(false);
        try {
            await onSave(num);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e) {
            setStatus('error');
            setTempValue(value.toString());
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    if (isEditing && !isReadOnly) {
        return (
            <input
                ref={inputRef}
                type="text" 
                inputMode="decimal"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                className={`w-full h-full text-right px-4 py-3 bg-blue-500/10 outline-none border-2 border-blue-500 rounded-lg font-mono text-sm shadow-inner text-slate-900 dark:text-white`}
            />
        );
    }

    return (
        <div 
            onClick={() => !isReadOnly && setIsEditing(true)}
            className={`w-full h-full px-4 py-4 text-right transition-colors relative group font-mono text-sm ${
                isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-blue-500/5'
            } ${value === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-slate-200'}`}
        >
            <PrivacyValue value={value} format="number" />
            
            {status === 'saving' && <Loader2 size={10} className="absolute top-1 right-1 animate-spin text-blue-500" />}
            {status === 'success' && <Check size={10} className="absolute top-1 right-1 text-emerald-500 shadow-[0_0_5px_currentColor]" />}
            {status === 'error' && <AlertCircle size={10} className="absolute top-1 right-1 text-rose-500 shadow-[0_0_5px_currentColor]" />}
            
            {!isReadOnly && <div className="absolute inset-0 border border-transparent group-hover:border-blue-500/20 pointer-events-none transition-colors" />}
        </div>
    );
};

const LedgerTable = ({ 
    title, 
    data, 
    themeColor, 
    onUpdate, 
    visibleMonthIndex,
    isReadOnly,
    focusMode
}: { 
    title: string, 
    data: LedgerData, 
    themeColor: 'emerald' | 'rose', 
    onUpdate: (c: string, s: string, m: number, v: number) => Promise<void>,
    visibleMonthIndex: number | null,
    isReadOnly: boolean,
    focusMode: boolean
}) => {
    
    const theme = {
        emerald: { 
            header: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
            border: 'border-slate-200 dark:border-slate-800', 
            badge: 'bg-emerald-500' 
        },
        rose: { 
            header: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
            border: 'border-slate-200 dark:border-slate-800', 
            badge: 'bg-rose-500' 
        }
    }[themeColor];

    if (!data || data.categories.length === 0) return null;
    const isMonthView = visibleMonthIndex !== null;
    const currentMonthIdx = useMemo(() => new Date().getMonth(), []);

    const isVisible = (idx: number) => {
        if (isMonthView) return idx === visibleMonthIndex;
        if (!focusMode) return true;
        return idx === currentMonthIdx || idx === currentMonthIdx - 1;
    };

    return (
        <div className="mb-12 last:mb-0">
            <div className="flex items-center justify-between px-2 mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${theme.header} border shadow-inner`}>
                        <Layers size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{title}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Instrument Distribution Matrix</p>
                    </div>
                </div>
            </div>

            <div className={`overflow-hidden rounded-[3rem] border-2 border-slate-950 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-sm`}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-slate-950 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            <tr>
                                <th className="px-10 py-6 sticky left-0 bg-slate-950 z-30 min-w-[240px]">Logical Hierarchy</th>
                                {data.months.map((m, idx) => {
                                    if (!isVisible(idx)) return null;
                                    return (
                                        <th key={idx} className="px-6 py-6 text-right min-w-[120px]">
                                            {m}
                                        </th>
                                    );
                                })}
                                <th className="px-10 py-6 text-right min-w-[140px] bg-slate-900">Aggregate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.categories.map((cat) => (
                                <React.Fragment key={cat.name}>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 group">
                                        <td className="px-10 py-5 sticky left-0 bg-slate-50 dark:bg-slate-850 z-20">
                                            <span className="font-black text-slate-900 dark:text-white tracking-widest text-xs uppercase">{cat.name}</span>
                                        </td>
                                        {data.months.map((_, mIdx) => {
                                            if (!isVisible(mIdx)) return null;
                                            const total = cat.subCategories.reduce((acc, sub) => acc + (sub.monthlyValues[mIdx] || 0), 0);
                                            return (
                                                <td key={mIdx} className="px-6 py-5 text-right font-mono font-black text-xs text-slate-400 dark:text-slate-500">
                                                    {total > 0 ? <PrivacyValue value={total} format="number" /> : '—'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-10 py-5 text-right font-mono font-black text-xs text-slate-900 dark:text-white bg-slate-100/50 dark:bg-slate-800/50">
                                            <PrivacyValue value={cat.total} format="number" />
                                        </td>
                                    </tr>

                                    {cat.subCategories.map((sub) => (
                                        <tr key={`${cat.name}-${sub.name}`} className="hover:bg-blue-500/[0.03] transition-colors group/row tabular-nums">
                                            <td className="pl-14 pr-10 py-0 sticky left-0 bg-white dark:bg-slate-900 group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-850 z-20 border-r border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block py-4 truncate" title={sub.name}>{sub.name}</span>
                                            </td>
                                            {data.months.map((_, mIdx) => {
                                                if (!isVisible(mIdx)) return null;
                                                return (
                                                    <td key={mIdx} className="p-0 border-r border-slate-50 dark:border-slate-800/50 last:border-0 h-full">
                                                        <EditableCell 
                                                            value={sub.monthlyValues[mIdx] || 0} 
                                                            isReadOnly={isReadOnly}
                                                            onSave={(val) => onUpdate(cat.name, sub.name, mIdx, val)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-10 py-0 text-right font-mono font-black text-sm text-slate-400 dark:text-slate-500 bg-slate-50/20 dark:bg-slate-900/20 border-l border-slate-100 dark:border-slate-800">
                                                <div className="py-4">
                                                    <PrivacyValue value={sub.total} format="number" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const IncomeLedger: React.FC<IncomeLedgerProps> = ({ expenseData, incomeData, isLoading, isReadOnly = false, selectedYear = new Date().getFullYear(), activeYear, onYearChange, onUpdateExpense, onUpdateIncome }) => {
    const [focusedMonthIndex, setFocusedMonthIndex] = useState<number>(0);
    const [isMobile, setIsMobile] = useState(false);
    const [focusMode, setFocusMode] = useState(true);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const months = incomeData.months.length > 0 ? incomeData.months : expenseData.months;
    
    useEffect(() => {
        if (months.length > 0) setFocusedMonthIndex(months.length - 1);
    }, [months.length]);

    if (!(incomeData?.categories.length > 0 || expenseData?.categories.length > 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900/10 mx-2">
                <FileX size={64} className="opacity-10 mb-8" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.4em]">Empty Ledger</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">Synchronize with infrastructure to populate matrix</p>
            </div>
        );
    }

    const nextMonth = () => setFocusedMonthIndex(prev => Math.min(prev + 1, months.length - 1));
    const prevMonth = () => setFocusedMonthIndex(prev => Math.max(prev - 1, 0));

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] animate-fade-in relative">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 px-2 gap-6">
                {isMobile ? (
                    <div className="w-full flex items-center justify-between">
                        <button onClick={prevMonth} disabled={focusedMonthIndex === 0} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl disabled:opacity-30 active:scale-90 transition-all"><ChevronLeft size={24} /></button>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Observation Window</p>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{months[focusedMonthIndex]}</h4>
                        </div>
                        <button onClick={nextMonth} disabled={focusedMonthIndex === months.length - 1} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl disabled:opacity-30 active:scale-90 transition-all"><ChevronRight size={24} /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setFocusMode(!focusMode)}
                            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${focusMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {focusMode ? <Eye size={14} /> : <EyeOff size={14} />}
                            {focusMode ? 'Tactical Focus Active' : 'Full Spectrum View'}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20 custom-scrollbar px-2">
                <LedgerTable title="Primary Income Matrix" data={incomeData} themeColor="emerald" isReadOnly={isReadOnly} onUpdate={onUpdateIncome} visibleMonthIndex={isMobile ? focusedMonthIndex : null} focusMode={focusMode} />
                <LedgerTable title="Operating Expense Matrix" data={expenseData} themeColor="rose" isReadOnly={isReadOnly} onUpdate={onUpdateExpense} visibleMonthIndex={isMobile ? focusedMonthIndex : null} focusMode={focusMode} />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 z-40 rounded-b-[3rem]">
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                    {isReadOnly ? (
                        <button 
                            onClick={() => activeYear && onYearChange?.(activeYear)}
                            className="flex items-center gap-3 text-amber-500 font-black tracking-[0.2em] group hover:text-amber-600 transition-colors uppercase text-[10px]"
                        >
                            <Lock size={14} className="group-hover:hidden" />
                            <LogOut size={14} className="hidden group-hover:block rotate-180" />
                            Archive View — <span className="underline decoration-amber-500/30 underline-offset-4">Reset to Live</span>
                        </button>
                    ) : (
                        <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                           <Save size={12} className="text-blue-500" /> Real-time Cloud Synchronization Active
                        </span>
                    )}
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 opacity-40"><History size={12} /> FY {selectedYear} Protocol</span>
                </div>
                {isLoading && (
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 animate-pulse shadow-sm">
                        <RefreshCw size={12} className="animate-spin text-blue-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Transmitting</span>
                    </div>
                )}
            </div>
        </div>
    );
};
