import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { ManagedRegistryView } from '../../components/core-ui/ManagedRegistryView';
import { renderWithContext } from '../utils/renderWithContext';
import { Asset } from '../../types';

describe('ManagedRegistryView: Interaction Patterns', () => {
  const mockData: Asset[] = [
    { id: '1', name: 'Checking Account', type: 'Cash', value: 5000, currency: 'CAD' },
    { id: '2', name: 'Savings Account', type: 'Cash', value: 15000, currency: 'CAD' },
    { id: '3', name: 'Tesla Stock', type: 'Investment', value: 2000, currency: 'USD' }
  ];

  const mockColumns = [
    { key: 'name', header: 'Identity' },
    { key: 'value', header: 'Value', align: 'right' as const }
  ];

  it('should filter rows based on the search input', async () => {
    renderWithContext(
      <ManagedRegistryView<Asset>
        schemaId="assets"
        tabKey="assets"
        data={mockData}
        setData={vi.fn()}
        columns={mockColumns}
        sortFns={{}}
        filterFn={(a, term) => a.name.toLowerCase().includes(term.toLowerCase())}
        defaultSort="name"
        title="Asset"
        titleAccent="Registry"
        modalType="ASSET"
        label="Assets"
      />
    );

    // Expand search
    const searchBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchBtn);

    const searchInput = screen.getByPlaceholderText(/DISCOVER/i);
    fireEvent.change(searchInput, { target: { value: 'Tesla' } });

    // Verify rows (Wait for filter to apply - standard debounce or memo cycle)
    const rows = screen.getAllByRole('row');
    // Header + 1 filtered row
    expect(rows.length).toBe(2); 
    expect(within(rows[1]).getByText(/Tesla/i)).toBeDefined();
  });

  it('should show the action matrix when a row is selected', () => {
    renderWithContext(
      <ManagedRegistryView<Asset>
        schemaId="assets"
        tabKey="assets"
        data={mockData}
        setData={vi.fn()}
        columns={mockColumns}
        sortFns={{}}
        filterFn={() => true}
        defaultSort="name"
        title="Asset"
        titleAccent="Registry"
        modalType="ASSET"
        label="Assets"
      />
    );

    // Click first row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Index 0 is "Select All" in header

    // Selection matrix should appear
    expect(screen.getByText(/1 Nodes Selected/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /purge/i })).toBeDefined();
  });
});