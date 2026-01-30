import React, { memo, useMemo } from 'react';
import { Asset, ExchangeRates } from '../../types';
import { Pencil, Trash2, Cpu } from 'lucide-react';
import { convertToBase, formatBaseCurrency, formatNativeCurrency, getCurrencyFlag } from '../../services/currencyService';
import { getAssetIcon, isAssetManagedByLiveFeed } from '../../services/domain/classificationHub';
import { SelectionManager } from '../../hooks/useSelection';
import { DirtyGlyph } from '../core-ui/DirtyGlyph';

interface AssetTableViewProps {
    assets: Asset[];
    exchangeRates?: ExchangeRates;
    onEdit: (a: Asset) => void;
    onDelete: (a: Asset) => void;
    isLoading: boolean;
    selection: SelectionManager<Asset>;
}

export const AssetTableView = memo(({ assets, exchangeRates, onEdit, onDelete, isLoading, selection }: AssetTableViewProps) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-950 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        <th className="px-6 py-6 w-12 text-center">
                            <input 
                                type="checkbox" 
                                checked={selection.isAllSelected}
                                onChange={selection.toggleAll}
                                className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500/20"
                            />
                        </th>
                        <th className="px-10 py-6">Instrument Identity</th>
                        <th className="px-10 py-6 text-center">Classification Protocol</th>
                        <th className="px-10 py-6 text-right">Native Valuation</th>
                        <th className="px-10 py-6 text-right">Global Core (CAD)</th>
                        <th className="px-10 py-6 w-24"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/10">
                    {assets.map((asset, idx) => {
                        const baseVal = convertToBase(asset.value, asset.currency, exchangeRates);
                        const isManaged = isAssetManagedByLiveFeed(asset);
                        const canEdit = asset.rowIndex !== undefined && !isManaged;
                        const isSelected = selection.selectedIds.has(asset.id);

                        return (
                            <tr 
                                key={asset.id} 
                                onClick={(e) => selection.handleRowClick(e, asset, idx)}
                                className={`transition-colors group/row tabular-nums cursor-pointer ${
                                    isSelected 
                                    ? 'bg-blue-500/10 hover:bg-blue-500/15' 
                                    : 'hover:bg-blue-500/5 dark:hover:bg-blue-500/10'
                                }`}
                            >
                                <td className="px-6 py-8 text-center" onClick={(e) => e.stopPropagation()}>
                                    <DirtyGlyph active={asset.isDirty} />
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => selection.toggleSelection(asset.id)}
                                        className="w-4 h-4 rounded border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                    />
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover/row:scale-105 transition-transform duration-500 shadow-inner">
                                            {getAssetIcon(asset.type)}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-black text-slate-900 dark:text-white tracking-widest uppercase text-base">{asset.name}</span>
                                            {isManaged && (
                                                <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-emerald-500 tracking-widest">
                                                    <Cpu size={10} /> Active Application Feed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {asset.type}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right font-mono font-bold text-slate-400 dark:text-slate-500 text-sm ghost-blur">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] opacity-40">{getCurrencyFlag(asset.currency)}</span>
                                        {formatNativeCurrency(asset.value, asset.currency)}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right font-mono font-black text-slate-900 dark:text-white text-base ghost-blur">
                                    {formatBaseCurrency(baseVal)}
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                                        {canEdit ? (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 rounded-xl transition-all shadow-sm active:scale-90"><Pencil size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); onDelete(asset); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-90"><Trash2 size={14} /></button>
                                            </>
                                        ) : isManaged && (
                                            // Fix: Moved 'title' attribute from Cpu component to wrapping 'div' to resolve TypeScript prop error.
                                            <div className="p-2.5 text-slate-200 dark:text-slate-800" title="Managed Node"><Cpu size={14} /></div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});