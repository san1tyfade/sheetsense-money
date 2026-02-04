import React, { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, Sparkles, FileText, Trash2, GitMerge, Terminal, BookOpen, ChevronDown, Cpu, Zap, Radio, Box, X, ChevronRight, Store, LayoutDashboard, ListFilter, Activity, CheckCircle2, ArrowRight } from 'lucide-react';
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
import { PrivacyValue } from '../core-ui/PrivacyValue';

interface StatementProcessorProps {
  detailedExpenses?: LedgerData;
  onNavigate?: (view: ViewState) => void;
  onRefresh?: () => void;
}

type SubView = 'SUMMARY' | 'REFINERY';

export const StatementProcessor: React.FC<StatementProcessorProps> = ({ detailedExpenses, onNavigate, onRefresh }) => {
  const store = useFinancialStore();
  const crud = useFinancialActions();
  const { 
    statementResults: results, setStatementResults: setResults, 
    statementBalance, setStatementBalance, 
    statementFormat, setStatementFormat,
    aiModelPreference, setAiModelPreference
  } = store;

  const [activeSubView, setActiveSubView] = useState<SubView>('SUMMARY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isJournalizing, setIsJournalizing] = useState(false);
  const [isIntegrateModalOpen, setIsIntegrateModalOpen] = useState(false);
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
        setActiveSubView('SUMMARY');
    } catch (err: any) {
        alert("Parser Error: " + err.message);
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
      alert(err.message);
    } finally {
      setIsJournalizing(false);
    }
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
    { id: 'gemini-3-flash-preview', label: 'FLASH' },
    { id: 'gemini-flash-lite-latest', label: 'LITE' },
    { id: 'gemini-3-pro-preview', label: 'PRO' }
  ];

  if (!results.length) {
    return (
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
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Unified Dark Control Strip */}
      <div className="sticky top-0 z-[60] py-4 transition-all duration-500">
          <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-2 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-[1.5rem] w-full lg:w-auto">
                  <button 
                    onClick={() => { haptics.click('soft'); setActiveSubView('SUMMARY'); }}
                    className={`flex items-center justify-center gap-2 flex-1 lg:flex-none lg:min-w-[140px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'SUMMARY' ? 'bg-slate-800 text-blue-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <LayoutDashboard size={14} /> Diagnostic
                  </button>
                  <button 
                    onClick={() => { haptics.click('soft'); setActiveSubView('REFINERY'); }}
                    className={`flex items-center justify-center gap-2 flex-1 lg:flex-none lg:min-w-[140px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'REFINERY' ? 'bg-slate-800 text-blue-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <ListFilter size={14} /> Refinery
                  </button>
              </div>

              <div className="flex items-center gap-4 w-full lg:w-auto px-4 lg:px-2">
                  <div className="hidden xl:flex items-center gap-2 opacity-40">
                      <Terminal size={12} className="text-blue-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Engine</span>
                  </div>

                  <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 flex-1 lg:flex-none">
                      {engines.map(m => (
                          <button 
                            key={m.id}
                            onClick={() => { haptics.click('soft'); setAiModelPreference(m.id); }}
                            className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${aiModelPreference === m.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                          >
                            {m.label}
                          </button>
                      ))}
                  </div>

                  <div className="h-8 w-[1px] bg-slate-800 mx-2 hidden lg:block" />
                  
                  <button 
                      onClick={() => { haptics.click('heavy'); setResults([]); }}
                      className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Purge Buffer"
                  >
                      <Trash2 size={18} />
                  </button>
              </div>
          </div>
      </div>

      {activeSubView === 'SUMMARY' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatementDashboard transactions={results} balance={statementBalance} sourceName={statementFormat} />
              <div className="mt-12 flex justify-center">
                  <button 
                    onClick={() => setActiveSubView('REFINERY')}
                    className="group bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95"
                  >
                    Enter Refinery Protocol
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
              </div>
          </div>
      ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-4">
                  {results.map((tx, idx) => {
                      const currentLabel = allCategoryOptions.find(o => o.category === tx.category && o.subCategory === tx.subCategory)?.label || 'Uncategorized';
                      const isUnmapped = currentLabel === 'Uncategorized';

                      return (
                          <div key={tx.id} className={`flex flex-col lg:flex-row lg:items-center gap-6 p-6 bg-white dark:bg-slate-800/40 border rounded-[2rem] hover:border-blue-500/30 transition-all group relative overflow-hidden ${isUnmapped ? 'border-amber-500/20' : 'border-slate-100 dark:border-slate-800'}`}>
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                      <span className="text-[8px] font-bold text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{tx.date}</span>
                                      {(tx as any).isAiResolved && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-[7px] font-black uppercase border border-blue-500/10"><Zap size={8} fill="currentColor" /> AI Validated</div>}
                                      {isUnmapped && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[7px] font-black uppercase border border-amber-500/10">Awaiting Node</div>}
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{tx.description}</h4>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Source Interaction Record</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-4 shrink-0">
                                  {/* Canonical Identity Field */}
                                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-2xl w-full lg:w-56 focus-within:border-blue-500/50 transition-all shadow-inner">
                                      <Store size={14} className="text-blue-500 shrink-0" />
                                      <input 
                                          type="text"
                                          value={tx.canonicalName || ''}
                                          onChange={(e) => updateCanonicalName(idx, e.target.value)}
                                          onBlur={() => persistIdentityMemory(idx)}
                                          className="bg-transparent text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none w-full placeholder:text-slate-300"
                                          placeholder="BRAND IDENTITY"
                                      />
                                  </div>

                                  {/* Category Selector */}
                                  <div className="relative w-full lg:w-64">
                                      <select 
                                          value={currentLabel}
                                          onChange={e => {
                                              const match = allCategoryOptions.find(opt => opt.label === e.target.value);
                                              setResults(prev => prev.map((t, i) => 
                                                  i === idx ? { ...t, category: match ? match.category : 'Uncategorized', subCategory: match ? match.subCategory : 'Uncategorized' } : t
                                              ));
                                          }}
                                          className={`w-full bg-slate-50 dark:bg-slate-900 border px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white cursor-pointer appearance-none ${isUnmapped ? 'border-amber-300 dark:border-amber-700' : 'border-slate-100 dark:border-slate-800'}`}
                                      >
                                          <option value="Uncategorized">Select Category...</option>
                                          {allCategoryOptions.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                                      </select>
                                      <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>

                                  {/* Amount & Actions */}
                                  <div className="flex items-center justify-between sm:justify-end gap-6 px-2 lg:px-0">
                                      <div className="text-right">
                                          <PrivacyValue value={tx.amount} className="text-xl font-black font-mono tracking-tighter text-slate-900 dark:text-white" />
                                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Drain impact</p>
                                      </div>
                                      <button 
                                          onClick={() => setResults(prev => prev.filter(t => t.id !== tx.id))}
                                          className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-90"
                                      >
                                          <X size={14} strokeWidth={3} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Persistence Controls (Footer Ribbon) */}
      {results.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 md:left-72 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-[70] animate-in slide-in-from-bottom-full duration-500">
              <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-10">
                      <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refinement Velocity</p>
                          <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none font-mono">
                                  {results.filter(t => t.category !== 'Uncategorized').length} <span className="text-sm text-slate-400">/ {results.length}</span>
                              </h3>
                              <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                  <div 
                                      className="h-full bg-blue-600 transition-all duration-1000" 
                                      style={{ width: `${(results.filter(t => t.category !== 'Uncategorized').length / results.length) * 100}%` }}
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="hidden lg:block space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Valuation</p>
                          <PrivacyValue value={results.reduce((s,t) => s + Math.abs(t.amount), 0)} className="text-xl font-black font-mono text-emerald-500" />
                      </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                      <button 
                          onClick={handleJournalize} 
                          disabled={isJournalizing}
                          className="flex-1 sm:flex-none px-10 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl"
                      >
                          {isJournalizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                          Archival
                      </button>
                      <button 
                          onClick={() => setIsIntegrateModalOpen(true)}
                          className="flex-1 sm:flex-none px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/30"
                      >
                          <GitMerge size={18} />
                          Finalize
                      </button>
                  </div>
              </div>
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