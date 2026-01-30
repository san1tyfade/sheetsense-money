# Codebase Boilerplate Analysis Report
Date: 2026-01-29

## Executive Summary
A deep scan of the `sheetsense` codebase has identified 11 remaining areas of code duplication and technical debt.

## Category A: Service Layer & Logic (High Impact)

### 1. Google Sheets API Construction
**Location**: `services/sheetService.ts`, `services/sheetWriteService.ts`
**Issue**: Raw string concatenation for API URLs (`https://sheets.googleapis.com/v4...`) and range encoding (`encodeURIComponent("'" + tab + "'!A1:...")`) is repeated across all read/write functions.
**Recommendation**: Introduce a `SheetLink` builder class to canonicalize URL construction.

### 2. Redundant Math Wrappers
**Location**: `services/math/financialMath.ts`
**Issue**: This file serves purely as a pass-through wrapper for `FinancialEngine.ts` (e.g., `calculateDietzReturn` just calls `FinancialEngine.dietz`).
**Recommendation**: Deprecate `financialMath.ts` and use `FinancialEngine` directly.

### 3. Infrastructure Protocol Redundancy
**Location**: `services/infrastructure/SpreadsheetProtocol.ts` vs `GoogleClient.ts`
**Issue**: `SpreadsheetProtocol` defines static methods for URL construction (e.g., `getReadUrl`) but `GoogleClient` and other services often ignore it and manually construct strings.
**Recommendation**: Deprecate `SpreadsheetProtocol` or enforce its usage within `GoogleClient`.

## Category B: State Management & Architecture

### 4. Context State Boilerplate
**Location**: `context/FinancialContext.tsx`
**Issue**: The `FinancialProvider` (~370 lines) manually orchestrates persistence for 15+ separate state atoms. The pattern `const [x, setX] = useIndexedDB(...)` is repeated for every entity.
**Impact**: Adding a new entity requires edits in Types, Context Interface, Provider, Dispatcher, and Value Object.
**Recommendation**: Refactor into a unified `Store` or use a reducer pattern for entity collections.

### 5. Optimistic State Logic
**Location**: `hooks/useEntityController.ts`, `useFinancialActions.ts`
**Issue**: The pattern of "generate generic ID, mark as dirty, update specific pool" is theoretically centralized but still leaks implementation details (spreading `isDirty: true`) into consumer hooks.

### 6. Tab Configuration Defaults
**Location**: `context/FinancialContext.tsx`, `services/`
**Issue**: Tab names are defined in `DEFAULT_SETTINGS` but also appear as string literals in some parsers.
**Recommendation**: Enforce a strict `SheetConfig` singleton usage.

## Category C: UI Components

### 7. View Switcher / Tab UI
**Location**: `IncomeView.tsx`, `SpendView.tsx`, `AssetsList.tsx`
**Issue**: The "Pill/Tab" switcher UI (Active vs Inactive styles) is duplicated in each domain view with identical Tailwind classes.
**Recommendation**: Extract a `SegmentedControl` component.

### 8. Empty State / Loading UI
**Location**: Various Components
**Issue**: Loading spinners and "No Data" placeholder blocks are re-implemented in each view.

### 9. Chart Containers & Stat Grids
**Location**: `components/analytics/FlowAnalytics.tsx`, `PortfolioAnalytics.tsx`
**Issue**: Both analytics views implement identical grid layouts for `StatHighlight` cards and chart containers with specific shadows/borders/blur effects (`bg-white dark:bg-slate-800/40...`).
**Recommendation**: Extract `AnalyticsDashboardLayout` or `ChartCard` components.

## Category D: Testing

### 10. Test Data Fragmentation
**Location**: `tests/mocks/handlers.ts` vs `tests/domain/*.test.ts`
**Issue**: While global MSW handlers exist, individual test files often redefine their own `mockBaseline` or transaction arrays, leading to maintenance burden when types change.
**Recommendation**: Create a `tests/fixtures` factory.

### 11. Test Mock Duplication
**Location**: `tests/setup.ts`
**Issue**: Tests often manually mock `crypto` or `window.location` even though `setup.ts` should handle this.
