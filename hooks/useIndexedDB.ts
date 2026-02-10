import { useState, useEffect, useCallback, useRef } from 'react';
import { AppError, IEP } from '../services/infrastructure/ErrorHandler';
import { getAppDB, DB_CONFIG } from '../services/infrastructure/DatabaseProvider';

const STORE_NAME = DB_CONFIG.APP.STORE;

const dbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await getAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new AppError(IEP.IDB.SCHEMA_DRIFT, `Failed to retrieve node: ${key}`, 'RECOVERABLE', request.error));
  });
};

const dbSet = async <T>(key: string, value: T): Promise<void> => {
  const db = await getAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      const err = request.error;
      const code = err?.name === 'QuotaExceededError' ? IEP.IDB.QUOTA_FULL : IEP.IDB.SCHEMA_DRIFT;
      reject(new AppError(code, `Failed to persist node: ${key}`, 'RECOVERABLE', err));
    };
  });
};

export function useIndexedDB<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const isLoadedRef = useRef(false);

  // Load from DB on mount
  useEffect(() => {
    let isMounted = true;
    dbGet<T>(key).then((val) => {
      if (isMounted) {
        if (val !== undefined) {
          setStoredValue(val);
        } else {
          // Initialize DB with default if missing
          dbSet(key, initialValue);
        }
        setLoaded(true);
        isLoadedRef.current = true;
      }
    }).catch(err => {
      console.error(`Error loading ${key} from IDB`, err);
      if (isMounted) {
        setLoaded(true);
        isLoadedRef.current = true;
      }
    });

    return () => { isMounted = false; };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    // CRITICAL FIX: Prevent writing if the database hasn't finished its initial read.
    // This prevents "Empty State Overwrites" which causes data to disappear on refresh.
    if (!isLoadedRef.current) {
      throw new AppError(IEP.IDB.LOAD_LOCK, `Blocked write to ${key}: DB initial load still in progress.`, 'SILENT');
    }

    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      // Fire and forget save
      dbSet(key, valueToStore).catch(e => console.error(`Failed to save ${key}`, e));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue, loaded];
}