import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFinanceSync } from '../../hooks/useFinanceSync';
import { Asset } from '../../types';

// Mock authService to prevent internal sync failure
vi.mock('../../services/authService', () => ({
  signIn: vi.fn().mockResolvedValue({ token: 'fake-token', expires: Date.now() + 3600000 }),
  getAccessToken: vi.fn().mockReturnValue('fake-token')
}));

const mockConfig = {
  sheetId: 'test-id',
  clientId: 'client-id',
  tabNames: { assets: 'Assets' }
} as any;

const mockDispatcher = {
  setAssets: vi.fn(),
  setAuthSession: vi.fn(),
  setLastUpdatedStr: vi.fn()
};

describe('FinanceSync: Conflict Logic', () => {
  it('should set conflict state if local data is dirty during a sync request', async () => {
    // 1. Create a "dirty" local pool
    const localPool: Asset[] = [{
        id: '1', name: 'Dirty Asset', type: 'Cash', value: 100, currency: 'CAD', isDirty: true 
    }];

    const { result } = renderHook(() => useFinanceSync(mockConfig, mockDispatcher as any, 2024, 2024));
    
    // 2. Attempt sync while providing the dirty pool
    // Note: We don't await result.current.sync because it throws/rejects on conflict
    result.current.sync(['assets'], { assets: localPool }).catch(() => {});

    // 3. Verify protocol blocked sync and flagged conflict
    await waitFor(() => {
        expect(result.current.conflict).not.toBeNull();
        expect(result.current.conflict?.tab).toBe('assets');
        expect(result.current.conflict?.dirtyCount).toBe(1);
    });
    
    expect(mockDispatcher.setAssets).not.toHaveBeenCalled();
  });

  it('should proceed with sync if no local data is dirty', async () => {
    const cleanPool: Asset[] = [{
        id: '1', name: 'Clean Asset', type: 'Cash', value: 100, currency: 'CAD', isDirty: false
    }];

    const { result } = renderHook(() => useFinanceSync(mockConfig, mockDispatcher as any, 2024, 2024));
    
    await result.current.sync(['assets'], { assets: cleanPool });

    await waitFor(() => {
        expect(result.current.conflict).toBeNull();
        expect(mockDispatcher.setAssets).toHaveBeenCalled();
    });
  });
});