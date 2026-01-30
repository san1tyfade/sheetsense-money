# Implementation Plan: Architectural Abstractions

This document outlines the transition of Sheetsense from hard-coded registries to a metadata-driven architecture. The goal is to reduce redundancy and centralize logic while maintaining the exact visual style of version 2.7.0.

## 1. Metadata Enhancement (`config/RegistrySchemas.ts`)
The existing schema definitions will be extended to include visual metadata.
- **`uiType`**: Maps to specific input components (`text`, `number`, `date`, `select`, `toggle`, `ticker`, `textarea`).
- **`gridSpan`**: Controls layout (1 for half-width, 2 for full-width).
- **`options`**: Provides static or dynamic choices for select inputs.
- **`placeholder`**: Ghost text for inputs.

## 2. Generic Form Engine (`components/core-ui/SovereignForm.tsx`)
A new component that iterates over a `SchemaDefinition` to generate a functional UI.
- **State Management**: Uses a single object state derived from the schema fields.
- **Validation**: Enforces `required` and type constraints.
- **Style Preservation**: Uses the exact Tailwind classes from existing modals to ensure pixel-perfect consistency.
- **Computed Logic**: Supports field-level change listeners for complex calculations (e.g., Trade Settlement).

## 3. Sovereign Action Hook (`hooks/useSovereignAction.ts`)
A higher-order hook to replace manual CRUD orchestration in `useFinancialActions.ts`.
- **Lifecycle**: Optimistic UI Update -> Haptic Feedback -> Notification -> Background Uplink.
- **Error Recovery**: Automatically manages `isDirty` flags and handles "Requested entity not found" errors by prompting for sync.

## 4. Perspective Header (`components/core-ui/PerspectiveHeader.tsx`)
A slot-based layout component replacing `ViewHeader` and `ManagedViewHeader`.
- **Slots**:
    - `Identity`: Title, Accent, and Count Badge.
    - `Discovery`: Search and Filters.
    - `Actions`: Primary buttons (Add, Sync).
    - `Context`: Temporal tools (Chronometer).
- **Benefits**: Ensures identical glass-blur, padding, and responsive stacking across all 13 views.

## 5. Migration Roadmap
1.  **Infrastructure Update**: Enhance `RegistrySchemas.ts`.
2.  **Primitive Creation**: Develop `SovereignForm` and `PerspectiveHeader`.
3.  **Hook Refactor**: Implement `useSovereignAction`.
4.  **View Migration**: Swap hard-coded implementations in primary lists (Assets, Trades, Info).
5.  **Final Polish**: Standardize headers across Dashboard, Cockpit, and Settings.