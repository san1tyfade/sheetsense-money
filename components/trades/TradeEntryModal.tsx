
import React, { useState, useEffect, useMemo } from 'react';
import { Trade } from '../../types';
import { History } from 'lucide-react';
import { RegistryModal } from '../information/RegistryModal';
import { useFinancialStore } from '../../context/FinancialContext';
import { ManagedField } from '../core-ui/ManagedField';
import { TemporalSovereign } from '../../services/temporalService';

interface TradeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (t: Trade) => Promise<void>;
    initialData?: Trade | null;
}

export const TradeEntryModal: React.FC<TradeEntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const { accounts, trades, activeYear } = useFinancialStore();
    
    const [formData, setFormData] = useState<Partial<Trade>>({
        date: TemporalSovereign.getLogicalTodayISO(activeYear),
        type: 'BUY',
        ticker: '',
        quantity: 0,
        price: 0,
        fee: 0,
        account: ''
    });
    
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    quantity: Math.abs(initialData.quantity),
                    total: Math.abs(initialData.total)
                });
            } else {
                setFormData({
                    date: TemporalSovereign.getLogicalTodayISO(activeYear),
                    type: 'BUY',
                    ticker: '',
                    quantity: 0,
                    price: 0,
                    fee: 0,
                    account: ''
                });
            }
        }
    }, [isOpen, initialData, activeYear]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const accountOptions = useMemo(() => {
        const list = new Set<string>();
        accounts.forEach(a => {
            if (a.institution) list.add(a.institution.toUpperCase());
            if (a.name) list.add(a.name.toUpperCase());
        });
        trades.forEach(t => {
            if (t.account) list.add(t.account.toUpperCase());
        });
        return Array.from(list).sort();
    }, [accounts, trades]);

    const displayQty = Math.abs(formData.quantity || 0);
    const displayPrice = Math.abs(formData.price || 0);
    const displayFee = Math.abs(formData.fee || 0);
    
    const isSell = formData.type === 'SELL';
    const calculatedTotal = isSell 
        ? -((displayQty * displayPrice) - displayFee)
        : ((displayQty * displayPrice) + displayFee);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ticker || !formData.quantity || !formData.price) return;

        setIsSubmitting(true);
        try {
            const rawQty = Math.abs(Number(formData.quantity));
            const quantity = isSell ? -rawQty : rawQty;
            
            await onSave({
                ...formData as Trade,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                ticker: formData.ticker!.toUpperCase(),
                type: formData.type as 'BUY' | 'SELL',
                quantity,
                total: calculatedTotal,
                account: formData.account?.toUpperCase().trim() || ''
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Failed to save trade.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 h-12";

    return (
        <RegistryModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? 'Edit Trade' : 'New Trade'} 
            icon={History} 
            iconColor="text-blue-500" 
            isSubmitting={isSubmitting} 
            onSubmit={handleSubmit}
            submitLabel={initialData ? 'Update Record' : 'Log Transaction'}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                    <ManagedField label="Trade Date">
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClasses} required />
                    </ManagedField>
                    <ManagedField label="Action">
                        <div className="flex bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border-2 border-slate-200 dark:border-slate-700 h-12">
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: 'BUY'})} 
                                className={`flex-1 text-[10px] font-black rounded-lg transition-all ${formData.type === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                BUY
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: 'SELL'})} 
                                className={`flex-1 text-[10px] font-black rounded-lg transition-all ${formData.type === 'SELL' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                SELL
                            </button>
                        </div>
                    </ManagedField>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <ManagedField label="Ticker Symbol">
                        <input type="text" placeholder="e.g. AAPL" value={formData.ticker} onChange={e => setFormData({...formData, ticker: e.target.value.toUpperCase()})} className={`${inputClasses} uppercase tracking-widest`} required />
                    </ManagedField>
                    <ManagedField label="Target Account">
                        <div className="relative">
                            <input type="text" list="trade-account-options" placeholder="e.g. TFSA" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} className={`${inputClasses} uppercase tracking-widest`} />
                            <datalist id="trade-account-options">
                                {accountOptions.map(opt => <option key={opt} value={opt} />)}
                            </datalist>
                        </div>
                    </ManagedField>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <ManagedField label="Quantity">
                        <input type="number" step="any" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} className={`${inputClasses} font-mono`} required />
                    </ManagedField>
                    <ManagedField label="Price / Unit">
                        <div className="relative h-12">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input type="number" step="any" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className={`${inputClasses} pl-8 font-mono`} required />
                        </div>
                    </ManagedField>
                </div>

                <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-colors ${isSell ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isSell ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isSell ? 'Proceeds Value' : 'Total Settlement'}
                    </span>
                    <span className={`text-lg font-black font-mono ${isSell ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-white'}`}>
                        ${Math.abs(calculatedTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                </div>
            </div>
        </RegistryModal>
    );
};
