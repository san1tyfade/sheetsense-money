
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { GlobalSearchOverlay } from '../../components/GlobalSearchOverlay';
import { renderWithContext } from '../utils/renderWithContext';
import { useInterface } from '../../context/InterfaceContext';

const TestSearchOpener = () => {
    const { setIsSearchOpen } = useInterface();
    useEffect(() => { 
        setIsSearchOpen(true); 
    }, [setIsSearchOpen]);
    return null;
};

describe('GlobalDiscovery: NLP Command Engine', () => {
  it('should parse the +t command for rapid trade entry', async () => {
    renderWithContext(
      <>
        <TestSearchOpener />
        <GlobalSearchOverlay />
      </>
    );
    
    const searchInput = screen.getByPlaceholderText(/DISCOVER NODES OR TYPE \+ FOR COMMANDS\.\.\./i);
    fireEvent.change(searchInput, { target: { value: '+t AAPL 10 220' } });

    // Look for the command button
    const commandBtn = screen.getByText(/Add Trade: AAPL/i);
    expect(commandBtn).toBeDefined();
    
    // Verify instructional key hint
    expect(screen.getByText(/ENTER/i)).toBeDefined();
  });

  it('should parse the +a command for asset registration', () => {
    renderWithContext(
      <>
        <TestSearchOpener />
        <GlobalSearchOverlay />
      </>
    );
    const searchInput = screen.getByPlaceholderText(/DISCOVER NODES OR TYPE \+ FOR COMMANDS\.\.\./i);
    
    fireEvent.change(searchInput, { target: { value: '+a New House 750000' } });
    
    expect(screen.getByText(/Register Asset: New House/i)).toBeDefined();
  });

  it('should show syntax help when typing just +', () => {
    renderWithContext(
        <>
          <TestSearchOpener />
          <GlobalSearchOverlay />
        </>
      );
      const searchInput = screen.getByPlaceholderText(/DISCOVER NODES OR TYPE \+ FOR COMMANDS\.\.\./i);
      fireEvent.change(searchInput, { target: { value: '+' } });
      
      expect(screen.getByText(/Trade Ledger/i)).toBeDefined();
      expect(screen.getByText(/\[TICKER\] \[QTY\] \[PRICE\]/i)).toBeDefined();
  });
});
