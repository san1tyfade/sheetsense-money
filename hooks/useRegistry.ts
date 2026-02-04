import { useCallback, useMemo } from 'react';
import { useFinancialStore } from '../context/FinancialContext';
import { rse } from '../services/sync/RSEEngine';
import { Mutation, ManagedEntity, SheetConfig } from '../types';

const STATE_MAP: Record<string, string> = {
    journal: 'journalEntries',
    logData: 'netWorthHistory',
    portfolioLog: 'portfolioHistory',
    debt: 'debtEntries',
    income: 'incomeData',
    expenses: 'expenseData'
};

/**
 * useRegistry<T>: The Consolidated Domain Controller
 * Handles optimistic local state and background RSE uplinks for any schema type.
 */
export function useRegistry<T extends ManagedEntity>(
    schemaId: keyof SheetConfig['tabNames']
) {
    const store = useFinancialStore();
    
    // Resolve correct state and dispatcher names
    const stateKey = STATE_MAP[schemaId as string] || (schemaId as string);
    const pool = (store as any)[stateKey] as T[];
    const setPool = (store as any)[`set${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}`];

    const pushMutation = useCallback(async (action: 'UPSERT' | 'DELETE', data: any) => {
        const mutation: Mutation = {
            id: crypto.randomUUID(),
            entity: schemaId,
            action,
            data,
            timestamp: Date.now()
        };
        await rse.push(mutation);
    }, [schemaId]);

    const add = useCallback(async (item: T) => {
        const id = item.id || crypto.randomUUID();
        const nextItem = { ...item, id, isDirty: true };
        if (setPool) setPool((prev: T[]) => [...prev, nextItem]);
        await pushMutation('UPSERT', nextItem);
    }, [setPool, pushMutation]);

    const edit = useCallback(async (item: T) => {
        const nextItem = { ...item, isDirty: true };
        if (setPool) setPool((prev: T[]) => prev.map(i => i.id === item.id ? nextItem : i));
        await pushMutation('UPSERT', nextItem);
    }, [setPool, pushMutation]);

    const remove = useCallback(async (item: T) => {
        if (setPool) setPool((prev: T[]) => prev.filter(i => i.id !== item.id));
        await pushMutation('DELETE', item);
    }, [setPool, pushMutation]);

    const bulkDelete = useCallback(async (ids: Set<string>) => {
        const items = pool.filter(i => ids.has(i.id));
        if (setPool) setPool((prev: T[]) => prev.filter(i => !ids.has(i.id)));
        for (const item of items) {
            await pushMutation('DELETE', item);
        }
    }, [pool, setPool, pushMutation]);

    const bulkEdit = useCallback(async (ids: Set<string>, updates: Partial<T>) => {
        if (setPool) setPool((prev: T[]) => prev.map(item => {
            if (ids.has(item.id)) {
                const next = { ...item, ...updates, isDirty: true };
                pushMutation('UPSERT', next);
                return next;
            }
            return item;
        }));
    }, [setPool, pushMutation]);

    return useMemo(() => ({
        data: pool,
        add,
        edit,
        delete: remove,
        remove,
        bulkDelete,
        bulkEdit
    }), [pool, add, edit, remove, bulkDelete, bulkEdit]);
}