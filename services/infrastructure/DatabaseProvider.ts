import { AppError, IEP } from './ErrorHandler';

/**
 * Sheetsense Database Provider
 * Centralized authority for IndexedDB connections.
 */

export const DB_CONFIG = {
  APP: {
    NAME: 'FinTrackDB',
    VERSION: 1,
    STORE: 'app_state'
  },
  AI: {
    NAME: 'StatementInsightsDB',
    VERSION: 2,
    STORE: 'knowledge_base'
  }
};

/**
 * Unified DB Opener
 */
export const openDatabase = (name: string, version: number, storeName: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new AppError(IEP.IDB.SCHEMA_DRIFT, `Hardware handshake failed for ${name}`, 'CRITICAL', request.error));
  });
};

/**
 * Standard App DB shortcut
 */
export const getAppDB = () => openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
