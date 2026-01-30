import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetEntryModal } from '../../components/assets/AssetEntryModal';
import { renderWithContext } from '../utils/renderWithContext';

describe('AssetEntryModal: Inventory Logic', () => {
  it('should allow selecting currency and classification', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <AssetEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Primary Checking/i);
    const valueInput = screen.getByPlaceholderText(/0.00/i);
    
    fireEvent.change(nameInput, { target: { value: 'US Savings' } });
    fireEvent.change(valueInput, { target: { value: '1000' } });

    // Change currency to USD
    const selects = screen.getAllByRole('combobox');
    // Schema defines type then currency. Currency is usually 2nd select
    fireEvent.change(selects[1], { target: { value: 'USD' } });

    const submitBtn = screen.getByRole('button', { name: /Register Asset/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      const payload = onSave.mock.calls[0][0];
      expect(payload.currency).toBe('USD');
      expect(payload.value).toBe(1000);
    });
  });

  it('should not submit if required fields are missing', async () => {
    const onSave = vi.fn();
    renderWithContext(
      <AssetEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Register Asset/i });
    fireEvent.click(submitBtn);

    expect(onSave).not.toHaveBeenCalled();
  });
});