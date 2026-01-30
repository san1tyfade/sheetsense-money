import { useCallback } from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { useLedger } from '../context/LedgerContext';
import { haptics } from '../services/infrastructure/HapticService';
import { REGISTRY_SCHEMAS } from '../config/RegistrySchemas';
import { commitItemToSheet, deleteRowFromSheet } from '../services/sheetWriteService';
import { saveMerchantIdentity } from '../services/tools/toolMemoryService';

/**
 * useSovereignAction: The Registry Mutation Authority
 * Phase 3.1: Encapsulates the entire lifecycle of a local-first registry modification.
 */
export function useSovereignAction<T extends { id: string; rowIndex?: number; isDirty?: boolean; description?: string; canonicalName?: string }>(
    schemaId: string,
    tabNameKey: string,
    pool: T[],
    setPool: (data: T[] | ((prev: T[]) => T[])) => void
) {
    const protocol = useProtocol();
    const { sheetConfig, notify, handleError } = protocol;
    
    const tabName = (sheetConfig.tabNames as any)[tabNameKey];
    const schema = REGISTRY_SCHEMAS[schemaId];

    const add = useCallback(async (item: any) => {
        let finalItem = { ...item, id: item.id || crypto.randomUUID(), isDirty: true };
        if (schema.postProcess) finalItem = schema.postProcess(finalItem);

        setPool(prev => [...prev, finalItem]);
        notify('info', 'Cache Updated', 'Node added to hardware buffer.');
        
        try {
            await commitItemToSheet(sheetConfig.sheetId, tabName, finalItem, schemaId);
            notify('success', 'Uplink Success', 'Infrastructure synchronized.');
        } catch (e: any) {
            handleError(e);
        }
    }, [setPool, notify, sheetConfig, tabName, schemaId, schema, handleError]);

    const edit = useCallback(async (item: any) => {
        let finalItem = { ...item, isDirty: true };
        if (schema.postProcess) finalItem = schema.postProcess(finalItem);

        // Special logic for Journal Identity tracking
        if (schemaId === 'journal' && finalItem.description && finalItem.canonicalName) {
            await saveMerchantIdentity(finalItem.description, finalItem.canonicalName);
        }

        setPool(prev => prev.map(i => i.id === item.id ? finalItem : i));
        notify('info', 'Cache Updated', 'Node modified in hardware buffer.');

        try {
            await commitItemToSheet(sheetConfig.sheetId, tabName, finalItem, schemaId);
        } catch (e: any) {
            handleError(e);
        }
    }, [setPool, notify, sheetConfig, tabName, schemaId, schema, handleError]);

    const bulkEdit = useCallback(async (ids: Set<string>, updates: Partial<T>) => {
        setPool(prev => prev.map(item => {
            if (ids.has(item.id)) {
                let next = { ...item, ...updates, isDirty: true };
                if (schema.postProcess) next = schema.postProcess(next);
                return next;
            }
            return item;
        }));
        notify('info', 'Batch Updated', `${ids.size} nodes modified in local buffer.`);

        try {
            const toUpdate = pool.filter(i => ids.has(i.id)).map(item => {
                let next = { ...item, ...updates, isDirty: true };
                if (schema.postProcess) next = schema.postProcess(next);
                return next;
            });
            
            for (const item of toUpdate) {
                await commitItemToSheet(sheetConfig.sheetId, tabName, item, schemaId);
            }
            notify('success', 'Bulk Uplink Success', 'Infrastructure synchronized.');
        } catch (e: any) {
            handleError(e);
        }
    }, [pool, setPool, notify, sheetConfig, tabName, schemaId, schema, handleError]);

    const remove = useCallback(async (item: T) => {
        haptics.click('heavy');
        if (!confirm(`Irreversibly purge node "${(item as any).name || (item as any).ticker || item.id}"?`)) return;

        setPool(prev => prev.filter(i => i.id !== item.id));
        
        if (item.rowIndex !== undefined) {
            try {
                await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex);
                notify('success', 'Hardware Pruned', 'Node decoupled from infrastructure.');
            } catch (e: any) {
                handleError(e);
            }
        }
    }, [setPool, sheetConfig, tabName, notify, handleError]);

    const bulkDelete = useCallback(async (ids: Set<string>) => {
        haptics.click('heavy');
        const items = pool.filter(i => ids.has(i.id));
        const toDelete = items.filter(i => i.rowIndex !== undefined).sort((a, b) => b.rowIndex! - a.rowIndex!);
        
        setPool(prev => prev.filter(i => !ids.has(i.id)));
        
        if (toDelete.length > 0) {
            notify('info', 'Atomic Purge', `Deleting ${toDelete.length} cloud nodes...`);
            try {
                for (const item of toDelete) {
                    await deleteRowFromSheet(sheetConfig.sheetId, tabName, item.rowIndex!);
                }
                notify('success', 'Batch Finalized', 'Infrastructure successfully pruned.');
            } catch (e: any) {
                handleError(e);
            }
        }
    }, [pool, setPool, sheetConfig, tabName, notify, handleError]);

    return { add, edit, bulkEdit, delete: remove, bulkDelete };
}