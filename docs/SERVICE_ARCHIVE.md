# Sheetsense Service Archive

This document catalogues the functional logic layer of the Sheetsense application. Services are organized by their domain responsibility, ranging from low-level infrastructure to high-level financial mathematics.

## 1. Infrastructure & Core Communication

### `services/infrastructure/GoogleClient.ts`
**API Gateway.**  
A unified singleton for all Google API communication. It manages OAuth 2.0 token injection, standardized error mapping (e.g., handling "entity not found"), and low-level fetch abstractions for spreadsheet ranges.

### `services/infrastructure/IntelligenceProvider.ts`
**Neural Engine.**  
Interfaces with the Gemini API to provide advanced reasoning. It handles automated merchant categorization using local memory, cleans raw description strings, and synthesizes natural language "Audit Narratives" for spending patterns.

### `services/infrastructure/HapticService.ts`
**Sensory Feedback.**  
Synthesizes mechanical audio clicks via the Web Audio API and manages physical vibration pulses for mobile devices. It provides tactile confirmation for data entry and navigation.

---

## 2. Authentication & Cloud Connectivity

### `services/authService.ts`
**Identity Governance.**  
Orchestrates the Google Identity Services (GSI) handshake. Manages session restoration, token expiration tracking, user profile fetching, and initial template provisioning (cloning the master spreadsheet).

### `services/pickerService.ts`
**Discovery Dialog.**  
Manages the injection and lifecycle of the Google Picker API. Provides the secure interface for users to select specific spreadsheets from their Drive without granting broad access permissions.

---

## 3. Spreadsheet Data Flow

### `services/sheetService.ts`
**Inbound Logistics.**  
Handles raw read operations from Google Sheets. Includes logic for ID extraction from URLs, CSV string conversion, and "Year Probing" to detect financial chapters within the spreadsheet.

### `services/sheetWriteService.ts`
**Outbound Transactional Authority.**  
The "Universal Writer" that maps typed objects to spreadsheet rows using Registry Schemas. Manages single-row commits, bulk journal archiving, and the complex yearly rollover sequence (cloning, protecting, and resetting ledger tabs).

---

## 4. Deterministic Parsers & Normalization

### `services/deterministicUtils.ts`
**Ingestion Orchestrator.**  
The primary entry point for parsing raw sheet data. It routes data to specialized parsers based on the tab's structural layout (e.g., Ledger vs. Flat Registry).

### `services/parsers/UniversalParser.ts`
**Schema-Driven Ingestion.**  
A generic engine that uses `RegistrySchemas` to transform CSV rows into typed TypeScript objects. Handles type conversion, fuzzy header matching, and strict validation rules.

### `services/parsers/ledgerParsers.ts`
**Matrix Resolution.**  
Specialized logic for parsing the non-linear "Ledger" structures. It identifies date headers, parent category rows, and indented sub-categories to build the application's cash flow models.

### `services/parsers/logParsers.ts`
**Snapshot History Parser.**  
Handles the "Portfolio Log" tab, which utilizes dynamic account-based columns that expand horizontally as users add new institutions.

### `services/parsers/registryParsers.ts`
**Fixed-Offset Parsers.**  
Specialized logic for legacy spreadsheet structures, such as the Debt Schedule, which uses specific row offsets (e.g., data starting at row 5).

---

## 5. Domain Intelligence

### `services/domain/valuationEngine.ts`
**Valuation Authority.**  
Resolves the most accurate price for an asset by comparing live market quotes, recent trade history, and manual sheet overrides. Calculates synthetic Average Cost Base (ACB) using weighted buys.

### `services/domain/classificationHub.ts`
**Identity Resolver.**  
Determines an asset's "Major Class" (Cash, Investment, Fixed, Liability) based on name tokens. Provides visual metadata like icons and handles the identification of "Managed" assets.

### `services/domain/merchantService.ts`
**Behavioral Clustering.**  
Groups transactions by merchant identity, detects billing cadences (Monthly/Weekly), and flags statistical anomalies like "Spending Shocks" relative to historical medians.

### `services/taxService.ts`
**Regulatory Logic.**  
Implements Canadian tax rules for TFSA, RRSP, and FHSA accounts. Tracks contribution room recovery (TFSA) and enforces annual limits based on verified transaction events.

---

## 6. Financial Mathematics

### `services/math/FinancialEngine.ts`
**Sovereign Math Authority.**  
A stateless library containing precision-safe primitives for rounding, percentage change, median calculation, standard deviation, and Dietz-method returns.

### `services/math/financialMath.ts`
**Aggregated Metrics.**  
Computes high-level financial stats like monthly burn rates, net worth attribution, and period-over-period flow efficiency.

### `services/portfolioMath.ts`
**Attribution Engine.**  
Processes historical snapshots to calculate market alpha, net contributions, and max drawdown for investment portfolios.

---

## 7. Specialized Utilities

### `services/priceService.ts`
**Market Intelligence.**  
Fetches live quotes for stocks and crypto via CoinGecko and Yahoo Finance. Implements aggressive IndexedDB caching for historical series to minimize API latency.

### `services/currencyService.ts`
**Forex Controller.**  
Manages live exchange rates relative to CAD. Provides multi-currency conversion logic and visual localization (flags, formatting).

### `services/mortgageService.ts`
**Debt Optimizer.**  
Implements Canadian semi-annual compounding mortgage math. Generates amortization schedules comparing standard paths against accelerated strategies and renewal rate shocks.

### `services/mortgageService.ts`
**Mortgage service logic.**
The primary calculation engine for amortization and renewal strategies.

### `services/temporalService.ts`
**Chronos authority.**  
Normalizes time across the application based on the "Active Year" context. Builds the unified transaction timeline used for global analytics.

### `services/analytics/transformers.ts`
**Visualization Adapters.**  
Transforms raw financial state into specialized data structures for Recharts components (Sankey diagrams, Waterfall charts, stacked area charts).

### `services/tools/pdfParser.ts`
**Geometry Processor.**  
Uses PDF.js to deconstruct bank statements. Reconstructs lines based on Y-axis coordinates and extracts transactions based on spatial patterns (Amex Cobalt / WS Visa).

### `services/tools/toolMemoryService.ts`
**Knowledge Base.**  
Local persistence for merchant categorization memory and integration bridge mappings. Ensures the AI "learns" from previous user corrections.