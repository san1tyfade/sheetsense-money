import React, { useState, useEffect, useMemo } from 'react';
import { REGISTRY_SCHEMAS } from '../../config/RegistrySchemas';
import { ManagedField } from './ManagedField';
import { formatBaseCurrency } from '../../services/currencyService';

interface SovereignFormProps {
    schemaId: string;
    initialData?: any;
    onDataChange?: (data: any) => void;
    datalists?: Record<string, string[]>;
}

export const SovereignForm: React.FC<SovereignFormProps> = ({ 
    schemaId, initialData, onDataChange, datalists 
}) => {
    const schema = REGISTRY_SCHEMAS[schemaId];
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        // Initialize from schema defaults or initial data
        const base: any = {};
        Object.entries(schema.fields).forEach(([key, def]) => {
            if (def.uiType) {
                base[key] = initialData?.[key] ?? def.fallback ?? (def.type === 'number' ? 0 : '');
            }
        });
        setFormData(base);
    }, [schemaId, initialData, schema]);

    const handleUpdate = (key: string, value: any) => {
        const next = { ...formData, [key]: value };
        setFormData(next);
        onDataChange?.(next);
    };

    const inputClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[3rem]";
    const selectClasses = "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none appearance-none text-slate-900 dark:text-white cursor-pointer focus:border-blue-500 min-h-[3rem]";

    // Specialized renderers for Trade total settlement visual
    const isTradeSchema = schemaId === 'trades';
    const tradeSummary = useMemo(() => {
        if (!isTradeSchema) return null;
        const qty = Math.abs(formData.quantity || 0);
        const prc = Math.abs(formData.price || 0);
        const fee = Math.abs(formData.fee || 0);
        const isSell = formData.type === 'SELL';
        const total = isSell ? -((qty * prc) - fee) : ((qty * prc) + fee);
        return { total, isSell };
    }, [isTradeSchema, formData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
                {Object.entries(schema.fields).map(([key, def]) => {
                    if (!def.uiType) return null;

                    const gridClass = def.gridSpan === 2 ? "col-span-2" : "col-span-1";
                    
                    return (
                        <div key={key} className={gridClass}>
                            <ManagedField label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}>
                                {def.uiType === 'text' && (
                                    <>
                                        <input 
                                            type="text" 
                                            list={def.isDatalist ? `${schemaId}-${key}-list` : undefined}
                                            value={formData[key] || ''} 
                                            onChange={e => handleUpdate(key, e.target.value)} 
                                            className={`${inputClasses} ${def.type === 'ticker' ? 'uppercase tracking-widest' : ''}`}
                                            placeholder={def.placeholder}
                                            required={def.required}
                                        />
                                        {def.isDatalist && (
                                            <datalist id={`${schemaId}-${key}-list`}>
                                                {(datalists?.[key] || def.options?.map(o => o.value) || []).map(opt => <option key={opt} value={opt} />)}
                                            </datalist>
                                        )}
                                    </>
                                )}

                                {def.uiType === 'ticker' && (
                                    <input 
                                        type="text" 
                                        value={formData[key] || ''} 
                                        onChange={e => handleUpdate(key, e.target.value.toUpperCase())} 
                                        className={`${inputClasses} uppercase tracking-widest`}
                                        placeholder={def.placeholder}
                                        required={def.required}
                                    />
                                )}

                                {def.uiType === 'number' && (
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                        <input 
                                            type="number" 
                                            step="any" 
                                            value={formData[key] === 0 ? '' : formData[key]} 
                                            onChange={e => handleUpdate(key, parseFloat(e.target.value) || 0)} 
                                            className={`${inputClasses} pl-8 font-mono`} 
                                            placeholder={def.placeholder}
                                            required={def.required}
                                        />
                                    </div>
                                )}

                                {def.uiType === 'date' && (
                                    <input 
                                        type="date" 
                                        value={formData[key] || ''} 
                                        onChange={e => handleUpdate(key, e.target.value)} 
                                        className={inputClasses} 
                                        required={def.required}
                                    />
                                )}

                                {def.uiType === 'select' && (
                                    <select 
                                        value={formData[key] || ''} 
                                        onChange={e => handleUpdate(key, e.target.value)} 
                                        className={selectClasses}
                                    >
                                        {def.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                )}

                                {def.uiType === 'textarea' && (
                                    <textarea 
                                        value={formData[key] || ''} 
                                        onChange={e => handleUpdate(key, e.target.value)} 
                                        className={`${inputClasses} resize-none h-24`} 
                                        rows={2} 
                                        placeholder={def.placeholder} 
                                    />
                                )}

                                {def.uiType === 'toggle' && (
                                    <div className={`p-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 h-12 flex ${def.gridSpan === 2 ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
                                        {def.type === 'boolean' ? (
                                            <button 
                                                type="button" 
                                                onClick={() => handleUpdate(key, !formData[key])} 
                                                className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData[key] ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {formData[key] ? 'Active' : 'Standby'}
                                            </button>
                                        ) : (
                                            def.options?.map(opt => (
                                                <button 
                                                    key={opt.value}
                                                    type="button" 
                                                    onClick={() => handleUpdate(key, opt.value)} 
                                                    className={`flex-1 text-[10px] font-black rounded-lg transition-all ${formData[key] === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </ManagedField>
                        </div>
                    );
                })}
            </div>

            {/* Specialized UI Feedback for Trades */}
            {tradeSummary && (
                <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-colors animate-in zoom-in-95 ${tradeSummary.isSell ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${tradeSummary.isSell ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {tradeSummary.isSell ? 'Proceeds Value' : 'Total Settlement'}
                    </span>
                    <span className={`text-lg font-black font-mono ${tradeSummary.isSell ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-white'}`}>
                        {formatBaseCurrency(Math.abs(tradeSummary.total))}
                    </span>
                </div>
            )}
        </div>
    );
};