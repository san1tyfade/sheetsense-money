# Sheetsense Technical Audit & Optimization Roadmap (v2.7.0)

## 1. Audit Summary
A comprehensive audit of the Sheetsense v2.7.0 architecture was performed to identify areas for abstraction, performance bottlenecks, and redundant logic. The application is structurally sound but exhibits signs of "God Object" patterns in state management and could benefit from metadata-driven UI primitives.

---

## 2. Structural Abstractions (Redundancy Reduction)

### A. Dynamic Registry Forms
*   **Finding:** Discrete modals for Assets, Trades, Subscriptions, and Accounts contain ~80% duplicated Tailwind and state logic.
*   **Recommendation:** Implement a `DynamicRegistryForm` that consumes `RegistrySchemas.ts`. Use the schema to drive input types, validation, and mapping automatically.

### B. Sovereign Action Hook
*   **Finding:** Repetitive `try/catch`, `setIsSubmitting`, and `notify` patterns in every entity controller.
*   **Recommendation:** Create a higher-order `useSovereignAction` hook to encapsulate the lifecycle of a local-first mutation (Notification -> Cache Update -> Cloud Uplink).

### C. Unified Perspective Headers
*   **Finding:** Inconsistent header implementations across Dashboard, Cockpit, and Registry views.
*   **Recommendation:** Merge `ViewHeader` and `ManagedViewHeader` into a single `PerspectiveHeader` primitive with "Feature Slots" for Search, Time Context, and View Toggles.

---

## 3. Performance & Rendering Strategy

### A. Context Fragmentation (God Context Resolution)
*   **Finding:** `FinancialContext.tsx` triggers global re-renders for volatile UI states (like search toggles) that shouldn't affect heavy data components.
*   **Recommendation:** Split into three distinct contexts:
    1.  `ProtocolContext`: Infrastructure (Sync, Auth, Config).
    2.  `LedgerContext`: Pure financial data arrays.
    3.  `InterfaceContext`: Volatile UI state (Ghost mode, Sidebar, Search).

### B. Valuation Memoization
*   **Finding:** Asset valuations (CAD conversion + Live price resolution) are often performed inside the render cycle of list items.
*   **Recommendation:** Pre-calculate a `ValuatedHolding` map during sync or when live prices update. Store the results in a memoized buffer to prevent O(n) calculations on every frame.

### C. Level of Detail (LOD) Downsampling
*   **Finding:** Large datasets in `NetWorthChart` and `StrategicSankey` degrade performance during interactive drags.
*   **Recommendation:** Implement a LOD filter in `temporalService.ts` to downsample daily/weekly logs into monthly medians when viewing "Full History" horizons.

---

## 4. Logic & Efficiency "Easy Wins"

### A. Throttling & Debouncing
*   **Price Engine:** Add 500ms debounce to ticker observation to batch quote requests.
*   **Haptics:** Implement a 50ms time-gate on mechanical pulses to prevent "muddy" feedback during rapid interactions (e.g., Sankey dragging).

### B. Global Search Indexing
*   **Finding:** Search performs individual `.filter()` passes on 6+ large arrays on every keystroke.
*   **Recommendation:** Implement a `useMemo`-based flat search index. Map all entities to a `SearchNode` interface once, and perform a single filter pass.

### C. Off-Main-Thread Processing
*   **Finding:** PDF geometric reconstruction can lock the UI thread for 1-2 seconds on large statements.
*   **Recommendation:** Migrate `parsePdfStatement` in `pdfParser.ts` to a Web Worker.

---

## 5. Purge Registry (Confirmed Dead Code)

The following files/properties were identified as redundant and slated for removal:

*   **Files:**
    *   `services/geminiService.ts` (Consolidated into IntelligenceProvider)
    *   `services/parsers/investmentParsers.ts` (Handled by UniversalParser)
    *   `services/parsers/journalParser.ts` (Handled by UniversalParser)
    *   `services/tools/csvExport.ts` (Orphaned utility)
    *   `components/assets/AssetTableView.tsx` (Replaced by InstitutionalRegistryTable)
    *   `services/assets/assetService.ts` (Replaced by useViewControls)

*   **Logic:**
    *   `TaxRecord['accountFund']`: Orphaned property.
    *   `financialMath.ts` -> `calculateDietzReturn`: Redundant wrapper.
    *   `useFinancialActions.ts` -> `uplinkAll`: Unused export.

---
*Audit conducted: Feb 2025*