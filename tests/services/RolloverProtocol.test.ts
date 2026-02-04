import { describe, it, expect, vi } from 'vitest';
import { resetYearlyLedger } from '../../services/sheetWriteService';
import { googleClient } from '../../services/infrastructure/GoogleClient';

vi.mock('../../services/infrastructure/GoogleClient', async () => {
  const { createMockGoogleClient } = await import('../factories/googleClientFactory');
  return createMockGoogleClient();
});

describe('RolloverProtocol: Year-End Authority', () => {
  it('should execute a full rollover sequence with archiving and resetting', async () => {
    // 1. Mock Metadata (Find Sheet IDs)
    (googleClient.request as any).mockResolvedValueOnce({
      sheets: [
        { properties: { title: 'Income', sheetId: 101 } },
        { properties: { title: 'Expenses', sheetId: 102 } }
      ]
    });

    // 2. Mock First batchUpdate Reply (Cloning)
    (googleClient.request as any).mockResolvedValueOnce({
      replies: [
        { duplicateSheet: { properties: { sheetId: 999 } } },
        { duplicateSheet: { properties: { sheetId: 888 } } }
      ]
    });

    // 3. Mock Column A (Headers/Categories) for both tabs using .request authority
    (googleClient.request as any).mockResolvedValueOnce({ values: [['Income Sources'], ['Salary'], ['Total']] }); // Income Col A
    (googleClient.request as any).mockResolvedValueOnce({ values: [['Housing'], ['Rent'], ['Total']] }); // Expense Col A

    // 4. Mock Final batchUpdate (Protections/Wipe)
    (googleClient.request as any).mockResolvedValueOnce({ status: 'ok' });

    await resetYearlyLedger('sheet-123', 'Income', 'Expenses', 2025);

    // Verify Call 1: Metadata fetch
    expect(googleClient.request).toHaveBeenNthCalledWith(1, expect.stringContaining('fields=sheets.properties'));

    // Verify Call 2: Cloning Requests
    const cloneCall = (googleClient.request as any).mock.calls[1];
    expect(cloneCall[0]).toContain('batchUpdate');
    expect(cloneCall[1].body.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ duplicateSheet: expect.any(Object) })
      ])
    );

    // Verify Call 5 (Final Stage): Protections and Data Reset
    const lastCall = (googleClient.request as any).mock.calls[4];
    expect(lastCall[0]).toContain('batchUpdate');
    expect(lastCall[1].body.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ addProtectedRange: expect.any(Object) }),
        expect.objectContaining({ repeatCell: expect.any(Object) })
      ])
    );
  });

  it('should throw if it cannot find the active tabs', async () => {
    (googleClient.request as any).mockResolvedValueOnce({ sheets: [] });

    await expect(resetYearlyLedger('id', 'Inc', 'Exp', 2025)).rejects.toThrow(/Unable to locate active Ledger tabs/);
  });
});