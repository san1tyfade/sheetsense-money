
import { describe, it, expect } from 'vitest';
import { reconcileInvestments } from '../../services/portfolioService';
import { Investment, Trade } from '../../types';

describe('PortfolioReconciliation: Position Integrity', () => {
  const mockInvestments: Investment[] = [
    { id: '1', ticker: 'AAPL', name: 'Apple', quantity: 10, avgPrice: 150, currentPrice: 180, accountName: 'Questrade', assetClass: 'Equity' },
    { id: '2', ticker: 'AAPL', name: 'Apple', quantity: 5, avgPrice: 140, currentPrice: 180, accountName: 'Wealthsimple', assetClass: 'Equity' }
  ];

  it('should proportionally distribute net trades across existing accounts', () => {
    // Net BUY of 30 shares
    const trades: Trade[] = [
      { id: 't1', ticker: 'AAPL', type: 'BUY', quantity: 30, price: 170, total: 5100, date: '2024-01-01' }
    ];

    const result = reconcileInvestments(mockInvestments, trades);
    
    const questradePos = result.find(i => i.accountName === 'Questrade');
    const wealthPos = result.find(i => i.accountName === 'Wealthsimple');

    // Total sheet qty = 15. Questrade has 10 (2/3), WS has 5 (1/3).
    // Questrade gets 2/3 of 30 = 20. New total = 10 + 20 = 30.
    // WS gets 1/3 of 30 = 10. New total = 5 + 10 = 15.
    expect(questradePos?.quantity).toBe(30);
    expect(wealthPos?.quantity).toBe(15);
  });

  it('should detect new tickers found only in trades as derived positions', () => {
    const trades: Trade[] = [
      { id: 't2', ticker: 'TSLA', type: 'BUY', quantity: 10, price: 200, total: 2000, date: '2024-01-01' }
    ];

    const result = reconcileInvestments(mockInvestments, trades);
    
    const tslaPos = result.find(i => i.ticker === 'TSLA');
    expect(tslaPos).toBeDefined();
    expect(tslaPos?.accountName).toBe('Trade Derived');
    expect(tslaPos?.quantity).toBe(10);
  });

  it('should correctly handle a full exit of a position', () => {
    const trades: Trade[] = [
        { id: 't3', ticker: 'AAPL', type: 'SELL', quantity: 15, price: 200, total: 3000, date: '2024-01-01' }
    ];
    
    const result = reconcileInvestments(mockInvestments, trades);
    const aaplPositions = result.filter(i => i.ticker === 'AAPL');
    
    // Sum of quantities should be 0
    const totalQty = aaplPositions.reduce((s, i) => s + i.quantity, 0);
    expect(totalQty).toBe(0);
  });

  it('should ignore fully exited derived positions', () => {
    const trades: Trade[] = [
        { id: 't4', ticker: 'MSFT', type: 'BUY', quantity: 10, price: 300, total: 3000, date: '2024-01-01' },
        { id: 't5', ticker: 'MSFT', type: 'SELL', quantity: 10, price: 350, total: 3500, date: '2024-02-01' }
    ];
    
    const result = reconcileInvestments(mockInvestments, trades);
    const msftPos = result.find(i => i.ticker === 'MSFT');
    expect(msftPos).toBeUndefined();
  });
});
