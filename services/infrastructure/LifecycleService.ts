import { ManagedEntity } from '../../types';

/**
 * SovereignLifecycle: The Entity State Authority
 * Centralizes standard lifecycle transformations like ID assignment and dirty flagging.
 */
export class SovereignLifecycle {
    /**
     * Prepares an entity for local persistence, ensuring technical metadata is normalized.
     */
    static prepare<T extends ManagedEntity>(item: Partial<T>, existing?: T): T {
        return {
            ...existing,
            ...item,
            id: item.id || existing?.id || crypto.randomUUID(),
            isDirty: true,
            rowIndex: item.rowIndex ?? existing?.rowIndex
        } as T;
    }

    /**
     * Clears the dirty flag after a successful cloud uplink.
     */
    static finalizeUplink<T extends ManagedEntity>(item: T): T {
        return { ...item, isDirty: false };
    }
}
