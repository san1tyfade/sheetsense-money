import React, { memo } from 'react';
import { Trade } from '../../types';
import { Clock, Landmark, Zap } from 'lucide-react';
import { PrivacyValue } from '../core-ui/PrivacyValue';
import { SelectionManager } from '../../hooks/useSelection';
import { InstitutionalRegistryTable, ColumnDefinition } from '../core-ui/InstitutionalRegistryTable';

interface TradeHistoryTableProps {
    trades: Trade[];
    isLoading: boolean;
    onDelete?: (t: Trade) => Promise<void>;
    onEdit: (t: Trade) => void;
    isReadOnly: boolean;
    compact?: boolean;
    selection: SelectionManager<Trade>;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = memo(({ 
    trades, isLoading, onDelete, onEdit, isReadOnly, compact = false, selection 
}) => {
    
    const columns: ColumnDefinition<Trade>[] = [
        {
            key: 'date',
            header: 'Audit Timestamp',
            render: (t) => (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono font-bold text-xs uppercase tracking-tighter">
                    <Clock size={12} className="opacity-40" /> {t.date}
                </div>
            )
        },
        ...(!compact ? [{
            key: 'ticker',
            header: 'Asset Identity',
            render: (t: Trade) => (
                <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">{t.ticker}</span>
                    {t.account && (
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 mt-1 opacity-70">
                            <Landmark size={8} /> {t.account}
                        </span>
                    )}
                </div>
            )
        }] : []),
        {
            key: 'type',
            header: 'Protocol Action',
            render: (t) => (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${
                    t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                }`}>
                    <Zap size={10} fill="currentColor" /> {t.type}
                </div>
            )
        },
        {
            key: 'quantity',
            header: 'Qty Depth',
            align: 'right',
            render: (t) => <PrivacyValue value={Math.abs(t.quantity)} format="number" precision={4} className="font-mono font-black text-slate-700 dark:text-slate-300 text-sm" />
        },
        {
            key: 'total',
            header: 'Node Settlement',
            align: 'right',
            render: (t) => <PrivacyValue value={Math.abs(t.total)} className="font-mono font-black text-slate-900 dark:text-white text-base" />
        }
    ];

    return (
        <InstitutionalRegistryTable 
            data={trades}
            columns={columns}
            selection={selection}
            onEdit={onEdit}
            onDelete={onDelete}
            isReadOnly={isReadOnly}
            isLoading={isLoading}
        />
    );
});