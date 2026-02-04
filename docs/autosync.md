# Reactive Synchronization Engine (RSE) Implementation Plan

This document outlines the phased migration from a Manual-Push synchronization model to an Auto-Reactive state.

---

### Phase 1: Atomic Mutation Queue
Transition from simple boolean `isDirty` flags to a centralized, persistent transaction buffer.
- **Logic:** Implement a `MutationQueue` in IndexedDB.
- **Behavior:** Every local edit (add/edit/delete) pushes a Mutation Object (Action, Entity, Data, Timestamp) into the queue.
- **Visuals:** Add a "Pending Uplink" glyph to items in the queue.

### Phase 2: Background Uplink Orchestrator
Automate the "Commit Delta" process using a quiet-period observer.
- **Logic:** Debounce changes by 3 seconds. If the user stops interacting, initiate an uplink.
- **Backoff:** Implement exponential backoff for `GIO-429` (Quota) errors.
- **UX:** Status bar indicator switches to "Auto-Sync: Nominal."

### Phase 3: Stale-While-Revalidate (SWR) Subscriptions
Move away from full-sheet reloads on mount to granular, TTL-based data dependencies.
- **Logic:** Introduce `useFinancialData(['tabName'])` with a 5-minute TTL.
- **Optimistic UI:** Render from local cache immediately; update if remote data differs after a "Silent Pull."

### Phase 4: Off-Main-Thread Orchestration (Web Workers)
Prevent UI stutter by offloading heavy parsing and encryption tasks.
- **Logic:** Move `UniversalParser`, `UniversalWriter`, and `EVP Encryption` into a Web Worker.
- **Performance:** Maintain a locked 60fps UI thread even during large statement ingestions.

### Phase 5: Fingerprint Interlock (Conflict 2.0)
Advanced protection against multi-device state divergence.
- **Logic:** Fetch spreadsheet `versionId` or content hash before every uplink.
- **Resolution:** If fingerprints mismatch, pause the uplink and trigger the Conflict Resolution UI.

---

### Success Criteria
1. **Zero-Click Persistence:** Users no longer need to manually trigger "Commit Delta."
2. **Offline-Resilient:** Mutations queued in IndexedDB are automatically uplinked upon network restoration.
3. **Institutional Fluidity:** The application feels like a real-time collaborative editor while maintaining Local-First security.