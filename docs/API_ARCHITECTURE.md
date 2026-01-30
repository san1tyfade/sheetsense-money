# Sheetsense API Architecture & Data Flow

Sheetsense operates on a "Local-First, Cloud-Bound" architecture. This document details the external interfaces and the internal data lifecycle that powers the application.

## 1. Core Service Infrastructure

### Google Cloud Platform (GCP) Ecosystem
The application sits atop a suite of Google APIs for identity, storage, and discovery.

*   **Google Identity Services (GSI / OAuth 2.0)**:
    *   **Purpose**: Manages secure sessions without ever touching user passwords.
    *   **Scope**: Requesting `drive.file` (access to spreadsheets created/opened by the app) and `userinfo.profile`.
    *   **Usage**: Tokens are held in temporary memory and used to authorize all subsequent Google API requests.

*   **Google Sheets API (v4)**:
    *   **Purpose**: The primary database interface.
    *   **Usage**: Fetches raw data from specific tab names using `values.get`. Writes data back via `values.update` (for specific cells) or `values.append` (for new rows in registries).
    *   **Strategy**: Uses fuzzy header matching to remain resilient to user-driven spreadsheet modifications.

*   **Google Drive API (v3)**:
    *   **Purpose**: Infrastructure provisioning and discovery.
    *   **Usage**: Used during onboarding to `copy` the master template. Used by the Cloud Vault to search for and manage the hidden `sheetsense_vault.json` manifest.

*   **Google Picker API**:
    *   **Purpose**: Secure file selection.
    *   **Usage**: Provides a modal UI for users to select an existing spreadsheet from their Drive, returning a `fileId` which becomes the application's "Infrastructure ID."

---

## 2. Intelligence Layer

### Google Gemini API (@google/genai)
*   **Purpose**: Neural reasoning for unstructured financial data.
*   **Models**: 
    *   `gemini-3-flash-preview`: Primary engine for high-speed transaction categorization.
    *   `gemini-3-pro-preview`: Advanced engine for deep-scan audit narratives.
*   **Implementation**: 
    *   **Categorization**: Receives a list of merchant strings and a set of target ledger categories. Returns a structured JSON map.
    *   **Narrative**: Analyzes statistical anomalies (e.g., a 50% spike in "Dining") and synthesizes a natural language summary.

---

## 3. Market Intelligence

*   **Frankfurter API**:
    *   **Purpose**: Real-time Forex (FX) rates.
    *   **Usage**: Fetched on initialization to build the `ExchangeRates` map relative to CAD. Enables multi-currency valuation for assets (USD Bank Accounts, EUR Properties, etc.).

*   **Yahoo Finance API (Proxy)**:
    *   **Purpose**: Public market security quotes.
    *   **Usage**: Used to fetch `regularMarketPrice` for stock tickers. Historical series are fetched for benchmark comparison charts.

*   **CoinGecko API**:
    *   **Purpose**: Cryptocurrency spot prices.
    *   **Usage**: Fetches global crypto prices in USD, which are then routed through the Frankfurter FX engine to provide CAD valuations.

---

## 4. The Data Flow Lifecycle

Sheetsense follows a deterministic path from raw input to visual intelligence:

### Phase A: Ingestion (The Pipeline)
1.  **PDF Deconstruction**: `pdf.js` parses a bank statement into geometric text blocks.
2.  **Deterministic Extraction**: Regex patterns extract dates, descriptions, and amounts.
3.  **Neural Classification**: Gemini maps cleaned descriptions to local Ledger categories.
4.  **Hardware Committal**: Verified transactions are written to `indexedDB` (Local Cache).

### Phase B: Harmonization (The Logic Layer)
1.  **Asset Valuation**: The `valuationEngine` combines local "Manual Values" with "Live Quote" feeds.
2.  **Portfolio Reconciliation**: `reconcileInvestments` merges static positions from the sheet with the dynamic "Trade Ledger" to determine current share depth.
3.  **Temporal Normalization**: The `TemporalSovereign` snaps all data to the "Active Year" context (e.g., if viewing 2023, the current date is logically Dec 31, 2023).

### Phase C: Persistence (The Uplink)
1.  **Dirty Marking**: Any local CRUD action marks an object as `isDirty`.
2.  **Conflict Detection**: Before syncing, the app compares the local `lastUpdated` timestamp with the Spreadsheet metadata.
3.  **Transactional Commit**: The `UniversalWriter` maps TypeScript objects back to Spreadsheet rows based on Registry Schemas.

### Phase D: Visualization (The Surface)
1.  **Transformers**: Raw arrays are mapped to `Recharts` data structures (Sankeys, Waterfalls, Area charts).
2.  **Privacy Filter**: All numeric outputs pass through `PrivacyValue.tsx`, which respects the global `Ghost Mode` state for visual blurring.