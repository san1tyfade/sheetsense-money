import React, { useMemo, memo, useState, useEffect } from 'react';
import { TaxRecord } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Landmark, Sparkles, History, Plus, Pencil, Trash2, X, Loader2, ArrowUpRight, ArrowDownRight, GraduationCap, Lock, Save, Clock, Info, ShieldAlert, Terminal } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { TAX_ACCOUNTS, TAX_SUMMARY_ACCOUNTS, TAX_LIMIT_TYPES, TAX_CONTRIBUTION_TYPES, TAX_WITHDRAWAL_TYPES, calculateTaxStats } from '../../services/taxService';
import { RegistryModal } from './RegistryModal';

interface TaxRoomTrackerProps {
  taxRecords: TaxRecord[];
  isLoading?: boolean;
  onAddTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onEditTaxRecord?: (rec: TaxRecord) => Promise<void>;
  onDeleteTaxRecord?: (rec: TaxRecord) => Promise<void>;
}

const RoomCard = memo(({ label, used, remaining, totalLimit, pendingRecovery, color }: { label: string, used: number, remaining: number, totalLimit: number, pendingRecovery: number, color: string }) => {
    const data = [{ name: 'Used', value: Math.max(0, used) }, { name: 'Remaining', value: Math.max(0, remaining) }];
    const pctUsed = totalLimit > 0 ? (used / totalLimit) * 100 : 0;
    
    return (
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[2.5rem] p-8 flex flex-col shadow-sm transition-all hover:border-blue-500/40 group relative overflow-hidden">
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000`} style={{ backgroundColor: color }}></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-500 dark:text-slate-400 shadow-inner group-hover:scale-110 transition-transform duration-500" style={{ color: pctUsed > 0 ? color : undefined }}>
                      {label === 'TFSA' ? <ShieldCheck size={28} /> : label === 'FHSA' ? <Landmark size={28} /> : <Sparkles size={28} />}
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{label}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Core Contribution Pool</p>
                    </div>
                </div>
                <div className="relative w-16 h-16 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} innerRadius={22} outerRadius={28} paddingAngle={0} dataKey="value" startAngle={90} endAngle={450} stroke="none">
                                <Cell fill={color} />
                                <Cell fill="currentColor" className="text-slate-100 dark:text-slate-900" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white font-mono">{Math.round(pctUsed)}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Utilization</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono ghost-blur tracking-tighter leading-none">{formatBaseCurrency(used).replace(/\.00$/, '')}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remaining Room</p>
                    <p className="text-2xl font-black text-emerald-500 font-mono ghost-blur tracking-tighter leading-none">{formatBaseCurrency(remaining).replace(/\.00$/, '')}</p>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-5 relative z-10">
                <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Total Capacity <Info size={10} /></p>
                    <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 font-mono">{formatBaseCurrency(totalLimit)}</p>
                </div>
                
                {pendingRecovery > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 group/pending relative animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            <Clock size={12} className="animate-pulse" /> Jan {new Date().getFullYear() + 1} Recovery
                        </div>
                        <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 font-mono">+${formatBaseCurrency(pendingRecovery)}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export const TaxRoomTracker: React.FC<TaxRoomTrackerProps> = ({ taxRecords, isLoading = false, onAddTaxRecord, onEditTaxRecord, onDeleteTaxRecord }) => {
    const [activeTab, setActiveTab] = useState<string>('TFSA');
    const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
    const [isAddingRecord, setIsAddingRecord] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState<Partial<TaxRecord>>({
        recordType: 'TFSA',
        transactionType: 'Contribution',
        date: new Date().toISOString().split('T')[0],
        value: 0,
        description: ''
    });

    useEffect(() => {
        if (editingRecord) {
            setForm(editingRecord);
        } else if (isAddingRecord) {
            setForm({
                recordType: activeTab,
                transactionType: 'Contribution',
                date: new Date().toISOString().split('T')[0],
                value: 0,
                description: ''
            });
        }
    }, [editingRecord, isAddingRecord, activeTab]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onAddTaxRecord || !onEditTaxRecord) return;
        
        setIsSubmitting(true);
        try {
            const payload = {
                ...form as TaxRecord,
                id: editingRecord?.id || crypto.randomUUID(),
            };
            
            if (editingRecord) {
                await onEditTaxRecord(payload);
            } else {
                await onAddTaxRecord(payload);
            }
            
            setIsAddingRecord(false);
            setEditingRecord(null);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const accountStats = useMemo(() => calculateTaxStats(taxRecords), [taxRecords]);
    const activeRecords = useMemo(() => taxRecords.filter(r => (r.recordType || '').toUpperCase().includes(activeTab)).sort((a, b) => b.date.localeCompare(a.date)), [taxRecords, activeTab]);

    const getAccountColor = (acc: string) => {
        const colors: Record<string, string> = { TFSA: '#10b981', RRSP: '#f59e0b', FHSA: '#3b82f6', LAPP: '#ef4444', RESP: '#8b5cf6' };
        return colors[acc] || '#64748b';
    };

    return (
        <div className="space-y-12 animate-fade-in pb-20 tabular-nums">
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 border-2 border-slate-950 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="p-6 bg-blue-500/10 text-blue-400 rounded-3xl border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <ShieldAlert size={40} />
                </div>
                <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        Regulatory Audit Protocol
                        <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20">Encryption Verified</span>
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-3xl">
                        Sheetsense automatically enforces current tax legislation. These records are stored in your <b>Private Cloud Vault</b> and remain strictly separated from the public ledger logic.
                    </p>
                </div>
                <div className="shrink-0">
                     <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 shadow-inner animate-pulse"><Lock size={28} /></div>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 ${isLoading ? 'opacity-60 blur-[1px]' : ''}`}>
                {TAX_SUMMARY_ACCOUNTS.map(acc => (
                    <RoomCard key={acc} label={acc} used={accountStats[acc]?.used || 0} totalLimit={accountStats[acc]?.totalLimit || 0} remaining={accountStats[acc]?.remaining || 0} pendingRecovery={accountStats[acc]?.pendingRecovery || 0} color={getAccountColor(acc)} />
                ))}
            </div>
            
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
                    <div className="flex bg-white dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                        {TAX_ACCOUNTS.map(acc => (
                            <button key={acc} onClick={() => setActiveTab(acc)} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${activeTab === acc ? 'bg-slate-950 text-white dark:bg-slate-800 shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{acc}</button>
                        ))}
                    </div>
                    {!isLoading && onAddTaxRecord && (
                        <button onClick={() => setIsAddingRecord(true)} className="bg-blue-600 dark:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] px-12 py-5 rounded-[1.5rem] shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
                            <Plus size={20} strokeWidth={3} /> Register Event
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 border-2 border-slate-950 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                <tr>
                                    <th className="px-10 py-6">Interaction Timestamp</th>
                                    <th className="px-10 py-6">Protocol Type</th>
                                    <th className="px-10 py-6 text-right">Event Value</th>
                                    <th className="px-10 py-6">Audit Annotation</th>
                                    <th className="px-10 py-6 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {activeRecords.map(record => {
                                    const isWithdrawal = TAX_WITHDRAWAL_TYPES.includes((record.transactionType || '').toUpperCase());
                                    const isLimit = TAX_LIMIT_TYPES.includes((record.transactionType || '').toUpperCase());
                                    return (
                                        <tr key={record.id} className="hover:bg-blue-500/5 transition-colors group">
                                            <td className="px-10 py-8 text-sm font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-tight flex items-center gap-3">
                                              <Clock size={12} className="opacity-30" /> {record.date}
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${isLimit ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : isWithdrawal ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                                                    {isWithdrawal ? <ArrowDownRight size={12} /> : isLimit ? <Landmark size={12} /> : <ArrowUpRight size={12} />}
                                                    {record.transactionType}
                                                </div>
                                            </td>
                                            <td className={`px-10 py-8 text-right font-black font-mono text-base ghost-blur ${isWithdrawal ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{formatBaseCurrency(record.value)}</td>
                                            <td className="px-10 py-8 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider max-w-sm truncate">{record.description || <span className="opacity-30 italic">No notes captured</span>}</td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setEditingRecord(record)} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-sm active:scale-90"><Pencil size={14} /></button>
                                                    <button onClick={async () => { if (onDeleteTaxRecord && confirm('Irreversible deletion?')) { setDeletingId(record.id); try { await onDeleteTaxRecord(record); } finally { setDeletingId(null); } } }} disabled={deletingId === record.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-90">
                                                        {deletingId === record.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Registry Protocol Modal */}
            <RegistryModal 
                isOpen={isAddingRecord || !!editingRecord} 
                onClose={() => { setIsAddingRecord(false); setEditingRecord(null); }} 
                title={editingRecord ? 'Modify Tax Event' : 'Register Tax Event'} 
                icon={ShieldAlert} 
                iconColor="text-blue-500" 
                isSubmitting={isSubmitting} 
                onSubmit={handleSave}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Source Account</label>
                            <select 
                                value={form.recordType} 
                                onChange={e => setForm({...form, recordType: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-slate-900 dark:text-white"
                            >
                                {TAX_ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Event Type</label>
                            <select 
                                value={form.transactionType} 
                                onChange={e => setForm({...form, transactionType: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-slate-900 dark:text-white"
                            >
                                {TAX_LIMIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                {TAX_CONTRIBUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                {TAX_WITHDRAWAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Event Date</label>
                            <input 
                                type="date" 
                                value={form.date} 
                                onChange={e => setForm({...form, date: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white" 
                                required 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Value</label>
                            <input 
                                type="number" 
                                step="any" 
                                value={form.value || ''} 
                                onChange={e => setForm({...form, value: parseFloat(e.target.value)})} 
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black font-mono outline-none text-slate-900 dark:text-white" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Audit Annotation</label>
                        <textarea 
                            value={form.description || ''} 
                            onChange={e => setForm({...form, description: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white resize-none placeholder:text-slate-400" 
                            rows={2}
                            placeholder="e.g. 2025 Standard Limit Increase"
                        />
                    </div>
                </div>
            </RegistryModal>
        </div>
    );
};