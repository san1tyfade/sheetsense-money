import React, { useState, memo, useMemo } from 'react';
import { Asset, ExchangeRates, DensityMode } from '../../types';
import { Pencil, Trash2, Loader2, ChevronRight, Cpu } from 'lucide-react';
import { convertToBase, PRIMARY_CURRENCY } from '../../services/currencyService';
import { getAssetIcon, isAssetManagedByLiveFeed } from '../../services/domain/classificationHub';
import { PrivacyValue } from '../core-ui/PrivacyValue';
import { useFinancialStore } from '../../context/FinancialContext';
import { DirtyGlyph } from '../core-ui/DirtyGlyph';

interface AssetCardProps {
    asset: Asset;
    exchangeRates?: ExchangeRates;
    isLoading: boolean;
    onDelete?: (a: Asset) => Promise<void>;
    onEdit?: (a: Asset) => void;
}

export const AssetCard = memo(({ asset, exchangeRates, isLoading, onDelete, onEdit }: AssetCardProps) => {
    const { densityMode } = useFinancialStore();
    const isCompact = densityMode === DensityMode.COMPACT;
    
    const isForeign = asset.currency && asset.currency.toUpperCase() !== PRIMARY_CURRENCY;
    const baseValue = convertToBase(asset.value, asset.currency, exchangeRates);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const isManaged = useMemo(() => isAssetManagedByLiveFeed(asset), [asset]);
    const canEdit = !isManaged;
    const showTypeLabel = asset.type && asset.name.toUpperCase() !== asset.type.toUpperCase();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;
        if (!confirm(`Confirm deletion of "${asset.name}"?`)) return;
        setIsDeleting(true);
        try { await onDelete(asset); } catch (e: any) { alert(e.message); setIsDeleting(false); }
    };

    const handleCardClick = () => {
        if (canEdit && onEdit) {
            onEdit(asset);
        }
    };

    return (
        <div 
            onClick={handleCardClick}
            role={canEdit ? "button" : undefined}
            tabIndex={canEdit ? 0 : -1}
            className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl transition-all duration-500 group animate-fade-in relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-2xl ss-card ${
                isCompact ? 'min-h-[140px]' : 'min-h-[180px] md:min-h-[220px]'
            } ${
                canEdit ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
            }`}
        >
            <DirtyGlyph active={asset.isDirty} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
            
            {/* Top Meta Row */}
            <div className="flex justify-between items-start relative z-10 mb-4">
                <div className={`bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400 shadow-inner group-hover:scale-110 transition-transform duration-500 ${
                    isCompact ? 'p-2' : 'p-3'
                }`}>
                    {getAssetIcon(asset.type)}
                </div>

                <div className="flex items-center gap-2">
                    {isManaged && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-[7px]">Active Feed</span>
                        </div>
                    )}
                    
                    {/* Desktop Hover Actions */}
                    <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && onDelete && (
                            <button 
                                onClick={handleDelete} 
                                disabled={isDeleting || isLoading} 
                                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-rose-500 transition-all active:scale-90 shadow-sm"
                            >
                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Information Layer (Split View) */}
            <div className="flex items-end justify-between relative z-10 gap-4">
                {/* Left: Identity Gutter */}
                <div className="flex-1 min-w-0">
                    <div className="space-y-1">
                        <h3 className={`font-black text-slate-900 dark:text-white truncate tracking-tight leading-tight uppercase ${
                            isCompact ? 'text-xs' : 'text-sm md:text-base'
                        }`}>
                            {asset.name}
                        </h3>
                        {showTypeLabel && (
                            <span className={`font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] block ${
                                isCompact ? 'text-[7px]' : 'text-[8px] md:text-[9px]'
                            }`}>
                                {asset.type}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Valuation Gutter */}
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <PrivacyValue 
                            value={asset.value} 
                            format="native" 
                            currency={asset.currency} 
                            className={`font-black text-slate-900 dark:text-white tracking-tighter leading-none font-mono ${
                                isCompact ? 'text-lg' : 'text-xl md:text-2xl'
                            }`} 
                        />
                        {isForeign && (
                            <div className={`text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest flex items-center gap-1 opacity-60 mt-1 ${
                                isCompact ? 'text-[7px]' : 'text-[8px] md:text-[9px]'
                            }`}>
                                <span>≈ </span>
                                <PrivacyValue value={baseValue} />
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile Drill-down Indicator */}
                    {canEdit && (
                        <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
                            <ChevronRight size={20} strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>

            {/* Subtle Footer for Context */}
            {!isCompact && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center opacity-30">
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Node</span>
                    {asset.lastUpdated && (
                        <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 font-mono">{asset.lastUpdated}</span>
                    )}
                </div>
            )}
        </div>
    );
});