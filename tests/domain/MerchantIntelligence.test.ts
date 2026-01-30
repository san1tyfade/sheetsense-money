
import { describe, it, expect } from 'vitest';
import { aggregateMerchantProfiles, getTransactionAnomaly } from '../../services/domain/merchantService';
import { Transaction, Subscription } from '../../types';

describe('MerchantIntelligence: Behavioral Engine', () => {
  // Generate relative dates to stay inside the 12-month rolling window
  const now = new Date();
  const getRelativeDate = (monthsAgo: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.toISOString().split('T')[0];
  };

  const d0 = getRelativeDate(0); // Current Month
  const d1 = getRelativeDate(1); // Last Month
  const d2 = getRelativeDate(2); // 2 Months Ago

  const mockTransactions: Transaction[] = [
    { id: '1', date: d2, description: 'NETFLIX', amount: 20, type: 'EXPENSE', category: 'Entertainment' },
    { id: '2', date: d1, description: 'NETFLIX', amount: 20, type: 'EXPENSE', category: 'Entertainment' },
    { id: '3', date: d0, description: 'NETFLIX', amount: 20, type: 'EXPENSE', category: 'Entertainment' },
    { id: '4', date: d0, description: 'AMAZON', amount: 500, type: 'EXPENSE', category: 'Shopping' }
  ];

  it('should detect a Monthly cadence for recurring merchants', () => {
    const profiles = aggregateMerchantProfiles(mockTransactions, mockTransactions);
    const netflix = profiles.find(p => p.identity === 'NETFLIX');
    
    expect(netflix).toBeDefined();
    expect(netflix?.cadence).toBe('MONTHLY');
    expect(netflix?.stats.median).toBe(20);
    expect(netflix?.pulse[0]).toBe(true); // Pulse for current month
  });

  it('should identify spending shocks correctly', () => {
    const profiles = aggregateMerchantProfiles(mockTransactions, mockTransactions);
    
    // Create a new transaction that is a shock compared to profile (5x typical)
    const shockTx: Transaction = { 
        id: '5', date: d0, description: 'NETFLIX', amount: 100, type: 'EXPENSE', category: 'Entertainment' 
    };
    
    const netflixProfile = profiles.find(p => p.identity === 'NETFLIX');
    const anomaly = getTransactionAnomaly(shockTx, netflixProfile);
    
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('SHOCK');
    expect(anomaly?.variance).toBe(400); // (100 - 20) / 20 * 100
  });

  it('should flag unregistered recurring merchants for conversion', () => {
    const registry: Subscription[] = [{ id: 'sub1', name: 'Spotify', cost: 10, period: 'Monthly', category: 'Music', active: true }];
    // Netflix is in tx but not in registry
    const profiles = aggregateMerchantProfiles(mockTransactions, mockTransactions, registry);
    const netflix = profiles.find(p => p.identity === 'NETFLIX');
    
    expect(netflix?.isUnregistered).toBe(true);
  });
});
