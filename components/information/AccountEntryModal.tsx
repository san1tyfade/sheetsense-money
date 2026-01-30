import React, { useState, useEffect } from 'react';
import { BankAccount } from '../../types';
import { Landmark, ArrowRightLeft, CreditCard } from 'lucide-react';
import { RegistryModal } from './RegistryModal';
import { PRIMARY_CURRENCY } from '../../services/currencyService';
import { ManagedField } from '../core-ui/ManagedField';

interface AccountEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (acc: BankAccount) => Promise<void>;
  initialData?: Partial<BankAccount> | null;
}

export const AccountEntryModal: React.FC<AccountEntryModalProps> = ({ 
  isOpen, onClose, onSave, initialData 
}) => {
  const [form, setForm] = useState<Partial<BankAccount>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || { institution: '', name: '', type: 'Checking', paymentType: 'Card', transactionType: 'Debit', currency: PRIMARY_CURRENCY, purpose: '' });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(form as BankAccount);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save institutional node.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white";

  return (
    <RegistryModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? 'Edit Institution' : 'Register Institution'} 
      icon={Landmark} 
      iconColor="text-emerald-500" 
      isSubmitting={isSubmitting} 
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <ManagedField label="Bank Identity">
            <input type="text" value={form.institution || ''} onChange={e => setForm({...form, institution: e.target.value})} className={inputClasses} placeholder="e.g. AMEX" required />
          </ManagedField>
          <ManagedField label="Node Label">
            <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className={inputClasses} placeholder="e.g. Primary" required />
          </ManagedField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ManagedField label="Flow Class">
              <div className="flex bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border-2 border-slate-200 dark:border-slate-700 h-12">
                  <button type="button" onClick={() => setForm({...form, transactionType: 'Debit'})} className={`flex-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${form.transactionType === 'Debit' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}>Debit</button>
                  <button type="button" onClick={() => setForm({...form, transactionType: 'Credit'})} className={`flex-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${form.transactionType === 'Credit' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Credit</button>
              </div>
          </ManagedField>
          <ManagedField label="Network Type">
              <input list="shared-payment-types" value={form.paymentType || ''} onChange={e => setForm({...form, paymentType: e.target.value})} className={`${inputClasses} h-12 text-[10px] uppercase tracking-widest`} placeholder="e.g. Card, Cash..." />
              <datalist id="shared-payment-types"><option value="Card" /><option value="Cash" /><option value="Transfer" /><option value="Crypto" /><option value="Physical" /></datalist>
          </ManagedField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ManagedField label="Classification">
            <input type="text" placeholder="e.g. Checking" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className={inputClasses} />
          </ManagedField>
          <ManagedField label="Last 4 Digits">
            <input type="text" maxLength={4} inputMode="numeric" value={form.accountNumber || ''} onChange={e => setForm({...form, accountNumber: e.target.value.replace(/\D/g, '')})} className={`${inputClasses} font-mono`} placeholder="0000" />
          </ManagedField>
        </div>
        
        <ManagedField label="Identity Annotation">
          <textarea value={form.purpose || ''} onChange={e => setForm({...form, purpose: e.target.value})} className={`${inputClasses} resize-none h-24`} rows={2} placeholder="Briefly describe node usage..." />
        </ManagedField>
      </div>
    </RegistryModal>
  );
};