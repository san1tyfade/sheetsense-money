# Refactoring Plan: Infrastructure & UI Consolidation

## Overview
This plan addresses architectural drift in the Sheets API communication layer and visual inconsistency in view-switching components.

## Phase 1: Infrastructure Consolidation (Protocol Engine)
**Goal:** Centralize URL and Range construction for Google Sheets API.
- Create `services/infrastructure/SpreadsheetProtocol.ts`.
- Implement `SpreadsheetProtocol` singleton with methods for:
  - `getReadUrl(sheetId, tabName, range)`
  - `getAppendUrl(sheetId, tabName)`
  - `getUpdateUrl(sheetId, tabName, cell)`
  - `getBatchUpdateUrl(sheetId)`
  - `getMetadataUrl(sheetId)`
- **Success Criteria:** Zero manual string concatenations for Sheets URLs in service files.

## Phase 2: Logic Standardization (Tab Resolution)
**Goal:** Ensure case-insensitive and fuzzy tab matching for all operations.
- Relocate `resolveTabName` from `sheetWriteService.ts` to `sheetService.ts`.
- Update `fetchSheetData` to perform a resolution probe before reading.
- Update `validateSheetTab` to utilize the standard resolver.
- **Success Criteria:** "Tab not found" errors are reduced by handling casing mismatches automatically.

## Phase 3: UI Unification (Perspective Toggle)
**Goal:** Replace duplicated tab-switcher CSS with a high-fidelity shared component.
- Create `components/core-ui/PerspectiveToggle.tsx`.
- Support generic value types `<T extends string>`.
- Encapsulate "Institutional" styling:
  - `font-black`, `uppercase`, `tracking-tight`.
  - Blue decoration (`decoration-blue-500`, `decoration-2`, `underline-offset-8`).
  - Monochromatic transitions.
- **Success Criteria:** Removal of duplicated Tailwind classes in `IncomeView`, `SpendView`, `AnalyticsView`, and `InformationView`.
