
import { describe, it, expect, vi } from 'vitest';
import { resetYearlyLedger } from '../../services/sheetWriteService';
import { googleClient } from '../../services/infrastructure/GoogleClient';

vi.mock('../../services/infrastructure/GoogleClient', () => ({
  googleClient: {
    request: vi.fn(),
    getRange: vi.fn(),
    getMetadata: vi.fn(),
    batchUpdate: vi.fn(),
    updateRange: vi.fn(),
    appendRange: vi.fn(),
    formatRange: (t: string, c: string) => `'${t}'!${c || 'A1:ZZ'}`,
  }
}));

describe('RolloverProtocol: Year-End Authority', () => {
  it('should execute a full rollover sequence with archiving and resetting', async () => {
    // 1. Mock Metadata (Find Sheet IDs)
    (googleClient.getMetadata as any).mockResolvedValueOnce({
      sheets: [
        { properties: { title: 'Income', sheetId: 101 } },
        { properties: { title: 'Expenses', sheetId: 102 } }
      ]
    });

    // 2. Mock First batchUpdate Reply (Cloning)
    (googleClient.batchUpdate as any).mockResolvedValueOnce({
      replies: [
        { duplicateSheet: { properties: { sheetId: 999 } } },
        { duplicateSheet: { properties: { sheetId: 888 } } }
      ]
    });

    // 3. Mock Column A (Headers/Categories) for both tabs
    (googleClient.getRange as any).mockResolvedValueOnce({ values: [['Income Sources'], ['Salary'], ['Total']] }); // Income Col A
    (googleClient.getRange as any).mockResolvedValueOnce({ values: [['Housing'], ['Rent'], ['Total']] }); // Expense Col A

    // 4. Mock Final batchUpdate (Protections/Wipe)
    (googleClient.batchUpdate as any).mockResolvedValueOnce({ status: 'ok' });

    await resetYearlyLedger('sheet-123', 'Income', 'Expenses', 2025);

    // Verify Call 1: Cloning Requests
    expect(googleClient.batchUpdate).toHaveBeenNthCalledWith(1, 'sheet-123', expect.arrayContaining([
      expect.objectContaining({ duplicateSheet: expect.any(Object) })
    ]));

    // Verify Call 2: Final Update (Protections and Data Reset)
    expect(googleClient.batchUpdate).toHaveBeenNthCalledWith(2, 'sheet-123', expect.arrayContaining([
      expect.objectContaining({ addProtectedRange: expect.any(Object) }),
      expect.objectContaining({ repeatCell: expect.any(Object) })
    ]));
  });

  it('should throw if it cannot find the active tabs', async () => {
    (googleClient.getMetadata as any).mockResolvedValueOnce({ sheets: [] });

    await expect(resetYearlyLedger('id', 'Inc', 'Exp', 2025)).rejects.toThrow(/Unable to locate active Ledger tabs/);
  });
});
