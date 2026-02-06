# Implementation Plan: Institutional Error Protocol (IEP)

## 1. Objective
Establish a deterministic error reporting system to transition from "Uncaught Exceptions" to "Managed Faults." This system will provide unique error codes to accelerate troubleshooting and improve user recovery flows.

---

## 2. Taxonomy Definition
Errors will follow the `[PREFIX]-[CATEGORY]-[ID]` format.

| Prefix | Domain | Examples |
| :--- | :--- | :--- |
| **ATH** | Authentication | GSI Handshake, Token Expiry, Scopes |
| **GIO** | Google Infrastructure | Sheets API, Drive access, Picker faults |
| **IDB** | Local Persistence | IndexedDB locks, Versioning, Storage quota |
| **INT** | Intelligence | Gemini API, Categorization, JSON schema drift |
| **DMN** | Domain Logic | Math overflows, Valuation engine, Currency faults |
| **SYS** | System Environment | Runtime faults, Render failure, Memory leaks |

---

## 3. Structural Specification

### The `AppError` Class
A custom class extending `Error` to carry the metadata payload.
```typescript
class AppError extends Error {
  code: string;       // e.g., "GIO-404-01"
  severity: string;   // "CRITICAL" | "RECOVERABLE" | "SILENT"
  context?: any;      // Raw API response or trace
}
```

### UI Presentation (NotificationHost)
The notification toast will be updated to display:
1.  **Human Label:** "Uplink Interrupted"
2.  **Protocol Code:** `[GIO-403-01]` (Small mono-spaced type in footer)
3.  **Action Link:** If recoverable, a button to "Re-authenticate" or "Select Sheet."

---

## 4. Implementation Roadmap

### Phase 1: Core Utility & Persistence (COMPLETE)
- Create `services/infrastructure/ErrorHandler.ts`.
- Wrap `useIndexedDB.ts` with `IDB-xxx` codes.
- Update `NotificationHost.tsx` to render codes.

### Phase 2: Cloud Infrastructure (COMPLETE)
- Inject error mapping into `GoogleClient.ts`.
- Map specific HTTP status codes (401, 403, 404) to GIO-specific logic.
- Update `authService.ts` with ATH-xxx codes.

### Phase 3: Neural & Logic Layer (COMPLETE)
- Wrap Gemini calls in `IntelligenceProvider.ts` with INT-xxx codes.
- Add safety checks in `FinancialEngine.ts` with DMN-xxx codes.

### Phase 4: Global Integrity Guard (COMPLETE)
- Implement `GlobalIntegrityGuard` (Error Boundary) for system-wide catch-all.
- Display `SYS-500-01` for runtime discontinuities.
- Provide diagnostic payload exporter.

---

## 5. Success Criteria
- No "Red Screen" crashes in production.
- Every error toast includes a cross-referenceable code.
- Console contains structured JSON logs for every triggered IEP event.
