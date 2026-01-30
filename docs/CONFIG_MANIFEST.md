# Sheetsense Configuration Manifest

This document details the configuration layer of the Sheetsense application. These files act as the "Authority of Truth" for how data is mapped, how the UI is structured, and how heuristics are applied during automated processing.

---

## 1. Registry Schemas
**File:** `config/RegistrySchemas.ts`

**Purpose:**  
This file defines the structural bridge between raw Google Sheets rows and the application's internal TypeScript interfaces. It uses a key-mapping strategy to handle variations in column naming across different spreadsheet templates.

**Core Capabilities:**
- **Field Mapping:** Provides arrays of potential keywords (e.g., `['ticker', 'symbol', 'code']`) to resolve column indices.
- **Type Enforcement:** Defines the data type for each field (`string`, `number`, `date`, `boolean`, `ticker`).
- **Post-Processing:** Contains logic to transform data after parsing (e.g., automatically resolving an asset class based on its name or normalizing trade quantities).
- **Validation:** Marks critical fields as `required` to ensure data integrity during ingestion.

---

## 2. View Metadata
**File:** `config/ViewMetadata.ts`

**Purpose:**  
The central registry for all application views. It controls the "Directorate" navigation system and defines the visual and functional properties of every screen in the app.

**Core Capabilities:**
- **Identity:** Defines the label and Lucide icon for each view.
- **Directorate Assignment:** Groups views into logical departments (`Capital`, `Flow`, `Logistics`, `Legal`) for sidebar organization.
- **Security:** Flags "Protected" views that require active authentication sessions to access.
- **Navigation Logic:** Provides descriptions and metadata used by the `ViewDispatcher` and `Navigation` components to build the interface.

---

## 3. Statement Manifest
**File:** `config/StatementManifest.ts`

**Purpose:**  
Contains the heuristic parameters used by the PDF parsing engine to identify, clean, and categorize bank statement data.

**Core Capabilities:**
- **Legal Noise Filtering:** Lists common legal strings (e.g., "Cardmember Agreement") that should be ignored by the parser to prevent false transaction hits.
- **Transfer Detection:** Defines keywords (e.g., "payment from", "mobile deposit") used to identify and exclude internal transfers from spending analysis.
- **Temporal Resolution:** Provides a localized month-to-index map to ensure accurate date construction regardless of standard JS Date quirks.