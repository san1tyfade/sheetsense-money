import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { ManagedRegistryView } from '../../components/core-ui/ManagedRegistryView';
import { renderWithContext } from '../utils/renderWithContext';
import { EntityFactory } from '../fixtures/EntityFactory';
import { Asset } from '../../types';

describe('ManagedRegistryView: Interaction Patterns', () => {
  const mockData: Asset[] = [
    EntityFactory.createAsset({ name: 'Checking Account', type: 'Cash', value: 5000 }),
    EntityFactory.createAsset({ name: 'Savings Account', type: 'Cash', value: 15000 }),
    EntityFactory.createAsset({ name: 'Tesla Stock', type: 'Investment', value: 2000 })
  ];

  const mockColumns = [
    { key: 'name', header: 'Identity' },
    { key: 'value', header: 'Value', align: 'right' as const }
  ];

  it('should filter rows based on the search input', async () => {
    renderWithContext(
      <ManagedRegistryView<Asset>
        data={mockData}
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

    const rows = screen.getAllByRole('row');
    // Header + 1 filtered row
    expect(rows.length).toBe(2); 
    expect(within(rows[1]).getByText(/Tesla/i)).toBeDefined();
  });

  it('should show the action matrix when a row is selected', () => {
    renderWithContext(
      <ManagedRegistryView<Asset>
        data={mockData}
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

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); 

    expect(screen.getByText(/1 Nodes Selected/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /purge/i })).toBeDefined();
  });
});