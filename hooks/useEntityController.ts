import { useCallback } from 'react';
import { useFinancialStore } from '../context/FinancialContext';
import { commitItemToSheet, deleteRowFromSheet } from '../services/sheetWriteService';
import { SovereignLifecycle } from '../services/infrastructure/LifecycleService';
import { ManagedEntity } from '../types';

/**
 * useEntityController: The Mutation Authority
 * Generic hook to handle Local-First updates for any data pool.
 */
export function useEntityController<T extends ManagedEntity>(
    pool: T[],
    setPool: (data: T[] | ((prev: T[]) => T[])) => void,
    schemaId: string,
    tabNameKey: string
) {
    const { sheetConfig, sync, notify } = useFinancialStore();
    const tabName = (sheetConfig.tabNames as any)[tabNameKey];

    const add = useCallback(async (item: Partial<T>) => {
        const nextItem = SovereignLifecycle.prepare(item);
        setPool(prev => [...prev, nextItem]);
        notify('info', 'Cache Updated', 'Node added to local buffer.');
    }, [setPool, notify]);

    const edit = useCallback(async (item: Partial<T>) => {
        if (!item.id) return;
        const existing = pool.find(i => i.id === item.id);
        const nextItem = SovereignLifecycle.prepare(item, existing);
        setPool(prev => prev.map(i => i.id === item.id ? nextItem : i));
        notify('info', 'Cache Updated', 'Node state modified in buffer.');
    }, [setPool, notify, pool]);

    const bulkEdit = useCallback(async (ids: Set<string>, updates: Partial<T>) => {
        setPool(prev => prev.map(item => {
            if (ids.has(item.id)) {
                return SovereignLifecycle.prepare(updates, item);
            }
            return item;
        }));
        notify('info', 'Batch Updated', `${ids.size} nodes modified in local buffer.`);
    }, [setPool, notify]);

    const remove = useCallback(async (item: T) => {
        if (item.rowIndex !== undefined) {
            setPool(prev => prev.filter(i => i.id !== item.id));
            try {
                await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex);
                sync([tabNameKey as any]);
                notify('success', 'Purge Finalized', 'Node decoupled from cloud.');
            } catch (e: any) {
                notify('error', 'Purge Failed', e.message);
                sync([tabNameKey as any]);
            }
        } else {
            setPool(prev => prev.filter(i => i.id !== item.id));
        }
    }, [setPool, sheetConfig.sheetId, tabName, tabNameKey, sync, notify]);

    const bulkDelete = useCallback(async (ids: Set<string>) => {
        const items = pool.filter(i => ids.has(i.id));
        const toDelete = items.filter(i => i.rowIndex !== undefined).sort((a, b) => b.rowIndex! - a.rowIndex!);
        
        setPool(prev => prev.filter(i => !ids.has(i.id)));
        
        if (toDelete.length > 0) {
            notify('info', 'Atomic Purge', `Deleting ${toDelete.length} nodes...`);
            try {
                for (const item of toDelete) {
                    await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex!);
                }
                sync([tabNameKey as any]);
                notify('success', 'Batch Purge Complete', 'Infrastructure synchronized.');
            } catch (e: any) {
                notify('error', 'Batch Purge Failed', e.message);
                sync([tabNameKey as any]);
            }
        }
    }, [pool, setPool, sheetConfig.sheetId, tabName, tabNameKey, sync, notify]);

    const uplink = useCallback(async () => {
        const dirty = pool.filter(i => i.isDirty);
        if (dirty.length === 0) return;
        
        for (const item of dirty) {
            await commitItemToSheet(sheetConfig.sheetId, tabName, item, schemaId);
        }
    }, [pool, sheetConfig.sheetId, tabName, schemaId]);

    return { add, edit, bulkEdit, delete: remove, bulkDelete, uplink };
}
