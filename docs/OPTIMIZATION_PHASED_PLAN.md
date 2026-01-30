# Sheetsense Optimization Roadmap (v2.8.0)

This document outlines the phased strategy for refactoring the Sheetsense architecture to resolve performance bottlenecks identified in the v2.7.0 audit.

---

## Phase 1: Context Atomization & Selective Subscription
**Objective:** Decouple infrastructure, data, and volatile UI state to eliminate global re-render cycles.

### 1.1 Hook Decentralization
- **Refactor `FinancialContext.tsx`**: Stop merging `Protocol`, `Ledger`, and `Interface` providers into a single `combinedValue`.
- **Component Migration**: Update all views to consume granular hooks (`useProtocol`, `useLedger`, `useInterface`) instead of the monolithic `useFinancialStore`.
- **Memoization Audit**: Ensure that the `LedgerContext` only updates its provided value when the underlying data arrays actually change, not when UI state (like search query) toggles.

---

## Phase 2: Valuation Memoization & Temporal Caching
**Objective:** Move heavy multi-currency and price resolution logic out of the render loop.

### 2.1 Unified Valuation Buffer
- **Implement `useValuatedHoldings`**: A high-performance hook that computes CAD worth for all holdings once and stores it in a memoized buffer.
- **Aggregated Dashboard Stats**: Shift dashboard aggregate calculations to a background effect that populates a "Stat Buffer" on data change, rather than calculating on every render.

### 2.2 Chronos Resolution Cache
- **Timeline Indexing**: Refactor `buildUnifiedTimeline` in `temporalService.ts` to maintain an in-memory index.
- **Partial Updates**: When a user edits a single ledger cell, perform a targeted update on the timeline index instead of re-scanning all historical IndexedDB stores.

---

## Phase 3: Global Modal & Registry Abstraction
**Objective:** Centralize interaction logic and reduce component code duplication by ~40%.

### 3.1 Global Modal Orchestration
- **Centralized Dispatch**: Move all `editingItem` and `isModalOpen` states into `InterfaceContext`.
- **Type-Safe Modals**: Implement a `GlobalModalHost` in `App.tsx` that renders the appropriate registry modal based on the `globalModal` state.
- Ensure UI remains the same, even though bcakend consolidation occurs.

### 3.2 `ManagedRegistryView` HOC
- **Abstraction Layer**: Create a higher-order component that wraps `InstitutionalRegistryTable`.
- **Automated Logic**: This HOC will automatically handle:
    - Shift-Click selection logic.
    - Bulk delete/edit triggers.
    - Search filtering based on the `RegistrySchemas`.
    - "No Results" and "Loading" states.

---

## Phase 4: Computational Concurrency & Throttling
**Objective:** Ensure UI responsiveness during heavy I/O or rapid user interaction.

### 4.1 PDF Worker Migration
- **Worker Script**: Create `pdf.worker.ts` to handle the geometric reconstruction of bank statements.
- **Async Processing**: Update `StatementProcessor` to communicate with the worker via `postMessage`, keeping the "Neural Processing" animation at a smooth 60fps.

### 4.2 Discovery Throttling
- **Search Debounce**: Implement a 150ms debounce on the `GlobalSearchOverlay` query.
- **Index Pre-calculation**: Synthesize the `unifiedIndex` only after a successful sync or commit, rather than during the overlay's render cycle.

### 4.3 Sensory Gating
- **Haptic Buffer**: Update `HapticService.ts` to ignore pulse requests if the previous pulse was within 50ms.

---

## Phase 5: Audit & Validation
**Objective:** Verify performance gains and ensure zero regression in financial accuracy.

- **Render Count Profiling**: Use React DevTools to confirm that toggling the search overlay or ghost mode triggers zero re-renders in the Dashboard stats.
- **Large Dataset Stress Test**: Ingest 5+ years of historical data and verify that the "Strategic Cockpit" remains interactive during node dragging.
- **Cryptographic Integrity**: Verify that signed exports still validate correctly after the state atomization.

---
**Status:** Ready for Implementation.