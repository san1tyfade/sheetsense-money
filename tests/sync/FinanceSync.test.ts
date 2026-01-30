import { describe, it, expect, vi } from 'vitest';
import { useFinanceSync } from '../../hooks/useFinanceSync';
import { renderHook, waitFor } from '@testing-library/react';
import { SheetConfig } from '../../types';

// Mock authService at the top level to ensure all consumers (like GoogleClient) get the mocked versions
vi.mock('../../services/authService', () => ({
  signIn: vi.fn().mockResolvedValue({ token: 'fake-token', expires: Date.now() + 3600000 }),
  getAccessToken: vi.fn().mockReturnValue('fake-token')
}));

// Mock dispatcher to capture synced data
const mockDispatcher = {
  setAssets: vi.fn(),
  setInvestments: vi.fn(),
  setTrades: vi.fn(),
  setSubscriptions: vi.fn(),
  setAccounts: vi.fn(),
  setJournalEntries: vi.fn(),
  setNetWorthHistory: vi.fn(),
  setPortfolioHistory: vi.fn(),
  setDebtEntries: vi.fn(),
  setIncomeData: vi.fn(),
  setExpenseData: vi.fn(),
  setDetailedIncome: vi.fn(),
  setDetailedExpenses: vi.fn(),
  setLastUpdatedStr: vi.fn(),
  setAuthSession: vi.fn(),
  setActiveYear: vi.fn(),
};

const mockConfig: SheetConfig = {
  sheetId: 'test-sheet-id',
  clientId: 'test-client-id',
  tabNames: {
    assets: 'Assets',
    investments: 'Investments',
    trades: 'Trades',
    subscriptions: 'Subscriptions',
    accounts: 'Institutions',
    logData: 'logdata',
    portfolioLog: 'portfoliolog',
    debt: 'debt',
    income: 'Income',
    expenses: 'Expenses',
    journal: 'journal'
  }
};

describe('FinanceSync: Network Orchestration', () => {
  it('should successfully fetch and dispatch asset data from the mock cloud', async () => {
    const { result } = renderHook(() => useFinanceSync(mockConfig, mockDispatcher as any, 2024, 2024));
    
    // Trigger sync for assets only
    await result.current.sync(['assets']);

    await waitFor(() => {
      expect(mockDispatcher.setAssets).toHaveBeenCalled();
      const dispatchedAssets = mockDispatcher.setAssets.mock.calls[0][0];
      expect(dispatchedAssets).toHaveLength(3);
      expect(dispatchedAssets[0].name).toBe('Checking Account');
    });
  });

  it('should handle network failures gracefully', async () => {
    // Simulate API breakdown
    const { server } = await import('../mocks/server');
    const { http, HttpResponse } = await import('msw');
    
    server.use(
      http.get('https://sheets.googleapis.com/v4/spreadsheets/:id/values/:range', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useFinanceSync(mockConfig, mockDispatcher as any, 2024, 2024));
    
    await result.current.sync(['assets']);

    await waitFor(() => {
      expect(result.current.syncStatus?.type).toBe('error');
    });
  });
});
