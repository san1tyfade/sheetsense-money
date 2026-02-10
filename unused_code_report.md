# Unused Code Analysis Report

Generated: 2026-02-10T19:50:06.624Z

## 1. Dead Code (Safe to Delete)
> **Critical**: These items are exported but **NOT used anywhere** (neither internally nor externally).

### components/assets/AssetTableView.tsx
- [ ] `AssetTableView` (const)

### components/core-ui/SovereignForm.tsx
- [ ] `SovereignForm` (const)

### components/core-ui/YearContextBadge.tsx
- [ ] `YearContextBadge` (const)

### components/shared/TabPanel.tsx
- [ ] `TabPanel` (const)

### hooks/usePersistentStore.ts
- [ ] `usePersistentStore` (function)

### services/assets/assetService.ts
- [ ] `AssetFilterType` (type)
- [ ] `filterAssets` (const)
- [ ] `sortAssets` (const)

### services/currencyService.ts
- [ ] `fetchLiveRates` (const)

### services/domain/classificationHub.ts
- [ ] `isLiability` (const)

### services/infrastructure/IntelligenceProvider.ts
- [ ] `generateAuditNarrative` (const)

### services/sheetService.ts
- [ ] `detectActiveYearFromSheet` (const)

### services/tools/csvExport.ts
- [ ] `exportTransactionsToCsv` (const)

### services/tools/toolMemoryService.ts
- [ ] `saveMerchantMemory` (const)

### services/workers/backgroundProcessor.ts
- [ ] `runTaskInBackground` (const)

### tests/fixtures/factories.ts
- [ ] `createMockTransaction` (const)
- [ ] `createMockInvestment` (const)
- [ ] `createMockAsset` (const)
- [ ] `createMockJournalEntry` (const)
- [ ] `createMockStore` (const)

### types.ts
- [ ] `AttributionResult` (interface)

## 2. Unused Exports (Internal Usage Only)
> **Info**: These items are exported but only used within their own file. **Action**: Remove the `export` keyword.

### config/RegistrySchemas.ts
- [ ] `FieldDefinition` (interface)

### config/ViewMetadata.ts
- [ ] `ViewDefinition` (interface)

### hooks/useFinanceSync.ts
- [ ] `SyncDispatcher` (interface)

### hooks/useTabValidation.ts
- [ ] `ValidationStatus` (type)

### services/assets/assetService.ts
- [ ] `AssetSortKey` (type)

### services/authService.ts
- [ ] `copyMasterTemplate` (const)

### services/backupService.ts
- [ ] `syncToCloud` (const)
- [ ] `restoreFromCloud` (const)

### services/cloudSyncService.ts
- [ ] `DriveFile` (interface)

### services/cryptoService.ts
- [ ] `base64ToBytes` (const)
- [ ] `canonicalStringify` (const)

### services/domain/classificationHub.ts
- [ ] `MANAGED_ACCOUNT_TOKENS` (const)
- [ ] `CRYPTO_TICKERS` (const)

### services/domain/merchantService.ts
- [ ] `CadenceType` (type)
- [ ] `MerchantStats` (interface)

### services/domain/valuationEngine.ts
- [ ] `ValuationResult` (interface)

### services/infrastructure/ErrorHandler.ts
- [ ] `ErrorSeverity` (type)

### services/infrastructure/GoogleClient.ts
- [ ] `GoogleRequestOptions` (interface)

### services/pickerService.ts
- [ ] `PickerResult` (interface)

### services/taxService.ts
- [ ] `TaxAccountStats` (interface)

### services/temporalService.ts
- [ ] `calculateTemporalVariance` (const)

### services/trades/tradeService.ts
- [ ] `GroupedTradeStats` (interface)
- [ ] `calculateTradeStats` (const)

### services/workers/backgroundProcessor.ts
- [ ] `createWorker` (const)

