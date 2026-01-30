import React, { useState, useEffect } from 'react';
import { Subscription } from '../../types';
import { Receipt } from 'lucide-react';
import { RegistryModal } from './RegistryModal';
import { ManagedField } from '../core-ui/ManagedField';

interface SubscriptionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sub: Subscription) => Promise<void>;
  initialData?: Partial<Subscription> | null;
}

export const SubscriptionEntryModal: React.FC<SubscriptionEntryModalProps> = ({ 
  isOpen, onClose, onSave, initialData 
}) => {
  const [form, setForm] = useState<Partial<Subscription>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || { name: '', cost: 0, period: 'Monthly', category: 'General', active: true });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(form as Subscription);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save commitment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white";

  return (
    <RegistryModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? 'Edit Commitment' : 'New Commitment'} 
      icon={Receipt} 
      iconColor="text-indigo-500" 
      isSubmitting={isSubmitting} 
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        <ManagedField label="Service Identity">
          <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className={inputClasses} placeholder="e.g. Netflix" required />
        </ManagedField>
        
        <div className="grid grid-cols-2 gap-4">
          <ManagedField label="Valuation Drain">
            <input type="number" step="any" value={form.cost || ''} onChange={e => setForm({...form, cost: parseFloat(e.target.value)})} className={`${inputClasses} font-mono`} placeholder="0.00" required />
          </ManagedField>
          <ManagedField label="Cycle Period">
            <select value={form.period} onChange={e => setForm({...form, period: e.target.value as any})} className={`${inputClasses} appearance-none cursor-pointer uppercase text-[10px] tracking-widest`}>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="Weekly">Weekly</option>
            </select>
          </ManagedField>
        </div>

        <ManagedField label="Protocol State">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Subscription Node</span>
          </div>
        </ManagedField>
      </div>
    </RegistryModal>
  );
};