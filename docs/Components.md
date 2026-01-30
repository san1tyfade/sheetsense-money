# Sheetsense Architecture & Component Registry

Sheetsense is an institutional-grade personal finance orchestration platform built with a local-first philosophy. This document provides a high-level overview of the application's component hierarchy and functional domains.

## 1. Core Application Shell
These components manage the global layout, navigation, and state-driven interface layers.

*   **`App.tsx`**: Root orchestrator managing layout, theme (Dark/Ghost mode), and global modal states.
*   **`Navigation.tsx`**: Dynamic sidebar/bottom-bar housing the "Directorate" navigation system and global sync controls.
*   **`ViewDispatcher.tsx`**: The primary router that renders views based on internal application state.
*   **`GlobalSearchOverlay.tsx`**: Command-palette interface (triggered by `/`) supporting NLP commands for rapid data entry.
*   **`MobileSearchFAB.tsx`**: Context-aware floating action button for mobile discovery.
*   **`GuidedTour.tsx`**: Onboarding system for first-time user initialization.

## 2. Principal Intelligence Views
Primary functional screens for data visualization and management.

*   **`Dashboard.tsx`**: The financial nerve center displaying net worth aggregates, allocation charts, and temporal trends.
*   **`AssetsList.tsx`**: Inventory matrix for physical and digital holdings.
*   **`InvestmentsList.tsx`**: Portfolio core focusing on securities, live quotes, and account-level allocations.
*   **`TradesList.tsx`**: Historical event ledger recording BUY/SELL interaction sequences.
*   **`IncomeView.tsx`**: Cash flow hub providing both visual analysis and granular ledger editing.
*   **`SpendView.tsx`**: Interface for the neural statement processor and outflow auditing.
*   **`AnalyticsView.tsx`**: Deep-scan engine for comparative flow analysis and portfolio attribution.
*   **`InformationView.tsx`**: Registry for bank metadata, recurring commitments, and tax room tracking.
*   **`DataIngest.tsx`**: System infrastructure settings and local vault management.
*   **`JournalView.tsx`**: Chronological audit trail of all verified cash flow transactions.

## 3. Specialized Modules

### Cockpit (Simulation Engine)
*   **`cockpit/CockpitView.tsx`**: Environment for running wealth trajectory simulations.
*   **`cockpit/StrategicSankey.tsx`**: Draggable Sankey diagram for real-time income/expense shift modeling.
*   **`cockpit/StrategicControls.tsx`**: Scalar inputs for growth rates, scalars, and life event triggers.
*   **`cockpit/ProjectionChart.tsx`**: Visualizes long-term outcomes and Financial Independence (FI/RE) milestones.

### Processing & Utilities
*   **`tools/StatementProcessor.tsx`**: Drop-zone for bank statement PDFs with neural classification logic.
*   **`tools/StatementDashboard.tsx`**: Immediate visual audit of statement contents before committing to the ledger.
*   **`tools/LedgerIntegrationModal.tsx`**: Bridge for mapping statement categories to logical ledger cells.
*   **`MortgageModule.tsx`**: Advanced debt optimization tool analyzing interest reduction and renewal shocks.

## 4. Core UI Primitives (`components/core-ui/`)
Atomic design units ensuring visual and functional consistency.

*   **`InstitutionalTable.tsx`**: The standard high-density data container.
*   **`InstitutionalRegistryTable.tsx`**: Enhanced table with multi-selection and CRUD interaction patterns.
*   **`InstitutionalStatCard.tsx`**: Unit for displaying atomic metrics with trend indicators.
*   **`ManagedViewHeader.tsx`**: Unified header containing search, filters, and layout toggles.
*   **`PrivacyValue.tsx`**: Secure number wrapper that respects global "Ghost Mode" blurring rules.
*   **`GlassCard.tsx`**: Backdrop-blur layout primitive with hover-glow effects.
*   **`NotificationHost.tsx`**: Global queue for system status alerts and uplink logs.
*   **`ConflictResolutionModal.tsx`**: Interface for managing local-first vs. cloud data mismatches.

## 5. Domain-Specific Components
Localized UI patterns for core data types.

*   **`assets/AssetCard.tsx`**: Visual card representation for inventory nodes.
*   **`investments/InvestmentAllocationCard.tsx`**: Segment weight displays for the portfolio core.
*   **`trades/TradeAssetAccordion.tsx`**: Collapsible historical trail grouped by asset identity.
*   **`income/IncomeLedger.tsx`**: Industrial-grade editable matrix for cash flow maintenance.
*   **`information/TaxRoomTracker.tsx`**: Regulatory logic visualizer for registered account capacity.