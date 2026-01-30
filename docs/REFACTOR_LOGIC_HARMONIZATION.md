# Refactoring Plan: Logic Harmonization

## Overview
This plan addresses logic duplication in parsers, fragmentation in date handling, redundant math wrappers, and boilerplate in entity state transitions.

## Phase 1: Math Consolidation (Sovereign Authority)
**Goal:** Delete `financialMath.ts` and merge all functional logic into `FinancialEngine.ts`.
- Move `calculateMonthlyBurn`, `calculateDietzReturn`, `calculateMaxDrawdown`, `calculateGrowthVelocity`, `calculateNetWorthAttribution`, and `calculatePeriodTotals` to `FinancialEngine`.
- Update all component imports from `financialMath` to `FinancialEngine`.
- **Success Criteria:** `services/math/financialMath.ts` is deleted.

## Phase 2: Chronos Protocol (Date Authority)
**Goal:** Centralize all date parsing and formatting into `TemporalSovereign`.
- Relocate `parseFlexibleDate`, `formatDateToLocalISO`, and `isStrictDate` from `parserUtils.ts` to `TemporalSovereign`.
- Implement `toAbsoluteISO(input)` in `TemporalSovereign` to strictly enforce `YYYY-MM-DD`.
- Refactor `merchantService.ts` to use string-based month offsets for pulse calculation.
- **Success Criteria:** No date parsing logic exists outside of `temporalService.ts`.

## Phase 3: Parser Heuristics Extraction
**Goal:** Eliminate triple-duplicated header scanning in `ledgerParsers.ts`.
- Create `findHeaderRow(lines: string[][], keywords: string[], threshold: number)` in `parserUtils.ts`.
- Refactor `parseDetailedExpenses`, `parseDetailedIncome`, and `parseIncomeAndExpenses` to use this utility.
- **Success Criteria:** Line count of `ledgerParsers.ts` reduced by ~40%.

## Phase 4: Lifecycle Metadata Normalization
**Goal:** Centralize the "Prepare for Cache" logic in entity controllers.
- Create `services/infrastructure/LifecycleService.ts`.
- Implement `SovereignLifecycle.prepare(item, existing?)` to handle ID generation, `isDirty` flags, and `rowIndex` preservation.
- Refactor `useEntityController.ts` to use this service.
- **Success Criteria:** Manual object spreading (`{...item, isDirty: true}`) is removed from the hook.
