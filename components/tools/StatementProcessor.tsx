
import React, { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, Sparkles, FileText, Trash2, GitMerge, Terminal, BookOpen, ChevronDown, Cpu, Zap, Radio, Box, X, ChevronRight, Store } from 'lucide-react';
import { parsePdfStatement } from '../../services/tools/pdfParser';
import { Transaction, LedgerData, WriteStrategy, ViewState } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { StatementDashboard } from './StatementDashboard';
import { LedgerIntegrationModal } from './LedgerIntegrationModal';
import { useFinancialStore } from '../../context/FinancialContext';
import { useFinancialActions } from '../../hooks/useFinancialActions';
import { intelligentCategorize } from '../../services/infrastructure/IntelligenceProvider';
import { GlassCard } from '../core-ui/GlassCard';
import { saveMerchantIdentity } from '../../services/tools/toolMemoryService';
import { haptics } from '../../services/infrastructure/HapticService';

interface StatementProcessorProps {
  detailedExpenses?: LedgerData;
  onNavigate?: (view: ViewState) => void;
  onRefresh?: () => void;
}

export const StatementProcessor: React.FC<StatementProcessorProps> = ({ detailedExpenses, onNavigate, onRefresh }) => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { 
    statementResults: results, setStatementResults: setResults, 
    statementBalance, setStatementBalance, 
    statementFormat, setStatementFormat,
    aiModelPreference, setAiModelPreference
  } = store;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isJournalizing, setIsJournalizing] = useState(false);
  const [isIntegrateModalOpen, setIsIntegrateModalOpen] = useState(false);
  const [isEngineMenuExpanded, setIsEngineMenuExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCategoryOptions = useMemo(() => {
    if (!detailedExpenses) return [];
    const list: { category: string; subCategory: string; label: string }[] = [];
    detailedExpenses.categories.forEach(cat => {
        cat.subCategories.forEach(sub => {
            list.push({
                category: cat.name,
                subCategory: sub.name,
                label: `${cat.name} › ${sub.name}`
            });
        });
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [detailedExpenses]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
        const data = await parsePdfStatement(file);
        setStatementBalance(data.balance);
        setStatementFormat(data.format.replace(/_/g, ' '));
        
        const labelList = allCategoryOptions.map(opt => opt.label);
        const classified = await intelligentCategorize(data.transactions, labelList, aiModelPreference);
        
        const enriched = classified.map(tx => {
            const match = allCategoryOptions.find(opt => opt.label === tx.category || opt.subCategory === tx.category);
            if (match) {
                return { ...tx, category: match.category, subCategory: match.subCategory };
            }
            return { ...tx, subCategory: tx.subCategory || 'Other' };
        });

        setResults(enriched);
    } catch (err: any) {
        alert("Parser Error: " + (err?.message || "Logical buffer overflow or malformed PDF structure."));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleJournalize = async () => {
    if (results.length === 0) return;
    setIsJournalizing(true);
    try {
      await crud.journal.archive(statementFormat || 'Statement Ingest', results);
      setResults([]);
      setStatementFormat(null);
    } catch (err: any) {
      alert(err?.message || "Journal committal failed.");
    } finally {
      setIsJournalizing(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setResults(prev => prev.filter(tx => tx.id !== id));
  };

  const updateCanonicalName = async (idx: number, newName: string) => {
      const tx = results[idx];
      if (!tx) return;
      
      setResults(prev => prev.map((t, i) => i === idx ? { ...t, canonicalName: newName } : t));
  };

  const persistIdentityMemory = async (idx: number) => {
      const tx = results[idx];
      if (!tx || !tx.canonicalName) return;
      
      haptics.click('soft');
      await saveMerchantIdentity(tx.description, tx.canonicalName);
  };

  const engines = [
    { id: 'gemini-3-flash-preview', label: 'Flash' },
    { id: 'gemini-flash-lite-latest', label: 'Lite' },
    { id: 'gemini-3-pro-preview', label: 'Pro' }
  ];

  const activeEngine = engines.find(e => e.id === aiModelPreference) || engines[0];

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="px-2 overflow-x-auto no-scrollbar pb-2">
        <div className="bg-white dark:bg-slate-800/40 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm inline-flex items-center min-w-max gap-1">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-700 h-8 mr-1">
                <Cpu size={14} className="text-blue-500" />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest hidden sm:inline">Engine</span>
            </div>
            
            <div className="flex gap-1 pr-2 border-r border-slate-100 dark:border-slate-700 mr-1">
                {(!results.length || isEngineMenuExpanded) ? (
                    <>
                      {engines.map(m => (
                          <button 
                            key={m.id}
                            onClick={() => {
                              setAiModelPreference(m.id);
                              setIsEngineMenuExpanded(false);
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${aiModelPreference === m.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                          >
                            {m.label}
                          </button>
                      ))}
                    </>
                ) : (
                    <button 
                      onClick={() => setIsEngineMenuExpanded(true)}
                      className="px-4 py-2 bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                    >
                      {activeEngine.label}
                      <ChevronRight size={10} className="opacity-40 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}
            </div>

            {results.length > 0 ? (
                <div className="flex items-center gap-1 pl-1">
                    <button 
                        onClick={handleJournalize} 
                        disabled={isJournalizing}
                        className="px-4 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isJournalizing ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                        Journal
                    </button>
                    <button 
                        onClick={() => setIsIntegrateModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        <GitMerge size={12} />
                        Integrate
                    </button>
                    <button 
                        onClick={() => {
                          setResults([]);
                          setIsEngineMenuExpanded(false);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                        title="Discard Buffer"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ) : (
                <div className="px-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Awaiting Ingestion</span>
                </div>
            )}
        </div>
      </div>

      {!results.length ? (
        <div className="px-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full group relative overflow-hidden"
            >
                <div className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[4rem] p-16 md:p-32 flex flex-col items-center justify-center transition-all group-hover:border-blue-500/50 group-hover:bg-blue-500/[0.02]">
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-8 py-10">
                            <div className="relative">
                                <Loader2 size={64} className="text-blue-500 animate-spin" />
                                <Zap size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Neural Processing Active</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Deconstructing PDF Geometry...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 py-10">
                            <div className="p-8 bg-slate-50 dark:bg-slate-850 rounded-[2.5rem] text-slate-300 dark:text-slate-700 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-700 shadow-inner">
                                <FileText size={72} strokeWidth={1} />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Drop Bank Statement</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Supports AMEX Cobalt & WS Visa</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 w-full max-w-xs flex flex-col items-center gap-4 opacity-40 group-hover:opacity-70 transition-opacity">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                            <Upload size={18} className="text-blue-500" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">PDF Parser & Neural Classifier</p>
                    </div>
                </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-center px-2">
                <div className="flex items-center gap-4 bg-slate-950 p-4 pr-8 rounded-3xl shadow-2xl border border-slate-800">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white"><Box size={20} /></div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Buffer</p>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">{statementFormat}</h4>
                    </div>
                </div>
            </div>

            <StatementDashboard transactions={results} balance={statementBalance} />

            <GlassCard className="mx-2 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            <tr>
                                <th className="px-10 py-6">Timestamp</th>
                                <th className="px-10 py-6">Instrument Identity</th>
                                <th className="px-10 py-6">Canonical Node</th>
                                <th className="px-10 py-6">Logical Category</th>
                                <th className="px-10 py-6 text-right">Drain Potential</th>
                                <th className="px-6 py-6 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/10">
                            {results.map((tx, idx) => {
                                const currentLabel = allCategoryOptions.find(o => o.category === tx.category && o.subCategory === tx.subCategory)?.label || 'Uncategorized';
                                return (
                                    <tr key={tx.id} className="hover:bg-blue-500/[0.02] transition-colors tabular-nums group">
                                        <td className="px-10 py-8 text-xs font-bold text-slate-400 font-mono">{tx.date}</td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-1 min-w-[180px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">{tx.description}</span>
                                                    {(tx as any).isAiResolved && <Zap size={10} className="text-blue-500 animate-pulse" />}
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Source String</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl w-fit min-w-[160px] focus-within:border-blue-500/50 transition-all">
                                                <Store size={12} className="text-blue-500 shrink-0" />
                                                <input 
                                                    type="text"
                                                    value={tx.canonicalName || ''}
                                                    onChange={(e) => updateCanonicalName(idx, e.target.value)}
                                                    onBlur={() => persistIdentityMemory(idx)}
                                                    className="bg-transparent text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none w-full placeholder:text-slate-300"
                                                    placeholder="Set Identity"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <select 
                                                value={currentLabel}
                                                onChange={e => {
                                                    const match = allCategoryOptions.find(opt => opt.label === e.target.value);
                                                    setResults(prev => prev.map((t, i) => 
                                                        i === idx ? { ...t, category: match ? match.category : 'Uncategorized', subCategory: match ? match.subCategory : 'Uncategorized' } : t
                                                    ));
                                                }}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white cursor-pointer w-full max-w-[280px]"
                                            >
                                                <option value="Uncategorized">Uncategorized</option>
                                                {allCategoryOptions.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-10 py-8 text-right font-black font-mono text-lg text-slate-900 dark:text-white ghost-blur">
                                            {formatBaseCurrency(tx.amount)}
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <button 
                                                onClick={() => handleDeleteTransaction(tx.id)}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-90 opacity-0 group-hover:opacity-100"
                                                title="Exclude from Buffer"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
      )}

      <LedgerIntegrationModal 
        isOpen={isIntegrateModalOpen} 
        onClose={() => setIsIntegrateModalOpen(false)} 
        transactions={results} 
        ledgerData={detailedExpenses}
        onCommit={async (m, s, u) => {
            await crud.ledger.batchUpdateExpense({
                monthIndex: m,
                strategy: s,
                updates: u
            });
            if (onRefresh) onRefresh();
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};
