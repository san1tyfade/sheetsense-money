import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { IncomeLedger } from '../../components/income/IncomeLedger';
import { renderWithContext } from '../utils/renderWithContext';
import { LedgerData } from '../../types';

describe('LedgerEditableCell: Interaction Flow', () => {
  const mockData: LedgerData = {
    months: ['Jan'],
    categories: [
        { name: 'Income', subCategories: [{ name: 'Salary', monthlyValues: [5000], total: 5000 }], total: 5000 }
    ]
  };

  it('should enter edit mode on click and save on Enter key', async () => {
    const onUpdate = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <IncomeLedger 
        incomeData={mockData}
        expenseData={{ months: [], categories: [] }}
        isLoading={false}
        onUpdateIncome={onUpdate}
        onUpdateExpense={vi.fn()}
      />
    );

    // Click the salary value
    const cell = screen.getByText('5,000');
    fireEvent.click(cell);

    // Cell should transform to input
    const input = screen.getByDisplayValue('5000');
    fireEvent.change(input, { target: { value: '6000' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('Income', 'Salary', 0, 6000);
    });
  });

  it('should revert value and exit edit mode on Escape key', () => {
    renderWithContext(
        <IncomeLedger 
          incomeData={mockData}
          expenseData={{ months: [], categories: [] }}
          isLoading={false}
          onUpdateIncome={vi.fn()}
          onUpdateExpense={vi.fn()}
        />
    );

    fireEvent.click(screen.getByText('5,000'));
    const input = screen.getByDisplayValue('5000');
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Input should be gone, old value should remain
    expect(screen.queryByDisplayValue('9999')).toBeNull();
    expect(screen.getByText('5,000')).toBeDefined();
  });
});