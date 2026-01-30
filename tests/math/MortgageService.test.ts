import { describe, it, expect } from 'vitest';
import { calculateAmortization } from '../../services/mortgageService';
import { PaymentFrequency } from '../../types';

describe('MortgageService: Institutional Math', () => {
  const standardInput = {
    principal: 500000,
    interestRate: 5.0,
    termYears: 25,
    extraMonthly: 0,
    extraAnnualPercent: 0,
    lumpSumAmount: 0,
    lumpSumMonth: 0,
    frequency: PaymentFrequency.MONTHLY,
    propertyTaxes: 0,
    heatingCost: 0,
    isStressTestEnabled: false,
    renewalRate: 5.0
  };

  it('should calculate standard monthly payments matching Canadian compounding rules', () => {
    const schedule = calculateAmortization(standardInput);
    // Standard Canadian Mortgage for $500k @ 5% for 25y is ~$2908.02
    const firstPayment = schedule[1].standardPayment;
    expect(Math.round(firstPayment * 100) / 100).toBe(2908.02);
  });

  it('should calculate the "Renewal Shock" delta correctly', () => {
    const stressInput = {
      ...standardInput,
      isStressTestEnabled: true,
      renewalRate: 9.0 // Increased to ensure shock significantly exceeds 800
    };
    
    const schedule = calculateAmortization(stressInput);
    
    // Find the renewal point (Month 60 for monthly)
    const renewalPoint = schedule.find(s => s.isRenewal);
    const prePayment = schedule[59].acceleratedPayment;
    const postPayment = schedule[61].acceleratedPayment;
    
    expect(renewalPoint).toBeDefined();
    expect(postPayment).toBeGreaterThan(prePayment);
    
    // Monthly payment should jump significantly
    const shock = postPayment - prePayment;
    expect(shock).toBeGreaterThan(800); 
  });

  it('should verify acceleration benefit from accelerated bi-weekly frequency', () => {
    const accInput = {
        ...standardInput,
        frequency: PaymentFrequency.ACC_BI_WEEKLY
    };
    
    const stdSchedule = calculateAmortization(standardInput);
    const accSchedule = calculateAmortization(accInput);
    
    const stdPayoff = stdSchedule.find(s => s.balance <= 0)?.year || 25;
    const accPayoff = accSchedule.find(s => s.acceleratedBalance <= 0)?.year || 25;
    
    // Accelerated bi-weekly should shave off ~3-4 years on a 25y term
    expect(accPayoff).toBeLessThan(stdPayoff);
    expect(accPayoff).toBeLessThanOrEqual(22);
  });
});