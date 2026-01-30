# Sheetsense Encrypted Vault Protocol (EVP)

## 1. Objective
Transition the Sheetsense Integrity Protocol (SIP) from simple SHA-256 signatures to full **End-to-End Encryption (E2EE)**. This ensures that financial data stored in Google Drive or exported as JSON is unreadable to anyone without the user's specific Google Identity.

---

## 2. Cryptographic Specification

### Algorithmic Standard
*   **Algorithm:** AES-GCM (Advanced Encryption Standard with Galois/Counter Mode) 256-bit.
*   **Key Derivation (KDF):** PBKDF2 with SHA-256.
*   **Iterations:** 100,000.
*   **Salt:** A random 16-byte buffer stored in the envelope header.

### Identity Binding
*   **Seed:** The user's Google Subject ID (`sub`).
*   **Contextual Lock:** The key is combined with the `sheet_id` to prevent "cross-loading" data between different financial instances.

---

## 3. Structural Specification

### Vault Envelope Updates
The `VaultEnvelope` interface is extended to house the encrypted cipher-text and cryptographic metadata.
```typescript
interface VaultEnvelope {
  integrity: {
    signature: string;   // SHA-256 of the header/meta
    algorithm: "AES-GCM-256";
    iv: string;         // Base64 Initialization Vector
    salt: string;       // Base64 KDF Salt
    sheet_id: string;
    timestamp: string;
  };
  encrypted_payload: string; // Base64 Cipher-text
}
```

---

## 4. Implementation Roadmap

### Phase 1: Cryptographic Primitives
*   Implement `deriveVaultKey` using the browser's `SubtleCrypto` API.
*   Implement `encryptVaultBuffer` and `decryptVaultBuffer`.

### Phase 2: Orchestration
*   Update `backupService.ts` to pass the JSON state through the encryption engine before finalizing the export.
*   Update `validateVault` to attempt re-derivation of the key and decryption during restore.

### Phase 3: Error Handling
*   Add `DMN-EVP-01` (Decryption Failure) to the Institutional Error Protocol.
*   Trigger a security clearance error if the Google Identity doesn't match the derived key requirements.

---

## 5. Visual Feedback
*   **Uplink Pulse:** The sync indicator will flash emerald during the "Encryption Layer" phase.
*   **Lock Glyphs:** Settings views will display "Neural Encryption Active" badges.
