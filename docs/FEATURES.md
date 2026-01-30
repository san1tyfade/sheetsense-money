# Sheetsense Feature Catalog

Sheetsense is a high-fidelity, local-first financial orchestration platform. It combines deterministic financial math with neural reasoning to provide a sovereign environment for wealth management.

---

## 1. Capital Intelligence (Core Dashboard)
The primary nerve center for visualizing high-level financial health.
- **Atomic Net Worth:** Real-time calculation of total wealth by aggregating assets, investments, and liabilities.
- **Liquidity Pulse:** Immediate visibility into "Global Liquidity" (Cash + Equivalents) vs. "Portfolio Core" (Securities).
- **Temporal Trajectory:** Interactive Area Charts showing wealth evolution over selected years.
- **Discovery Selector:** Contextual year switching to view historical "Financial Chapters."
- **Allocation Matrix:** Interactive Pie Charts for auditing asset distribution with drill-down capabilities.

## 2. Inventory & Asset Management
A robust registry for physical and digital holdings.
- **Dynamic Views:** Switch between high-density "Institutional Matrix" (Table) and visual "Card Protocol" layouts.
- **Multi-Currency Engine:** Automatic conversion of foreign assets (USD, EUR) to a primary base currency (CAD) using live FX rates.
- **Managed Nodes:** Automatic identification of account types (TFSA, Crypto, etc.) that interface with live pricing feeds.
- **Inventory Audit:** Tracking of "Last Updated" timestamps per asset to ensure data freshness.

## 3. Portfolio & Market Intelligence
Deep-scan auditing of investment holdings and performance.
- **Live Quote Feed:** Real-time price tracking for global stocks and cryptocurrencies via Yahoo Finance and CoinGecko.
- **Trade Reconciliation:** Deterministic engine that merges static spreadsheet positions with dynamic BUY/SELL trade history to derive "True Depth."
- **Account Breakdown:** Visual allocation audit by institution (e.g., Questrade vs. Wealthsimple).
- **Synthetic ACB:** Automated calculation of Average Cost Base (Native Basis) using weighted trade history.

## 4. Cash Flow & Ledger Dynamics
Industrial-grade tracking of monthly income and expenses.
- **Matrix Ledger:** A non-linear, editable grid for managing hierarchical categories (Housing > Rent).
- **Inflow/Outflow Analysis:** Bar charts comparing monthly yield efficiency and savings rates.
- **Sankey Distribution:** Visual flow analysis showing how gross income is partitioned into expenses and surplus.
- **Temporal Concentration:** Bar charts identifying spending "clusters" across the financial year.

## 5. Neural Statement Audit (Spend Hub)
Automated ingestion of bank statements using Gemini AI.
- **PDF Deconstruction:** Geometric parsing of AMEX Cobalt and Wealthsimple Visa statements.
- **Neural Classification:** Gemini-powered mapping of raw merchant strings to local Ledger categories.
- **Merchant Memory:** Local IndexedDB persistence that "learns" user categorization patterns over time.
- **Ledger Integration:** A "Bridge" modal to batch-commit statement data into specific monthly ledger cells with "Merge" or "Overwrite" strategies.

## 6. Strategic Cockpit (Simulation)
Advanced wealth modeling and projection environment.
- **Typical Month Baseline:** Statistical establishes "Median Monthly Flow" from historical transaction history.
- **Interactive Simulation:** A draggable Sankey diagram allowing users to simulate "What-If" scenarios (e.g., "What if I reduce Dining by 20%?").
- **Wealth Projection:** 30-year trajectory forecasting based on investment rates and macro growth assumptions.
- **FI/RE Gateway:** Automatic detection of the "Financial Independence" point where passive yield exceeds monthly expenses.
- **Life Events:** Ability to drop "Strategic Triggers" (e.g., Home Purchase, Windfall) into the simulation timeline.

## 7. Institutional Registry & Logistics
Management of bank metadata and recurring commitments.
- **Tax Room Tracker:** Canada-specific logic for tracking contribution room recovery in TFSA, RRSP, and FHSA accounts.
- **Commitment Registry:** Monitoring of recurring subscriptions and "Resource Drain Velocity."
- **Debt Matrix:** Tracking of liabilities, interest rates, and monthly payoff schedules.

## 8. Intelligence Tools
Specialized utility modules for complex math.
- **Mortgage Optimizer:** Canadian semi-annual compounding calculator with "Rate Shock" stress testing.
- **Amortization Gradient:** Comparing standard payoff paths against accelerated strategies.
- **Audit Journal:** Chronological trail of every transaction committed to the system for traceability.

## 9. Infrastructure & Security Protocol
Local-first engineering standards for absolute privacy.
- **Local-First Persistence:** All data resides in `indexedDB` for zero-latency, offline-capable interactions.
- **Cloud Vault:** Encrypted-at-rest backup protocol using a hidden system partition in the user's private Google Drive.
- **Integrity Signing:** SHA-256 cryptographic signatures on all exports to detect data tampering.
- **Conflict Resolution:** Multi-device sync protection with "Safe Merge" and "Force Uplink" protocols.
- **Yearly Rollover:** Automated wizard for archiving the current year, write-locking the sheet, and provisioning the next cycle.

## 10. Interaction Design (UX)
High-fidelity interface patterns.
- **Universal Discovery (Search):** An NLP-capable command bar supporting hotkeys (`/`) and shorthand commands (`+t` for trades, `+a` for assets).
- **Ghost Mode:** Global privacy filter that blurs sensitive financial values for use in public spaces.
- **Sensory Layer:** Mechanical audio feedback ("Logic Clicks") and haptic pulses for tactile confirmation.
- **Adaptive Density:** Toggle between "ZEN" (spacious) and "COMPACT" (high-density) magnitude modes.
- **Guided Onboarding:** Interactive tour system for first-time setup and initialization.