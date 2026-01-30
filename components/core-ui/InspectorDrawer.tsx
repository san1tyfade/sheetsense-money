import React, { useRef, useEffect, useMemo, useState } from 'react';
import { X, ArrowRight, ExternalLink, Terminal, History, Target, Landmark, ShieldCheck, Zap, Activity, Repeat, Plus, Calendar, AlertTriangle, TrendingUp, TrendingDown, BrainCircuit, Sparkles, Clock } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';
import { ViewState, Transaction } from '../../types';
import { PrivacyValue } from './PrivacyValue';
import { aggregateMerchantProfiles, getTransactionAnomaly, MerchantProfile } from '../../services/domain/merchantService';
// Fix: Updated import path for cleanMerchantDescription which was moved to IntelligenceProvider
import { cleanMerchantDescription } from '../../services/infrastructure/IntelligenceProvider';

export const InspectorDrawer: React.FC = () => {
  const { inspector, setInspector, setView, journalEntries, timeline, subscriptions, setGlobalModal } = useFinancialStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setInspector({ ...inspector, isOpen: false });
      }
    };
    if (inspector.isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inspector, setInspector]);

  const handleJumpToLedger = () => {
      setView(ViewState.INCOME);
      setInspector({ ...inspector, isOpen: false });
  };

  const merchantProfiles = useMemo(() => {
    if (!inspector.isOpen || inspector.transactions.length === 0) return [];
    const historyPool = [...journalEntries, ...timeline];
    return aggregateMerchantProfiles(inspector.transactions, historyPool, subscriptions);
  }, [inspector.isOpen, inspector.transactions, journalEntries, timeline, subscriptions]);

  const profileMap = useMemo(() => {
    const map = new Map<string, MerchantProfile>();
    merchantProfiles.forEach(p => map.set(p.identity, p));
    return map;
  }, [merchantProfiles]);

  const handleConvertToSub = (profile: MerchantProfile) => {
    setGlobalModal({
        type: 'SUBSCRIPTION',
        initialData: {
            name: profile.displayName,
            cost: profile.l12mTotal / (profile.l12mCount || 1),
            period: profile.cadence === 'WEEKLY' ? 'Weekly' : 'Monthly',
            category: inspector.title,
            active: true
        }
    });
  };

  const getNextExpectedDate = (lastSeen: string, cadence: string) => {
      const last = new Date(lastSeen);
      const next = new Date(last);
      if (cadence === 'MONTHLY') next.setMonth(last.getMonth() + 1);
      else if (cadence === 'WEEKLY') next.setDate(last.getDate() + 7);
      else return null;
      return next.toISOString().split('T')[0];
  };

  if (!inspector.isOpen) return null;

  const isGroundTruth = inspector.transactions.some(tx => (tx as any).source);

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      <div className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-500 ${inspector.isOpen ? 'opacity-100' : 'opacity-0'}`} />
      
      <div 
        ref={drawerRef}
        className={`absolute top-0 right-0 h-full w-full max-w-xl bg-slate-50 dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 pointer-events-auto transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${inspector.isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Unified Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
                    <Target size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{inspector.title}</h2>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Analytical Deep-Scan</p>
                </div>
            </div>
            <button 
                onClick={() => setInspector({ ...inspector, isOpen: false })}
                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 transition-all active:scale-90 shadow-sm"
            >
                <X size={18} strokeWidth={3} />
            </button>
        </div>

        {/* Dynamic Information Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 pt-4 space-y-8">
                
                {/* Meta Indicator */}
                <div className={`flex items-center gap-4 p-4 rounded-2xl border shadow-inner transition-colors duration-500 ${isGroundTruth ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50'}`}>
                    {isGroundTruth ? (
                        <ShieldCheck size={14} className="text-emerald-500" />
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isGroundTruth ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isGroundTruth ? 'Verified Ledger Context' : inspector.subtitle}
                    </span>
                    <span className="ml-auto text-[10px] font-mono font-bold text-blue-500">{inspector.transactions.length} Data points</span>
                </div>

                {/* Merchant Intelligence Section */}
                {merchantProfiles.length > 0 && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 px-1">
                            <Zap size={14} className="text-amber-500" />
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Merchant Clusters</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {merchantProfiles.slice(0, 4).map(profile => {
                                const isSpiking = profile.countInView > (profile.stats.avgCountPerMonth * 2) && profile.stats.avgCountPerMonth > 0.5;
                                const nextHit = getNextExpectedDate(profile.lastSeen, profile.cadence);
                                
                                return (
                                    <div key={profile.identity} className="min-w-[240px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl shadow-sm flex flex-col group/card hover:border-blue-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate pr-2" title={profile.identity}>{profile.identity}</h4>
                                                <div className="flex gap-1.5 mt-2">
                                                    {profile.cadence !== 'NONE' && (
                                                        <span className="text-[7px] font-black uppercase bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/10">{profile.cadence}</span>
                                                    )}
                                                    {isSpiking && <span className="text-[7px] font-black uppercase bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/10 animate-pulse">Spike</span>}
                                                </div>
                                            </div>
                                            {profile.isUnregistered && (
                                                <button onClick={() => handleConvertToSub(profile)} className="p-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg shadow-sm hover:scale-105 transition-transform"><Plus size={12} strokeWidth={3} /></button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">12M Total</p>
                                                <PrivacyValue value={profile.l12mTotal} className="text-sm font-black font-mono text-slate-900 dark:text-white" />
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Typical</p>
                                                <PrivacyValue value={profile.stats.median} className="text-sm font-black font-mono text-blue-500" />
                                            </div>
                                        </div>

                                        {nextHit && (
                                            <div className="mb-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Clock size={10} className="text-blue-500" /> Expected
                                                </p>
                                                <PrivacyValue value={nextHit} className="text-[10px] font-bold font-mono text-slate-900 dark:text-white mt-1 block" />
                                            </div>
                                        )}

                                        <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Temporal Pulse</span>
                                                <span className="text-[7px] font-bold text-slate-400">{profile.pulse.filter(Boolean).length}/12</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {profile.pulse.slice().reverse().map((hit, i) => (
                                                    <div key={i} className={`flex-1 h-1 rounded-sm ${hit ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.3)]' : 'bg-slate-100 dark:bg-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Audit Stream Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <History size={14} className="text-indigo-500" />
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Atomic Audit Stream</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {inspector.transactions.length > 0 ? (
                            inspector.transactions.map((tx, idx) => {
                                const source = (tx as any).source;
                                const profile = profileMap.get(cleanMerchantDescription(tx.description));
                                const anomaly = getTransactionAnomaly(tx, profile);

                                return (
                                    <div key={tx.id || idx} className={`flex items-center justify-between p-5 bg-white dark:bg-slate-800/40 border rounded-2xl hover:border-blue-500/30 transition-all group ${anomaly?.type === 'SHOCK' ? 'border-amber-500/30' : 'border-slate-100 dark:border-slate-800'}`}>
                                        <div className="min-w-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{tx.description}</h4>
                                                {anomaly && (
                                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${anomaly.type === 'SHOCK' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                        {anomaly.type === 'SHOCK' ? 'SHOCK' : 'DIP'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{tx.date}</span>
                                                {source && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Landmark size={8} /> {source}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <PrivacyValue value={tx.amount} className={`text-sm font-black font-mono tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`} />
                                            {anomaly && <div className="text-[8px] font-black text-slate-400 uppercase mt-1">Δ {Math.abs(anomaly.variance).toFixed(0)}%</div>}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Stack</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Compact Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-4">
            <button 
                onClick={handleJumpToLedger}
                className="flex items-center justify-between w-full p-5 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all group"
            >
                <div className="flex items-center gap-3">
                    <ExternalLink size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Launch Full Ledger</span>
                </div>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center justify-center gap-2 opacity-30">
                <Terminal size={10} className="text-blue-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em]">Context Isolation Nominal</span>
            </div>
        </div>
      </div>
    </div>
  );
};