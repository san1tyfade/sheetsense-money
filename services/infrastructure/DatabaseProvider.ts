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

const connections = new Map<string, IDBDatabase>();
const pendingConnections = new Map<string, Promise<IDBDatabase>>();

/**
 * Unified DB Opener with Singleton Pattern
 */
export const openDatabase = (name: string, version: number, storeName: string): Promise<IDBDatabase> => {
  // Return existing connection if valid
  if (connections.has(name)) {
    return Promise.resolve(connections.get(name)!);
  }

  // Deduplicate inflight connection requests
  if (pendingConnections.has(name)) {
    return pendingConnections.get(name)!;
  }

  const connectionPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onclose = () => {
        console.warn(`Database ${name} connection closed unexpectedly.`);
        connections.delete(name);
      };

      db.onversionchange = () => {
        console.warn(`Database ${name} version change detected. Closing connection.`);
        db.close();
        connections.delete(name);
      };

      connections.set(name, db);
      pendingConnections.delete(name);
      resolve(db);
    };

    request.onerror = () => {
      pendingConnections.delete(name);
      reject(new AppError(IEP.IDB.SCHEMA_DRIFT, `Hardware handshake failed for ${name}`, 'CRITICAL', request.error));
    };
  });

  pendingConnections.set(name, connectionPromise);
  return connectionPromise;
};

/**
 * Standard App DB shortcut
 */
export const getAppDB = () => openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
