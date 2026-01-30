import { findVaultFile, uploadVaultFile, downloadVaultFile } from './cloudSyncService';
import { ArchiveMeta, UserProfile, VaultEnvelope } from '../types';
import { generateSignature, getVaultSalt, encryptVault, decryptVault, bytesToBase64 } from './cryptoService';
import { extractSheetId } from './sheetService';
import { AppError, IEP } from './infrastructure/ErrorHandler';
import { getAppDB, openDatabase, DB_CONFIG } from './infrastructure/DatabaseProvider';

/**
 * Gathers data and applies the EVP (Encrypted Vault Protocol)
 */
const getVaultPayload = async (sheetId: string, userSub?: string, userEmail?: string): Promise<VaultEnvelope> => {
  const appDb = await getAppDB();
  const appTx = appDb.transaction(DB_CONFIG.APP.STORE, 'readonly');
  const appStore = appTx.objectStore(DB_CONFIG.APP.STORE);
  
  const values = await new Promise<any[]>((res) => {
    const req = appStore.getAll();
    req.onsuccess = () => res(req.result);
  });

  const keys = await new Promise<IDBValidKey[]>((res) => {
    const req = appStore.getAllKeys();
    req.onsuccess = () => res(req.result);
  });

  const ledgerPayload: Record<string, any> = {};
  keys.forEach((key, index) => {
    const keyStr = String(key);
    if (keyStr.startsWith('fintrack_')) {
      ledgerPayload[keyStr] = values[index];
    }
  });

  const aiMemory: VaultEnvelope['ai_memory'] = {};
  try {
    const aiDb = await openDatabase(DB_CONFIG.AI.NAME, DB_CONFIG.AI.VERSION, DB_CONFIG.AI.STORE);
    const aiTx = aiDb.transaction(DB_CONFIG.AI.STORE, 'readonly');
    const aiStore = aiTx.objectStore(DB_CONFIG.AI.STORE);
    
    const merchantsReq = aiStore.get('merchants');
    aiMemory.merchants = await new Promise(res => {
        merchantsReq.onsuccess = () => res(merchantsReq.result || {});
        merchantsReq.onerror = () => res({});
    });

    const identitiesReq = aiStore.get('merchant_identities');
    aiMemory.merchant_identities = await new Promise(res => {
        identitiesReq.onsuccess = () => res(identitiesReq.result || {});
        identitiesReq.onerror = () => res({});
    });

    const bridgeReq = aiStore.get('integration_mappings');
    aiMemory.integration_mappings = await new Promise(res => {
        bridgeReq.onsuccess = () => res(bridgeReq.result || {});
        bridgeReq.onerror = () => res({});
    });
  } catch (e) {
    console.warn("AI Knowledge Base not found, skipping deep memory scan.");
  }

  const cleanId = extractSheetId(sheetId);
  const userIdentitySeed = userSub || await getVaultSalt();
  
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  const kdfSalt = bytesToBase64(saltBuffer);
  
  const cleartextData = JSON.stringify({
    payload: ledgerPayload,
    ai_memory: aiMemory
  });

  const { ciphertext, iv } = await encryptVault(cleartextData, userIdentitySeed + cleanId, kdfSalt);

  const signature = await generateSignature({ ciphertext }, userIdentitySeed, cleanId);

  return {
    integrity: {
      signature,
      algorithm: "AES-GCM-256",
      version: "2.7.0",
      origin_hint: userEmail || 'local-vault',
      sheet_id: cleanId,
      timestamp: new Date().toISOString(),
      iv,
      salt: kdfSalt
    },
    encrypted_payload: ciphertext
  };
};

export const exportBackup = async (sheetId: string, userSub?: string, userEmail?: string) => {
  if (!sheetId) throw new Error("Active Sheet ID required for signed export.");
  const vault = await getVaultPayload(sheetId, userSub, userEmail);
  
  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = vault.integrity.timestamp.split('T')[0];
  link.href = url;
  link.download = `Sheetsense_Vault_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const db = await getAppDB();
  const tx = db.transaction(DB_CONFIG.APP.STORE, 'readwrite');
  tx.objectStore(DB_CONFIG.APP.STORE).put(vault.integrity.timestamp, 'fintrack_last_backup_at');
};

export type ValidationResult = 'valid' | 'corrupted' | 'identity_mismatch';

export const validateVault = async (jsonString: string, currentSheetId: string, currentUserSub?: string): Promise<{ 
    status: ValidationResult, 
    envelope: VaultEnvelope 
}> => {
    try {
        const envelope: VaultEnvelope = JSON.parse(jsonString);
        if (!envelope.integrity || !envelope.encrypted_payload || !envelope.integrity.iv || !envelope.integrity.salt) {
            throw new Error("EVP Protocol Error: Vault is unencrypted or legacy. Import blocked.");
        }

        const cleanCurrentId = extractSheetId(currentSheetId);
        const userIdentitySeed = currentUserSub || await getVaultSalt();

        try {
            const decryptedStr = await decryptVault(
                envelope.encrypted_payload, 
                userIdentitySeed + cleanCurrentId, 
                envelope.integrity.salt, 
                envelope.integrity.iv
            );
            const decryptedData = JSON.parse(decryptedStr);
            return { 
                status: 'valid', 
                envelope: { ...envelope, payload: decryptedData.payload, ai_memory: decryptedData.ai_memory } 
            };
        } catch (decryptErr) {
            return { status: 'identity_mismatch', envelope };
        }
    } catch (e) {
        // Robust message extraction to ensure "EVP Protocol Error" is caught by tests
        const msg = (e && typeof e === 'object' && 'message' in e) ? (e as Error).message : "PARSE_ERROR: Could not read backup file.";
        throw new AppError(IEP.DMN.EVP_DECRYPT_FAIL, msg, 'RECOVERABLE', e);
    }
};

export const processAndValidateBackup = async (
  file: File, 
  currentSheetId: string, 
  currentUserSub?: string
): Promise<{ status: ValidationResult, envelope: VaultEnvelope }> => {
  const content = await file.text();
  return await validateVault(content, currentSheetId, currentUserSub);
};

export const finalizeImport = async (envelope: VaultEnvelope) => {
    if (!envelope.payload) throw new Error("VAULT_EMPTY: No payload to hydrate.");
    
    const appDb = await getAppDB();
    const appTx = appDb.transaction(DB_CONFIG.APP.STORE, 'readwrite');
    const appStore = appTx.objectStore(DB_CONFIG.APP.STORE);

    Object.entries(envelope.payload).forEach(([key, val]) => {
      appStore.put(val, key);
    });
    
    const now = new Date().toISOString();
    appStore.put(now, 'fintrack_last_backup_at');
    appStore.put(now, 'fintrack_last_cloud_sync_at');

    const appDone = new Promise<void>((resolve, reject) => {
      appTx.oncomplete = () => resolve();
      appTx.onerror = () => reject(appTx.error);
    });

    let aiDone = Promise.resolve();
    if (envelope.ai_memory && Object.keys(envelope.ai_memory).length > 0) {
        aiDone = (async () => {
            try {
                const aiDb = await openDatabase(DB_CONFIG.AI.NAME, DB_CONFIG.AI.VERSION, DB_CONFIG.AI.STORE);
                const aiTx = aiDb.transaction(DB_CONFIG.AI.STORE, 'readwrite');
                const aiStore = aiTx.objectStore(DB_CONFIG.AI.STORE);
                
                if (envelope.ai_memory?.merchants) aiStore.put(envelope.ai_memory.merchants, 'merchants');
                if (envelope.ai_memory?.merchant_identities) aiStore.put(envelope.ai_memory.merchant_identities, 'merchant_identities');
                if (envelope.ai_memory?.integration_mappings) aiStore.put(envelope.ai_memory.integration_mappings, 'integration_mappings');

                return new Promise<void>((resolve, reject) => {
                    aiTx.oncomplete = () => resolve();
                    aiTx.onerror = () => reject(aiTx.error);
                });
            } catch (e) {
                console.warn("Failed to restore AI memory", e);
            }
        })();
    }

    await Promise.all([appDone, aiDone]);
};

export const syncToCloud = async (sheetId: string, userSub?: string, userEmail?: string) => {
  if (!userSub) throw new Error("IDENTITY_REQUIRED");
  const vault = await getVaultPayload(sheetId, userSub, userEmail);
  const existingFile = await findVaultFile();
  await uploadVaultFile(vault, existingFile?.id);
  
  const timestamp = new Date().toISOString();
  const db = await getAppDB();
  const tx = db.transaction(DB_CONFIG.APP.STORE, 'readwrite');
  tx.objectStore(DB_CONFIG.APP.STORE).put(timestamp, 'fintrack_last_cloud_sync_at');
  return timestamp;
};

export const restoreFromCloud = async (currentSheetId: string, currentUserSub?: string) => {
  const existingFile = await findVaultFile();
  if (!existingFile) throw new Error("No vault file found on Drive.");
  const content = await downloadVaultFile(existingFile.id);
  const validation = await validateVault(content, currentSheetId, currentUserSub);
  if (validation.status !== 'valid') throw new AppError(IEP.DMN.EVP_DECRYPT_FAIL, "Cloud restore blocked: Cryptographic verification failed.");
  await finalizeImport(validation.envelope);
  return new Date().toISOString();
};

export const performCloudVaultSync = async (sheetId: string, user: UserProfile | null) => {
  if (!user) throw new Error("IDENTITY_REQUIRED");
  return await syncToCloud(sheetId, user.sub, user.email);
};

export const performCloudVaultRestore = async (sheetId: string, user: UserProfile | null) => {
  if (!user) throw new Error("IDENTITY_REQUIRED");
  return await restoreFromCloud(sheetId, user.sub);
};

export const wipeLocalDatabase = () => {
    return new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_CONFIG.APP.NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

export const getArchiveManagementList = async (): Promise<(ArchiveMeta & { hasDetails: boolean })[]> => {
  const db = await getAppDB();
  const tx = db.transaction(DB_CONFIG.APP.STORE, 'readonly');
  const store = tx.objectStore(DB_CONFIG.APP.STORE);

  return new Promise((resolve) => {
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result.map(String);
      const yearMap = new Map<number, { records: number, hasDetails: boolean }>();
      let globalRecords = 0;

      keys.forEach(key => {
        const match = key.match(/fintrack_(income|expenses|detailed_income|detailed_expenses)_(\d{4})/);
        if (match) {
          const year = parseInt(match[2]);
          const current = yearMap.get(year) || { records: 0, hasDetails: false };
          current.records += 1;
          if (key.includes('detailed_')) current.hasDetails = true;
          yearMap.set(year, current);
        } else if (key === 'fintrack_tax_records') {
            globalRecords += 1;
        }
      });

      const archives = Array.from(yearMap.entries()).map(([year, stats]) => ({
        year, records: stats.records, hasDetails: stats.hasDetails, lastUpdated: new Date().toISOString()
      })).sort((a, b) => b.year - a.year);

      if (globalRecords > 0) archives.push({ year: 0, records: globalRecords, hasDetails: true, lastUpdated: new Date().toISOString() });
      resolve(archives);
    };
  });
};

export const deleteLocalYear = async (year: number) => {
  const db = await getAppDB();
  const tx = db.transaction(DB_CONFIG.APP.STORE, 'readwrite');
  const store = tx.objectStore(DB_CONFIG.APP.STORE);
  if (year === 0) {
      store.delete('fintrack_tax_records');
      return;
  }
  [`fintrack_income_${year}`, `fintrack_expenses_${year}`, `fintrack_detailed_income_${year}`, `fintrack_detailed_expenses_${year}`]
    .forEach(key => store.delete(key));
};