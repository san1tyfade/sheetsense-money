/**
 * Institutional Error Protocol (IEP)
 * Central authority for fault management.
 */

export type ErrorSeverity = 'CRITICAL' | 'RECOVERABLE' | 'SILENT';

export class AppError extends Error {
  code: string;
  severity: ErrorSeverity;
  context?: any;

  constructor(code: string, message: string, severity: ErrorSeverity = 'RECOVERABLE', context?: any) {
    super(message);
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.name = 'AppError';
  }
}

/**
 * IEP Code Dictionary Constants
 * Use these instead of raw strings across the app.
 */
export const IEP = {
  AUTH: {
    GSI_MISSING: 'ATH-100-01',
    TOKEN_EXPIRED: 'ATH-401-01',
    PROFILE_FAIL: 'ATH-401-02',
    SCOPE_DENIED: 'ATH-403-01',
  },
  GIO: {
    NOT_FOUND: 'GIO-404-01',
    QUOTA_LIMIT: 'GIO-429-01',
    WRITE_PROTECTED: 'GIO-500-01',
    API_FAULT: 'GIO-500-02',
  },
  IDB: {
    LOAD_LOCK: 'IDB-001-01',
    SCHEMA_DRIFT: 'IDB-500-01',
    QUOTA_FULL: 'IDB-507-01',
  },
  INT: {
    KEY_INVALID: 'INT-401-01',
    SCHEMA_MISMATCH: 'INT-500-01',
    MODEL_TIMEOUT: 'INT-504-01',
  },
  DMN: {
    VALUATION_OVERFLOW: 'DMN-001-01',
    FX_MISSING: 'DMN-FX-01',
    EVP_DECRYPT_FAIL: 'DMN-EVP-01',
    EVP_KEY_FAIL: 'DMN-EVP-02',
  },
  SYS: {
    RUNTIME_FAULT: 'SYS-500-01',
    RENDER_CRASH: 'SYS-100-01',
  }
};
