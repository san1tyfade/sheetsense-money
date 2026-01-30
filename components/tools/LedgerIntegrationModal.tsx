
import React, { useState, useMemo, useEffect } from 'react';
import { X, GitMerge, Check, AlertCircle, ArrowRight, Settings2, Database, ArrowUpRight, RefreshCw } from 'lucide-react';
import { LedgerData, Transaction, WriteStrategy, ViewState } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { detectTargetMonth, suggestLedgerCategory } from '../../services/tools/integrationService';
import { getIntegrationMappings, saveIntegrationMapping } from '../../services/tools/toolMemoryService';

interface LedgerIntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    ledgerData?: LedgerData;
    onCommit: (monthIndex: number, strategy: WriteStrategy, updates: any[]) => Promise<void>;
    onNavigate?: (view: ViewState) => void;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const LedgerIntegrationModal: React.FC<LedgerIntegrationModalProps> = ({
    isOpen, onClose, transactions, ledgerData, onCommit, onNavigate
}) => {
    const [targetMonth, setTargetMonth] = useState(0);
    const [strategy, setStrategy] = useState<WriteStrategy>('MERGE');
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const makeKey = (cat: string, sub: string) => `${cat.trim()}|${sub.trim()}`;

    const allCategoryOptions = useMemo(() => {
        if (!ledgerData || !ledgerData.categories) return [];
        const list: { category: string, subCategory: string, key: string, label: string }[] = [];
        ledgerData.categories.forEach(cat => {
            cat.subCategories.forEach(sub => {
                list.push({ 
                    category: cat.name, 
                    subCategory: sub.name,
                    key: makeKey(cat.name, sub.name),
                    label: `${cat.name} › ${sub.name}`
                });
            });
        });
        return list.sort((a, b) => a.label.localeCompare(b.label));
    }, [ledgerData]);

    // Group by Sub-category for granular integration mapping
    const statementSubCategories = useMemo(() => {
        const subs = new Set<string>();
        transactions.forEach(tx => {
            // Prefer subCategory from AI/Parser, fallback to category
            const sub = tx.subCategory || tx.category || 'Uncategorized';
            subs.add(sub);
        });
        return Array.from(subs).sort((a, b) => {
            if (a === 'Uncategorized') return -1;
            if (b === 'Uncategorized') return 1;
            return a.localeCompare(b);
        });
    }, [transactions]);

    useEffect(() => {
        if (!isOpen || allCategoryOptions.length === 0) return;

        const init = async () => {
            setTargetMonth(detectTargetMonth(transactions));
            
            const memory = await getIntegrationMappings();
            const initialMappings: Record<string, string> = {};
            const allLedgerNames = allCategoryOptions.map(o => o.subCategory);

            statementSubCategories.forEach(sSub => {
                const rememberedKey = memory[sSub.toUpperCase()];
                if (rememberedKey && allCategoryOptions.some(o => o.key === rememberedKey)) {
                    initialMappings[sSub] = rememberedKey;
                } else {
                    const suggestion = suggestLedgerCategory(sSub, allLedgerNames, memory);
                    const match = allCategoryOptions.find(o => o.subCategory === suggestion);
                    initialMappings[sSub] = match ? match.key : 'Uncategorized';
                }
            });
            setMappings(initialMappings);
        };
        init();
    }, [isOpen, transactions, statementSubCategories, allCategoryOptions]);

    const handleCommit = async () => {
        if (allCategoryOptions.length === 0) {
            setError("Ledger structure not found. Please sync your data in the Dashboard first.");
            return;
        }

        setIsProcessing(true);
        setProcessingStep('Validating identity matrix...');
        setError(null);
        try {
            const updatesMap = new Map<string, { category: string, subCategory: string, total: number }>();
            
            transactions.forEach(tx => {
                const txSub = tx.subCategory || tx.category || 'Uncategorized';
                const mappedKey = mappings[txSub];
                
                if (!mappedKey || mappedKey === 'Uncategorized') return;

                const ledgerMatch = allCategoryOptions.find(o => o.key === mappedKey);
                if (!ledgerMatch) return;

                const storeKey = ledgerMatch.key;
                const existing = updatesMap.get(storeKey) || { 
                    category: ledgerMatch.category, 
                    subCategory: ledgerMatch.subCategory, 
                    total: 0 
                };
                existing.total += Math.abs(tx.amount);
                updatesMap.set(storeKey, existing);
            });

            const updates = Array.from(updatesMap.values()).map(u => ({
                ledgerCategory: u.category,
                ledgerSubCategory: u.subCategory,
                value: u.total
            }));

            if (updates.length === 0) {
                throw new Error("No transactions were mapped to valid ledger cells.");
            }

            setProcessingStep('Transmitting batch updates...');
            await onCommit(targetMonth, strategy, updates);
            
            for (const [sSub, lKey] of Object.entries(mappings) as [string, string][]) {
                if (lKey !== 'Uncategorized') {
                    await saveIntegrationMapping(sSub, lKey);
                }
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to commit integration.");
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    if (!isOpen) return null;

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-10">
                    <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75 duration-500">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sync Complete</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Your {MONTHS[targetMonth]} statement has been integrated into the master ledger.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => { if(onNavigate) onNavigate(ViewState.INCOME); onClose(); }} 
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            <ArrowUpRight size={18} /> View Ledger
                        </button>
                        <button onClick={onClose} className="w-full py-5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const totalImpact = transactions.reduce((s, t) => {
        const sub = t.subCategory || t.category || 'Uncategorized';
        return s + (mappings[sub] && mappings[sub] !== 'Uncategorized' ? Math.abs(t.amount) : 0);
    }, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                            <GitMerge size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Integrate with Ledger</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Flow Synchronization Matrix</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={28} /></button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-b border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <ArrowRight size={12} className="text-blue-500" /> Target Period
                        </label>
                        <select 
                            value={targetMonth} 
                            onChange={e => setTargetMonth(parseInt(e.target.value))}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 appearance-none text-slate-900 dark:text-slate-100 shadow-inner cursor-pointer"
                        >
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Settings2 size={12} className="text-indigo-500" /> Write Strategy
                        </label>
                        <div className="flex bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-inner">
                            <button 
                                onClick={() => setStrategy('MERGE')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${strategy === 'MERGE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Add to Existing
                            </button>
                            <button 
                                onClick={() => setStrategy('OVERWRITE')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${strategy === 'OVERWRITE' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Overwrite Cell
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <Database size={16} className="text-slate-400" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity Mapping Matrix</h4>
                    </div>
                    
                    <div className="space-y-3">
                        {statementSubCategories.map(sSub => {
                            const mappedKey = mappings[sSub] || 'Uncategorized';
                            const isUnmapped = mappedKey === 'Uncategorized';
                            return (
                                <div key={sSub} className={`flex flex-col md:flex-row items-center gap-4 p-5 rounded-2xl border group transition-all ${isUnmapped ? 'bg-amber-500/[0.03] border-amber-200 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-blue-400/30'}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            Statement Identity
                                            {isUnmapped && <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">NOT MAPPED</span>}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{sSub}</p>
                                    </div>
                                    <div className="hidden md:block text-slate-300 dark:text-slate-700">
                                        <ArrowRight size={20} />
                                    </div>
                                    <div className="w-full md:w-80">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ledger Destination</p>
                                        <select 
                                            value={mappedKey}
                                            onChange={e => setMappings(prev => ({ ...prev, [sSub]: e.target.value }))}
                                            className={`w-full border-2 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 transition-all cursor-pointer ${isUnmapped ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <option value="Uncategorized">Do Not Import</option>
                                            {allCategoryOptions.map(opt => (
                                                <option key={opt.key} value={opt.key}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-6">
                    {isProcessing && (
                        <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-pulse">
                            <RefreshCw size={20} className="text-blue-500 animate-spin" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Commit In Progress</p>
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{processingStep}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold animate-in slide-in-from-bottom-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                    
                    {!isProcessing && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                            <div className="flex-1 w-full sm:w-auto">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Inbound Impact</p>
                                <p className={`text-2xl font-black font-mono ${totalImpact > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                                    {formatBaseCurrency(totalImpact)}
                                </p>
                            </div>
                            <button 
                                onClick={handleCommit}
                                disabled={isProcessing || totalImpact === 0}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white px-12 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                <Database size={18} />
                                Commit to Ledger
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
