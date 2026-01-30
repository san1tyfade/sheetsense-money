
import React, { useState, useEffect } from 'react';
import { Asset } from '../../types';
import { Plus, Pencil } from 'lucide-react';
import { PRIMARY_CURRENCY } from '../../services/currencyService';
import { RegistryModal } from '../information/RegistryModal';
import { ManagedField } from '../core-ui/ManagedField';
import { TemporalSovereign } from '../../services/temporalService';

interface AssetEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (a: Asset) => Promise<void>;
    initialData?: Asset | null;
}

export const AssetEntryModal: React.FC<AssetEntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: '',
        type: 'Cash',
        value: 0,
        currency: PRIMARY_CURRENCY
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || { name: '', type: 'Cash', value: 0, currency: PRIMARY_CURRENCY });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.type || formData.value === undefined) return;

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData as Asset,
                id: initialData?.id || crypto.randomUUID(),
                rowIndex: initialData?.rowIndex,
                lastUpdated: TemporalSovereign.getLogicalTodayISO()
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Failed to save asset.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400";
    const selectClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none text-slate-900 dark:text-white cursor-pointer focus:border-blue-500";

    return (
        <RegistryModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? 'Edit Asset' : 'New Asset'} 
            icon={initialData ? Pencil : Plus} 
            iconColor="text-blue-500" 
            isSubmitting={isSubmitting} 
            onSubmit={handleSubmit}
            submitLabel={initialData ? 'Update Record' : 'Register Asset'}
        >
            <div className="space-y-6">
                <ManagedField label="Asset Identity">
                    <input 
                      type="text" 
                      placeholder="e.g. Primary Checking, Condo" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className={inputClasses} 
                      required 
                    />
                </ManagedField>

                <div className="grid grid-cols-2 gap-5">
                    <ManagedField label="Classification">
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={selectClasses}>
                            <option value="Cash">Cash</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Personal Property">Personal Property</option>
                            <option value="Vehicle">Vehicle</option>
                            <option value="Crypto">Crypto</option>
                            <option value="Investment">Investment</option>
                            <option value="TFSA">TFSA</option>
                            <option value="RRSP">RRSP</option>
                            <option value="Other">Other</option>
                        </select>
                    </ManagedField>
                    <ManagedField label="Currency">
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={selectClasses}>
                            <option value="CAD">CAD</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </ManagedField>
                </div>

                <ManagedField label="Current Valuation" info="BASE VALUE">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input 
                          type="number" 
                          step="any" 
                          value={formData.value || ''} 
                          onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} 
                          className={`${inputClasses} pl-8 font-mono`} 
                          placeholder="0.00" 
                          required 
                        />
                    </div>
                </ManagedField>
            </div>
        </RegistryModal>
    );
};
