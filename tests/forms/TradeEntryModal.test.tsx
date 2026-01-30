import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TradeEntryModal } from '../../components/trades/TradeEntryModal';
import { renderWithContext } from '../utils/renderWithContext';

describe('TradeEntryModal: Transaction Logic', () => {
  it('should automatically calculate total settlement when quantity and price change', async () => {
    const onSave = vi.fn();
    renderWithContext(
      <TradeEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    const tickerInput = screen.getByPlaceholderText(/e.g. AAPL/i);
    const qtyInput = screen.getByPlaceholderText(/0.0000/i);
    const priceInput = screen.getByPlaceholderText(/0.00$/i); // Price placeholder

    // Enter Trade Details
    fireEvent.change(tickerInput, { target: { value: 'AAPL' } });
    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.change(priceInput, { target: { value: '150' } });

    // Total should be 1500 (10 * 150)
    expect(screen.getByText(/\$1,500/i)).toBeDefined();

    // Add a Fee
    const feeInput = screen.getAllByPlaceholderText(/0.00$/i)[1]; // Fee is second numeric input
    fireEvent.change(feeInput, { target: { value: '10' } });

    // Total should be 1510 (BUY includes fee)
    expect(screen.getByText(/\$1,510/i)).toBeDefined();
  });

  it('should switch to negative settlement for SELL operations', () => {
    renderWithContext(
      <TradeEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );

    const sellToggle = screen.getByRole('button', { name: /SELL/i });
    const qtyInput = screen.getByPlaceholderText(/0.0000/i);
    const priceInput = screen.getByPlaceholderText(/0.00$/i);

    fireEvent.click(sellToggle);
    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.change(priceInput, { target: { value: '100' } });

    // Sell Label should appear
    expect(screen.getByText(/Proceeds Value/i)).toBeDefined();
    expect(screen.getByText(/\$1,000/i)).toBeDefined();
  });

  it('should normalize tickers to uppercase on input', () => {
    renderWithContext(
      <TradeEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );

    const tickerInput = screen.getByPlaceholderText(/e.g. AAPL/i);
    fireEvent.change(tickerInput, { target: { value: 'btc' } });

    expect(tickerInput.value).toBe('BTC');
  });

  it('should call onSave with a complete payload upon submission', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithContext(
      <TradeEntryModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onSave={onSave} 
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/e.g. AAPL/i), { target: { value: 'MSFT' } });
    fireEvent.change(screen.getByPlaceholderText(/0.0000/i), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText(/0.00$/i), { target: { value: '400' } });

    const submitBtn = screen.getByRole('button', { name: /Log Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      const payload = onSave.mock.calls[0][0];
      expect(payload.ticker).toBe('MSFT');
      expect(payload.total).toBe(2000); // 5 * 400
    });
  });
});