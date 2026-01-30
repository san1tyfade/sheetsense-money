# Sheetsense Data Modeling & Schema Design

Sheetsense employs a "Logic-First" data architecture that treats Google Sheets as a flexible, human-readable database while maintaining strict typed models within the application runtime. This document outlines the structural definitions for all core entities.

## 1. Architectural Principles

- **Schema-Driven Ingestion:** Uses fuzzy keyword matching to resolve spreadsheet columns into internal properties, allowing for variations in user templates.
- **Local-First Persistence:** All data resides in `indexedDB` (FinTrackDB) to ensure zero-latency interactions and offline capability.
- **Temporal Versioning:** State for certain entities (Income/Expenses) is keyed by the financial year (e.g., `fintrack_income_2024`) to support historical archiving.

---

## 2. Core Entity Registries (Flat Schemas)

These entities follow a one-row-to-one-object mapping pattern.

### Asset (Inventory Matrix)
Represents physical or digital holdings with absolute valuations.
| Property | Type | Description | Schema Keywords |
| :--- | :--- | :--- | :--- |
| `name` | string | Display name of the asset | name, account, item |
| `type` | string | Classification (Cash, Property, etc.) | type, category, class |
| `value` | number | Current valuation (native currency) | value, balance, amount |
| `currency` | string | ISO code (CAD, USD, etc.) | currency, ccy |

### Trade (Event Ledger)
Captures discrete BUY/SELL interactions for securities or crypto.
| Property | Type | Description | Schema Keywords |
| :--- | :--- | :--- | :--- |
| `date` | string | Execution timestamp (YYYY-MM-DD) | trade date, time |
| `ticker` | string | Normalized ticker symbol | symbol, asset, code |
| `type` | BUY/SELL | Interaction protocol | type, side, action |
| `quantity`| number | Unit depth of the transaction | qty, shares, volume |
| `price` | number | Execution price per unit | unit price, cost |
| `total` | number | Net settlement value | net amount, book value |

### Journal Entry (Atomic Audit)
A high-density record of processed transactions for traceability.
| Property | Type | Description |
| :--- | :--- | :--- |
| `description`| string | Merchant or vendor identity |
| `category` | string | Primary logical node (e.g. "Housing") |
| `subCategory`| string | Granular node (e.g. "Rent") |
| `amount` | number | Scalar impact |
| `source` | string | Bank or account context |

---

## 3. Matrix Structures (Complex Schemas)

### The Ledger (Hierarchical Flow)
Unlike flat registries, the Ledger uses a non-linear matrix structure for Cash Flow.
- **Hierarchy:** `Category (Parent) -> Sub-Category (Child)`.
- **Temporal Dimension:** 12 monthly columns (B through M in the spreadsheet).
- **Heuristics:** The parser identifies a row as a "Header" if it lacks numeric content in month columns and is followed by rows that contain data.

### Portfolio Log (Dynamic Snapshots)
Used for tracking Net Worth and Account distributions over time.
- **Structure:** `[Date Column] | [Institution A] | [Institution B] | ...`
- **Dynamic Resolution:** The parser scans the header row for all columns *not* labeled "Date" and treats them as dynamic account identifiers.

---

## 4. Persistence Layer Design

### IndexedDB Storage (`app_state` store)
| Key Pattern | Data Structure |
| :--- | :--- |
| `fintrack_assets` | `Asset[]` |
| `fintrack_income_[YYYY]` | `IncomeEntry[]` (Summary) |
| `fintrack_detailed_expenses_[YYYY]` | `LedgerData` (Hierarchical) |
| `fintrack_system_settings` | `SystemSettings` (Theme, Active Year, Config) |

### Cloud Vault Envelope (`VaultEnvelope`)
Backups and cloud syncs are wrapped in an integrity envelope to prevent data corruption.
```typescript
interface VaultEnvelope {
  integrity: {
    signature: string;   // SHA-256 hash
    sheet_id: string;    // Contextual lock
    timestamp: string;   // Generation point
    origin_hint: string; // Identity metadata
  };
  payload: Record<string, any>; // Flattened state from IDB
  ai_memory: Record<string, string>; // Local neural weights
}
```

---

## 5. Neural Classification Schema

During statement processing, the Gemini engine is requested to return data adhering to the following schema:
```json
{
  "type": "ARRAY",
  "items": {
    "type": "OBJECT",
    "properties": {
      "description": { "type": "STRING" },
      "category": { "type": "STRING" }
    }
  }
}
```
This output is then reconciled against the local **Integration Bridge** to map statement categories to specific **Ledger Nodes**.