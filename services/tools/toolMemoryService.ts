import { openDatabase, DB_CONFIG } from '../infrastructure/DatabaseProvider';

/**
 * Sheetsense AI Lab - Memory Layer
 * Uses centralized DatabaseProvider for durable, local-first knowledge base.
 */

const getAIDB = () => openDatabase(DB_CONFIG.AI.NAME, DB_CONFIG.AI.VERSION, DB_CONFIG.AI.STORE);

/**
 * Retrieves the full map of merchant-to-category associations.
 */
export const getMerchantMemory = async (): Promise<Record<string, string>> => {
  const db = await getAIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readonly');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.get('merchants');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || {});
  });
};

/**
 * Retrieves mappings from raw merchant names to canonical brand identities.
 */
export const getMerchantIdentities = async (): Promise<Record<string, string>> => {
  const db = await getAIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readonly');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.get('merchant_identities');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || {});
  });
};

/**
 * Saves a single merchant mapping.
 */
export const saveMerchantMemory = async (merchant: string, category: string) => {
  const memory = await getMerchantMemory();
  memory[merchant.toUpperCase()] = category;
  const db = await getAIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.put(memory, 'merchants');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves an identity mapping (e.g. WALMART NORTHHILL -> Walmart)
 */
export const saveMerchantIdentity = async (rawMerchant: string, canonicalName: string) => {
  const identities = await getMerchantIdentities();
  identities[rawMerchant.toUpperCase()] = canonicalName;
  const db = await getAIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.put(identities, 'merchant_identities');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves a batch of mappings, merging with existing memory.
 */
export const batchSaveMerchantMemory = async (mappings: Record<string, string>) => {
  const memory = await getMerchantMemory();
  const updated = { ...memory };
  Object.entries(mappings).forEach(([m, c]) => {
    updated[m.toUpperCase()] = c;
  });
  
  const db = await getAIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.put(updated, 'merchants');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves a batch of identities, merging with existing memory.
 */
export const batchSaveMerchantIdentities = async (mappings: Record<string, string>) => {
  const memory = await getMerchantIdentities();
  const updated = { ...memory };
  Object.entries(mappings).forEach(([m, id]) => {
    updated[m.toUpperCase()] = id;
  });
  
  const db = await getAIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.put(updated, 'merchant_identities');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Integration Bridge Mappings
 */
export const getIntegrationMappings = async (): Promise<Record<string, string>> => {
  const db = await getAIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readonly');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.get('integration_mappings');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || {});
  });
};

export const saveIntegrationMapping = async (statementCat: string, ledgerSubCat: string) => {
  const mappings = await getIntegrationMappings();
  mappings[statementCat.toUpperCase()] = ledgerSubCat;
  const db = await getAIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.AI.STORE, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.AI.STORE);
    const request = store.put(mappings, 'integration_mappings');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
