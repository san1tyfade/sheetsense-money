import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { LedgerIntegrationModal } from '../../components/tools/LedgerIntegrationModal';
import { renderWithContext } from '../utils/renderWithContext';
import { Transaction, LedgerData } from '../../types';

describe('LedgerIntegrationModal: Bridge Logic', () => {
  const mockTransactions: Transaction[] = [
    { id: '1', date: '2024-05-15', description: 'Walmart', amount: 100, category: 'Food', type: 'Purchase' },
    { id: '2', date: '2024-05-20', description: 'Shell', amount: 50, category: 'Transport', type: 'Purchase' }
  ];

  const mockLedger: LedgerData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    categories: [
        { name: 'Living', subCategories: [{ name: 'Groceries', monthlyValues: [0,0,0,0,0,0], total: 0 }], total: 0 }
    ]
  };

  it('should automatically detect the target month from transaction dates', async () => {
    renderWithContext(
      <LedgerIntegrationModal 
        isOpen={true}
        onClose={vi.fn()}
        transactions={mockTransactions}
        ledgerData={mockLedger}
        onCommit={vi.fn()}
      />
    );

    // May is index 4 (0-based)
    const monthSelect = screen.getByLabelText(/Target Period/i) as HTMLSelectElement;
    expect(monthSelect.value).toBe("4");
  });

  it('should aggregate transactions by their mappings on commit', async () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <LedgerIntegrationModal 
        isOpen={true}
        onClose={vi.fn()}
        transactions={mockTransactions}
        ledgerData={mockLedger}
        onCommit={onCommit}
      />
    );

    // Map "Food" to "Groceries"
    const selects = screen.getAllByRole('combobox');
    // Index 0 is month, index 1 is strategy, subsequent are mappings
    fireEvent.change(selects[2], { target: { value: 'Living|Groceries' } });

    const submitBtn = screen.getByRole('button', { name: /Commit to Ledger/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onCommit).toHaveBeenCalled();
      const updates = onCommit.mock.calls[0][2];
      // Total amount for Food (Walmart) was 100
      expect(updates[0].value).toBe(100);
      expect(updates[0].ledgerSubCategory).toBe('Groceries');
    });
  });
});