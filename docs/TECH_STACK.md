# Sheetsense Technical Stack & Architecture

Sheetsense is an industrial-grade, local-first personal finance orchestrator. This document outlines the technology choices, architectural patterns, and engineering standards used in the production environment.

## 1. Core Framework & Language
- **React 19.x**: High-performance UI library utilized for component-based architecture.
- **TypeScript**: Strict type-safety enforced across all data models, services, and hooks to prevent runtime logic errors in financial calculations.
- **ES Modules (ESM)**: Distributed via `esm.sh` for modern, build-less dependency management in the browser.

## 2. Visual Interface & Design System
- **Tailwind CSS**: Utility-first styling engine for rapid, responsive interface development.
- **Lucide React**: Vector icon set for consistent visual language across functional departments.
- **Dynamic Density Scaling**: Custom CSS variables integrated with Tailwind to support "ZEN" vs "COMPACT" magnitude modes via a root `html` class.
- **Ghost Mode Protocol**: CSS filter-based privacy layer for real-time visual data blurring.

## 3. Persistent Data Layer
- **IndexedDB (FinTrackDB)**: The primary local storage engine. Enables offline functionality, zero-latency state restoration, and multi-year data partitioning.
- **Local-First State**: Application logic treats the local database as the "Primary Authority," with remote synchronization acting as a background "Transactional Bridge."
- **Temporal Partitioning**: State for Ledger-based entities is partitioned by year (e.g., `fintrack_income_2024`) to ensure linear scaling as user history grows.

## 4. Cloud Infrastructure (GCP)
- **Google Identity Services (GSI)**: OAuth 2.0 protocol for secure user authentication without server-side credential storage.
- **Google Sheets API v4**: Utilized as the remote "Source of Truth" and human-readable database.
- **Google Drive API v3**: Manages file-level operations, infrastructure cloning (templates), and hidden application metadata.
- **Google Picker API**: Secure, context-isolated interface for selecting spreadsheet nodes.

## 5. Intelligence Layer (GenAI)
- **Google Gemini API (`@google/genai`)**:
    - `gemini-3-flash-preview`: Primary engine for high-speed, high-volume transaction categorization.
    - `gemini-3-pro-preview`: Utilized for deep-scan audit narratives and complex behavioral analysis.
- **Neural Reasoning**: Offloads unstructured data processing (PDF geometry to JSON) to the model while maintaining deterministic integrity via local integration bridges.

## 6. Financial Intelligence & APIs
- **Frankfurter API**: Fetches real-time Forex (FX) data relative to CAD to enable multi-currency asset valuation.
- **Yahoo Finance (via Proxy)**: Used for security price discovery and historical benchmark series fetching.
- **CoinGecko API**: Real-time cryptocurrency spot pricing.
- **Canadian Compounding Logic**: Mortgage services implement semi-annual compounding math required by Canadian regulatory standards.

## 7. Performance & Tooling
- **PDF.js**: Client-side geometric deconstruction of PDF bank statements for privacy-preserving data extraction.
- **Recharts**: D3-based charting library for complex financial visualizations (Sankeys, Waterfalls, Area charts).
- **Web Audio API**: Real-time synthesis of mechanical "Logic Clicks" for tactile feedback without external asset latency.
- **SHA-256 Signing**: All local-to-cloud exports are signed with a cryptographic signature derived from the user's Google Identity to detect data corruption or unauthorized tampering.

## 8. Development Standards
- **Zero-Build Architecture**: Leverages standard browser capabilities for module resolution, minimizing the attack surface and deployment complexity.
- **Stateless Services**: Domain logic (Math, Valuation, Classification) is implemented as pure, stateless functions to ensure testability and reliability.
- **Hook-Driven Logic**: Heavy use of custom React hooks to encapsulate complex networking, persistence, and selection logic.