import { AppError, IEP } from './ErrorHandler';

/**
 * Sheetsense Database Provider
 * Centralized authority for IndexedDB connections.
 */

export const DB_CONFIG = {
  APP: {
    NAME: 'FinTrackDB',
    VERSION: 2, // Incremented for new RSE stores
    STORE: 'app_state'
  },
  AI: {
    NAME: 'StatementInsightsDB',
    VERSION: 2,
    STORE: 'knowledge_base'
  },
  SYNC: {
    MUTATIONS: 'mutation_queue',
    METADATA: 'sync_metadata'
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
      
      // Legacy app_state
      if (!db.objectStoreNames.contains(DB_CONFIG.APP.STORE)) {
        db.createObjectStore(DB_CONFIG.APP.STORE);
      }
      
      // RSE Stores
      if (!db.objectStoreNames.contains(DB_CONFIG.SYNC.MUTATIONS)) {
        db.createObjectStore(DB_CONFIG.SYNC.MUTATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DB_CONFIG.SYNC.METADATA)) {
        db.createObjectStore(DB_CONFIG.SYNC.METADATA, { keyPath: 'tab' });
      }
      
      // AI Store
      if (name === DB_CONFIG.AI.NAME && !db.objectStoreNames.contains(storeName)) {
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