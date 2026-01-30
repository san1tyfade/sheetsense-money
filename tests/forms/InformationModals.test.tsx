import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { SubscriptionEntryModal } from '../../components/information/SubscriptionEntryModal';
import { AccountEntryModal } from '../../components/information/AccountEntryModal';
import { renderWithContext } from '../utils/renderWithContext';

describe('Commitment & Account Modals', () => {
  it('should handle subscription creation with period logic', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <SubscriptionEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/e.g. Netflix/i), { target: { value: 'Amazon Prime' } });
    fireEvent.change(screen.getByPlaceholderText(/0.00/i), { target: { value: '99' } });

    // Select Yearly
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Yearly' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].period).toBe('Yearly');
    });
  });

  it('should capture account details including last 4 digits', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <AccountEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/e.g. AMEX/i), { target: { value: 'RBC' } });
    fireEvent.change(screen.getByPlaceholderText(/0000/i), { target: { value: '1234' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].accountNumber).toBe('1234');
    });
  });
});