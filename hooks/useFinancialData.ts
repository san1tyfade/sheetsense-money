import { useEffect, useState, useCallback } from 'react';
import { useFinancialStore } from '../context/FinancialContext';
import { SheetConfig } from '../types';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * useFinancialData (RSE Phase 3)
 * Declarative data dependency hook with SWR logic.
 */
export function useFinancialData<T>(
    tabKeys: (keyof SheetConfig['tabNames'])[], 
    ttl: number = DEFAULT_TTL
) {
    const store = useFinancialStore();
    const [isStale, setIsStale] = useState(false);

    const checkFreshness = useCallback(() => {
        const lastSync = store.lastUpdatedStr;
        if (!lastSync) return true;
        const lastDate = new Date(lastSync);
        return (Date.now() - lastDate.getTime()) > ttl;
    }, [store.lastUpdatedStr, ttl]);

    useEffect(() => {
        if (checkFreshness()) {
            setIsStale(true);
            store.sync(tabKeys);
        }
    }, [checkFreshness, tabKeys]);

    return {
        data: tabKeys.map(k => (store as any)[k]),
        isLoading: store.isSyncing && isStale,
        isSyncing: store.isSyncing
    };
}
