import React, { useState } from 'react';
import { Pencil, X, Terminal, AlertCircle, Save } from 'lucide-react';
import { RegistryModal } from '../information/RegistryModal';
import { ManagedField } from './ManagedField';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => Promise<void>;
    count: number;
    fieldName: string;
    description: string;
    options?: { value: string; label: string }[];
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
    isOpen, onClose, onConfirm, count, fieldName, description, options
}) => {
    const [newValue, setNewValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(newValue.trim());
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RegistryModal
            isOpen={isOpen}
            onClose={onClose}
            title="Batch Recalibration"
            icon={Pencil}
            iconColor="text-blue-500"
            isSubmitting={isSubmitting}
            onSubmit={handleConfirm}
            submitLabel="Apply Transformation"
        >
            <div className="space-y-6">
                <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-blue-500" />
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Multi-Node Protocol</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase">
                        You are about to modify the <span className="text-blue-600">{fieldName}</span> property across <span className="text-blue-600">{count} selected items</span>. 
                    </p>
                </div>

                <ManagedField label={`New ${fieldName}`} info="TARGET VALUE">
                    {options ? (
                        <select 
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-slate-900 dark:text-white shadow-inner"
                        >
                            <option value="">Select Target...</option>
                            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : (
                        <input 
                            type="text"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                            placeholder={description}
                        />
                    )}
                </ManagedField>

                <div className="pt-2 flex justify-center opacity-30">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                        <Terminal size={10} /> batch_logic_authority
                    </span>
                </div>
            </div>
        </RegistryModal>
    );
};