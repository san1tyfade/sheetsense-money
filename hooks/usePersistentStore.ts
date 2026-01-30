import { useRef, useState, useEffect, useCallback } from 'react';
import { useIndexedDB } from './useIndexedDB';

/**
 * A wrapper around useIndexedDB that manages a unified state object.
 * Allows subscribing to the whole store but provides granular update methods.
 */
export function usePersistentStore<T extends object>(key: string, initialState: T) {
    // We leverage the existing reliable primitive.
    // In a real Redux-like implementation we might want manual partial updates,
    // but for this scale, writing the whole state object on change is acceptable 
    // provided the object isn't massive (MBs).
    // If performance becomes an issue, we can split keys.
    const [store, setStore, isLoaded] = useIndexedDB<T>(key, initialState);

    const update = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
        setStore(prev => {
            const changes = typeof updates === 'function' ? updates(prev) : updates;
            return { ...prev, ...changes };
        });
    }, [setStore]);

    return { store, update, isLoaded };
}
