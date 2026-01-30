# Sheetsense Runtime Core Documentation

This document details the logic layer of the Sheetsense application, specifically focusing on the state orchestration and functional hooks that drive the local-first architecture.

## Context Registry

### `context/FinancialContext.tsx`
**The Sovereign State Hub.**  
This is the central orchestrator for the entire application. It maintains the global state for all financial data (assets, trades, income, etc.) and system preferences.
- **Persistence:** Utilizes `useIndexedDB` to ensure all state survives browser restarts.
- **Sync Management:** Exposes the high-level `sync` and `commitDelta` functions to bridge local hardware with Google Sheets.
- **UI Services:** Manages global modals, navigation views, notifications, and the "Ghost Mode" privacy state.
- **Data Derivation:** Performs real-time reconciliation of investments and computes the unified transaction timeline.

---

## Hooks Registry

### `hooks/useIndexedDB.ts`
**Persistence Primitive.**  
A low-level hook that provides a React-friendly interface for `indexedDB`.
- **Safety:** Implements an "Initial Load Lock" to prevent empty state from overwriting existing local data during application boot.
- **Durable State:** Acts as a persistent alternative to `useState` for large data structures.

### `hooks/useFinanceSync.ts`
**Cloud Connectivity Engine.**  
Handles the complex networking logic between the browser and the Google Sheets API.
- **Discovery:** Scans the linked spreadsheet for historical archive tabs.
- **Conflict Detection:** Monitors timestamps to identify when remote data has changed independently of the local instance.
- **Parsing:** Routes raw CSV data through the appropriate deterministic parsers.

### `hooks/useFinancialActions.ts`
**Business Logic Orchestrator.**  
Aggregates basic CRUD controllers into high-level domain actions.
- **Ledger Control:** Manages specific cell-level updates for the Income and Expense matrices.
- **Journaling:** Handles the batch-archiving of processed bank statements into the historical journal.
- **Bulk Sync:** Provides the "Uplink All" functionality to push all local deltas to the cloud in one sequence.

### `hooks/useEntityController.ts`
**Generic CRUD Authority.**  
A reusable controller for standard data registries (Assets, Subscriptions, Bank Accounts).
- **Local-First:** Updates the local state immediately and marks the entity as "Dirty" (pending uplink).
- **Cloud Bridge:** Manages the row-level insertion and deletion logic for the spreadsheet.

### `hooks/useSelection.ts`
**Interaction Manager.**  
Provides robust multi-item selection logic for tables and lists.
- **Shift+Click:** Supports industry-standard range selection.
- **Sensory Feedback:** Integrated with the Haptic Service to provide mechanical clicks during selection.

### `hooks/usePriceEngine.ts`
**Market Intelligence Layer.**  
Manages live quote fetching for stocks and cryptocurrencies.
- **Caching:** Implements a 5-minute TTL to minimize API overhead.
- **Auto-Discovery:** Scans all user holdings to determine which tickers require live tracking.

### `hooks/useSearchProtocol.ts`
**UI Pattern Hook.**  
Manages the state and focus logic for the expanding "Universal Discovery" search bars found in view headers.

### `hooks/useViewControls.ts`
**Data Transformation Hook.**  
Standardizes the filtering, sorting, and view-mode (Table vs Grid) logic for list-based screens like Assets and Trades.

### `hooks/useTabValidation.ts`
**Infrastructure Guard.**  
Asynchronously verifies the existence and accessibility of specific spreadsheet tabs to prevent application errors during synchronization.

### `hooks/useChartTheme.ts`
**Visual Logic Hub.**  
Provides a centralized theme object for Recharts components that dynamically reacts to the global Dark Mode state.