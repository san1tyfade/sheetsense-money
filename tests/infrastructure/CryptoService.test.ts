import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  encryptVault, decryptVault, generateSignature, 
  verifyIntegrity, bytesToBase64 
} from '../../services/cryptoService';

describe('CryptoService: Vault Integrity Protocol', () => {
  const mockSeed = 'test-identity-seed';
  // Use a 44-character ID to satisfy the 30-100 character requirement of extractSheetId
  const mockSheetId = '1abc123_TEST_SHEET_ID_IDENTIFIER_LONG_AUTHORITY_44';
  const mockPayload = { secret: 'financial-data' };
  const salt = bytesToBase64(new Uint8Array(16).fill(1));

  // Note: Standard subtle crypto is partially mocked in setup.ts
  // For these tests, we assume the environment supports the basic primitives.

  it('should generate a deterministic signature for a payload', async () => {
    const sig1 = await generateSignature(mockPayload, mockSeed, mockSheetId);
    const sig2 = await generateSignature(mockPayload, mockSeed, mockSheetId);
    
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBe(64); // SHA-256 hex
  });

  it('should fail integrity verification if the sheet ID is modified', async () => {
    const signature = await generateSignature(mockPayload, mockSeed, mockSheetId);
    // Use another valid-length but different ID
    const differentId = 'DIFFERENT_SHEET_ID_AUTHORITY_LONG_IDENTIFIER_44';
    const isValid = await verifyIntegrity(mockPayload, signature, mockSeed, differentId);
    
    expect(isValid).toBe(false);
  });

  it('should successfully round-trip encryption and decryption', async () => {
    const cleartext = JSON.stringify(mockPayload);
    const compositeKey = mockSeed + mockSheetId;

    const { ciphertext, iv } = await encryptVault(cleartext, compositeKey, salt);
    expect(ciphertext).not.toBe(cleartext);

    const decrypted = await decryptVault(ciphertext, compositeKey, salt, iv);
    expect(decrypted).toBe(cleartext);
    expect(JSON.parse(decrypted).secret).toBe('financial-data');
  });

  it('should fail to decrypt if the seed is incorrect (Identity Locking)', async () => {
    const compositeKey = mockSeed + mockSheetId;
    const { ciphertext, iv } = await encryptVault('secret', compositeKey, salt);

    await expect(decryptVault(ciphertext, 'WRONG-SEED' + mockSheetId, salt, iv))
        .rejects.toThrow();
  });
});