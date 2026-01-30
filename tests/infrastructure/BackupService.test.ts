import { describe, it, expect, vi } from 'vitest';
import { validateVault } from '../../services/backupService';

describe('BackupService: EVP Integrity', () => {
  const mockSheetId = '1abc-test-sheet-id-xyz';
  const mockUserSub = 'auth0|user-123';

  // Mock valid envelope structure
  const validEnvelope = {
    integrity: {
      signature: 'valid-sig',
      algorithm: "AES-GCM-256",
      version: "2.7.0",
      origin_hint: "test@example.com",
      sheet_id: mockSheetId,
      timestamp: new Date().toISOString(),
      iv: 'base64-iv',
      salt: 'base64-salt'
    },
    encrypted_payload: 'base64-payload'
  };

  it('should reject unencrypted or malformed legacy backups', async () => {
    const legacyJson = JSON.stringify({ old_key: 'old_value' });
    await expect(validateVault(legacyJson, mockSheetId, mockUserSub))
        .rejects.toThrow('EVP Protocol Error');
  });

  it('should detect identity mismatch on decryption failure', async () => {
    // We mock the crypto service to throw an error simulating a wrong key
    vi.mock('../../services/cryptoService', async (importOriginal) => {
        const actual = await importOriginal() as any;
        return {
            ...actual,
            decryptVault: vi.fn().mockRejectedValue(new Error('Decryption failed'))
        };
    });

    const result = await validateVault(JSON.stringify(validEnvelope), mockSheetId, mockUserSub);
    expect(result.status).toBe('identity_mismatch');
  });
});