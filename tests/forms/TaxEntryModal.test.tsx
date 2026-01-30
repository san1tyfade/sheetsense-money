import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TaxRoomTracker } from '../../components/information/TaxRoomTracker';
import { renderWithContext } from '../utils/renderWithContext';

describe('TaxEntryModal: Regulatory Logic', () => {
  it('should capture a new TFSA contribution event', async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <TaxRoomTracker 
        taxRecords={[]} 
        onAddTaxRecord={onAdd} 
      />
    );

    // Trigger registration modal
    const registerBtn = screen.getByRole('button', { name: /Register Event/i });
    fireEvent.click(registerBtn);

    // Fill form
    const valueInput = screen.getByLabelText(/Value/i);
    const descInput = screen.getByPlaceholderText(/e.g. 2025 Standard Limit Increase/i);

    fireEvent.change(valueInput, { target: { value: '6500' } });
    fireEvent.change(descInput, { target: { value: 'Annual Contribution' } });

    const submitBtn = screen.getByRole('button', { name: /Log Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalled();
      const payload = onAdd.mock.calls[0][0];
      expect(payload.value).toBe(6500);
      expect(payload.recordType).toBe('TFSA'); // Default
      expect(payload.transactionType).toBe('Contribution');
    });
  });

  it('should allow switching to Withdrawal type', async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    renderWithContext(<TaxRoomTracker taxRecords={[]} onAddTaxRecord={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: /Register Event/i }));
    
    const typeSelect = screen.getByLabelText(/Event Type/i);
    fireEvent.change(typeSelect, { target: { value: 'WITHDRAWAL' } });
    
    fireEvent.change(screen.getByLabelText(/Value/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /Log Transaction/i }));

    await waitFor(() => {
        expect(onAdd.mock.calls[0][0].transactionType).toBe('WITHDRAWAL');
    });
  });
});