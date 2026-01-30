# Sheetsense Test Registry (v2.8.0)

This document provides a comprehensive summary of the **Sheetsense Automated Test Suite**, outlining the purpose and expected outcome for every functional verification node.

## 1. Mathematical Authorities
Verifies the deterministic accuracy of the core financial engines.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `FinancialEngine.test.ts` | Validates fundamental primitives: rounding, % change, median, and Dietz-method returns. | High-precision arithmetic with safety interlocks for near-zero divisions. |
| `MortgageService.test.ts` | Tests Canadian semi-annual compounding math, renewal shocks, and payoff acceleration. | Payment amounts match benchmark schedules; acceleration shaves years off term. |
| `ProjectionEngine.test.ts` | Exercises the 30-year wealth simulation and Financial Independence (FI/RE) milestones. | Accurate trajectory plotting including discrete life events and compounding yield. |

## 2. Ingestion & Parsing Engines
Ensures unstructured spreadsheet data is successfully mapped to internal logic.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `UniversalParser.test.ts` | Verifies the schema-driven mapper with fuzzy header matching and type conversion. | Raw CSV lines are transformed into typed objects; empty/invalid rows are rejected. |
| `LedgerParsers.test.ts` | Verifies the resolution of non-linear matrix structures (Income/Expense tabs). | Correct identification of parent categories vs. sub-categories; numeric sanitization. |
| `PortfolioReconciliation.test.ts` | Validates the proportional distribution of trades across institutional accounts. | Share depth matches (Sheet + Trades); new tickers are successfully derived. |

## 3. Infrastructure & Network
Tests the "Logic-First" bridge between the local vault and cloud hardware.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `FinanceSync.test.ts` | Orchestrates mock API fetches and dispatcher events. | Assets and logs are hydrated correctly; 500-level API faults trigger error states. |
| `ConflictResolution.test.ts` | Verifies the protocol for multi-device data collision detection. | Sync is blocked if local state is "dirty"; conflict modal payload is generated. |
| `RolloverProtocol.test.ts` | Exercises the high-risk Year-End operation (cloning/locking/resetting). | Successful batch request construction for archiving and immutable write-locking. |

## 4. Security & Intelligence
Verifies encryption protocols and neural categorization logic.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `CryptoService.test.ts` | Validates the EVP (Encrypted Vault Protocol) and identity-based signatures. | Data is unreadable without specific seed; signature fails if Sheet ID is tampered. |
| `IntelligenceProvider.test.ts` | Tests deterministic string cleaning and the Gemini AI classification mock. | "Noisy" merchant strings are cleaned; AI accurately maps vendors to ledger nodes. |
| `MerchantIntelligence.test.ts` | Evaluates cadence detection (Monthly/Weekly) and statistical anomaly flagging. | Spending shocks (>1.5 stdDev) are detected; billing frequency is accurately identified. |

## 5. UI Interaction & Discovery
Ensures high-fidelity interaction patterns and NLP command accuracy.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `GlobalDiscovery.test.tsx` | Verifies the NLP parser for shorthand commands (e.g., `+t AAPL`). | Shorthand strings are converted into actionable modal data with zero form entry. |
| `ManagedRegistryView.test.tsx` | Verifies global search indexing, filtering, and multi-node selection. | Search results update in real-time; action matrix appears only when nodes are active. |
| `LedgerEditableCell.test.tsx` | Tests the high-density matrix editing flow (Save-on-Enter/Revert-on-Esc). | Commits trigger uplink; escape successfully reverts the local UI state. |

## 6. Functional Forms & Lifecycle
Validates the data entry protocols for every financial entity.

| Test File | Purpose | Expected Result |
| :--- | :--- | :--- |
| `TradeEntryModal.test.tsx` | Tests BUY/SELL total calculations and ticker normalization. | Settlements include/exclude fees based on protocol action; tickers are uppercased. |
| `AssetEntryModal.test.tsx` | Verifies multi-currency asset registration. | Payload contains correct currency tokens and numeric valuations. |
| `TaxEntryModal.test.tsx` | Tests regulatory logic for contribution vs. withdrawal events. | TFSA room recovery triggers and annual limit increases are accurately recorded. |
| `LedgerIntegrationModal.test.tsx` | Verifies the mapping bridge for bank statement ingestion. | Transactions are aggregated by user-mapped ledger categories; correct month detected. |
| `BulkEditModal.test.tsx` | Validates batch recalibration of multiple nodes simultaneously. | Transformation payload applies the same change to all selected IDs in the pool. |

***

**Test Suite Health:** Standardized for 60fps interaction and institutional data integrity.