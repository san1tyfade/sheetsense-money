import { Mutation, SyncConflict, SyncMetadata, SheetConfig } from '../../types';
import { openDatabase, DB_CONFIG } from '../infrastructure/DatabaseProvider';
import { commitItemToSheet, deleteRowFromSheet } from '../sheetWriteService';
import { googleClient } from '../infrastructure/GoogleClient';
import { IEP } from '../infrastructure/ErrorHandler';

const QUIET_PERIOD = 3000;
let retryCount = 0;

export type RSEStatus = {
    count: number;
    isSyncing: boolean;
    lastEventId: string | null;
};

export type RSEEvent = 
    | { type: 'MUTATION_SUCCESS'; id: string; entity: string }
    | { type: 'QUEUE_STATUS'; count: number; isSyncing: boolean }
    | { type: 'CONFLICT'; conflict: SyncConflict };

export class RSEEngine {
    private static instance: RSEEngine;
    private isTransmitting = false;
    private pendingCount = 0;
    private lastEventId: string | null = null;
    private timer: any = null;
    private listeners: Set<() => void> = new Set();
    private eventListeners: Set<(ev: RSEEvent) => void> = new Set();

    private constructor() {
        this.refreshCount();
    }

    public static getInstance(): RSEEngine {
        if (!RSEEngine.instance) RSEEngine.instance = new RSEEngine();
        return RSEEngine.instance;
    }

    private async refreshCount() {
        this.pendingCount = await this.getPendingCount();
        this.notifySubscribers();
    }

    /**
     * React 19 Subscription Pattern
     */
    public subscribe = (onStoreChange: () => void) => {
        this.listeners.add(onStoreChange);
        return () => { this.listeners.delete(onStoreChange); };
    }

    /**
     * Event-based Subscription for Side-effects (Notifications/Conflicts)
     */
    public subscribeToEvents(cb: (ev: RSEEvent) => void) {
        this.eventListeners.add(cb);
        return () => { this.eventListeners.delete(cb); };
    }

    public getSnapshot = (): RSEStatus => {
        return {
            count: this.pendingCount,
            isSyncing: this.isTransmitting,
            lastEventId: this.lastEventId
        };
    }

    private notifySubscribers() {
        this.listeners.forEach(cb => cb());
    }

    private broadcast(ev: RSEEvent) {
        this.lastEventId = crypto.randomUUID();
        this.eventListeners.forEach(cb => cb(ev));
        if (ev.type === 'QUEUE_STATUS') {
            this.pendingCount = ev.count;
            this.isTransmitting = ev.isSyncing;
        }
        this.notifySubscribers();
    }

    public async push(mutation: Mutation) {
        const db = await openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
        const tx = db.transaction(DB_CONFIG.SYNC.MUTATIONS, 'readwrite');
        tx.objectStore(DB_CONFIG.SYNC.MUTATIONS).put(mutation);
        
        await this.refreshCount();
        this.broadcast({ type: 'QUEUE_STATUS', count: this.pendingCount, isSyncing: this.isTransmitting });
        this.scheduleUplink();
    }

    private scheduleUplink() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.processQueue(), QUIET_PERIOD);
    }

    public async processQueue() {
        if (this.isTransmitting) return;
        
        const db = await openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
        const tx = db.transaction(DB_CONFIG.SYNC.MUTATIONS, 'readonly');
        const mutations = await new Promise<Mutation[]>((res) => {
            const req = tx.objectStore(DB_CONFIG.SYNC.MUTATIONS).getAll();
            req.onsuccess = () => res(req.result || []);
        });

        if (mutations.length === 0) {
            this.broadcast({ type: 'QUEUE_STATUS', count: 0, isSyncing: false });
            return;
        }

        this.isTransmitting = true;
        this.broadcast({ type: 'QUEUE_STATUS', count: mutations.length, isSyncing: true });

        try {
            for (const m of mutations) {
                await this.executeMutation(m);
                this.broadcast({ type: 'MUTATION_SUCCESS', id: m.id, entity: m.entity });
            }
            retryCount = 0;
        } catch (e: any) {
            this.handleError(e);
        } finally {
            this.isTransmitting = false;
            const count = await this.getPendingCount();
            this.broadcast({ type: 'QUEUE_STATUS', count, isSyncing: false });
            if (count > 0) this.scheduleUplink();
        }
    }

    private async executeMutation(m: Mutation) {
        const db = await openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
        
        const configTx = db.transaction(DB_CONFIG.APP.STORE, 'readonly');
        const config = await new Promise<SheetConfig | undefined>((res) => {
            const req = configTx.objectStore(DB_CONFIG.APP.STORE).get('fintrack_sheet_config');
            req.onsuccess = () => res(req.result);
        });

        const sheetId = config?.sheetId;
        const tabName = config?.tabNames[m.entity];

        if (!sheetId || !tabName) return;

        const metaTx = db.transaction(DB_CONFIG.SYNC.METADATA, 'readonly');
        const localMeta = await new Promise<SyncMetadata | undefined>((res) => {
            const req = metaTx.objectStore(DB_CONFIG.SYNC.METADATA).get(m.entity);
            req.onsuccess = () => res(req.result);
        });

        const fileMeta = await googleClient.request(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=modifiedTime`);
        const remoteModifiedTime = fileMeta.modifiedTime;

        if (localMeta && localMeta.lastSyncTimestamp && remoteModifiedTime > localMeta.lastSyncTimestamp) {
             const conflict: SyncConflict = {
                tab: m.entity,
                localTimestamp: localMeta.lastSyncTimestamp,
                remoteTimestamp: remoteModifiedTime,
                dirtyCount: await this.getPendingCount()
            };
            this.broadcast({ type: 'CONFLICT', conflict });
            throw new Error("CONFLICT_DETECTED");
        }

        try {
            if (m.action === 'UPSERT') {
                await commitItemToSheet(sheetId, tabName, m.data, m.entity);
            } else if (m.action === 'DELETE' && m.data.rowIndex !== undefined) {
                await deleteRowFromSheet(sheetId, tabName, m.data.rowIndex);
            }

            const postWriteMeta = await googleClient.request(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=modifiedTime`);
            const updateMetaTx = db.transaction(DB_CONFIG.SYNC.METADATA, 'readwrite');
            updateMetaTx.objectStore(DB_CONFIG.SYNC.METADATA).put({
                tab: m.entity,
                lastSyncTimestamp: postWriteMeta.modifiedTime,
                lastSyncHash: 'verified'
            });

            const delTx = db.transaction(DB_CONFIG.SYNC.MUTATIONS, 'readwrite');
            delTx.objectStore(DB_CONFIG.SYNC.MUTATIONS).delete(m.id);
        } catch (e: any) {
            throw e;
        }
    }

    private handleError(e: any) {
        if (e.code === IEP.GIO.QUOTA_LIMIT) {
            const backoff = Math.pow(2, retryCount) * 5000;
            retryCount++;
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => this.processQueue(), backoff);
        } else if (e.message !== "CONFLICT_DETECTED") {
            console.error("[RSE] Critical Logic Fault:", e);
        }
    }

    public async getPendingCount(): Promise<number> {
        const db = await openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);
        const tx = db.transaction(DB_CONFIG.SYNC.MUTATIONS, 'readonly');
        return new Promise((res) => {
            const req = tx.objectStore(DB_CONFIG.SYNC.MUTATIONS).count();
            req.onsuccess = () => res(req.result || 0);
        });
    }

    public trigger() {
        this.processQueue();
    }
}

export const rse = RSEEngine.getInstance();
