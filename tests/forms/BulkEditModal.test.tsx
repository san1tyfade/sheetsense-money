import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkEditModal } from '../../components/core-ui/BulkEditModal';
import { renderWithContext } from '../utils/renderWithContext';

describe('BulkEditModal: Batch Protocol', () => {
  it('should call onConfirm with the new value for multiple nodes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    renderWithContext(
      <BulkEditModal 
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        count={5}
        fieldName="Category"
        description="Select new category"
        options={[
            { value: 'Housing', label: 'Housing' },
            { value: 'Food', label: 'Food' }
        ]}
      />
    );

    expect(screen.getByText(/5 selected items/i)).toBeDefined();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Housing' } });

    const submitBtn = screen.getByRole('button', { name: /Apply Transformation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Housing');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should block submission if no value is selected', async () => {
    const onConfirm = vi.fn();
    renderWithContext(
      <BulkEditModal 
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        count={2}
        fieldName="Test"
        description="Desc"
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Apply Transformation/i });
    fireEvent.click(submitBtn);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});