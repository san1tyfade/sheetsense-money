
import { MortgageInput, AmortizationPoint, PaymentFrequency } from "../types";

export const RENEWAL_YEAR_BENCHMARK = 5;

/**
 * Calculates mortgage amortization schedules for standard and accelerated paths.
 * Adheres to Canadian semi-annual compounding standards.
 */
export const calculateAmortization = (input: MortgageInput): AmortizationPoint[] => {
  const { 
    principal, 
    interestRate, 
    termYears, 
    extraMonthly, 
    extraAnnualPercent, 
    lumpSumAmount, 
    lumpSumMonth,
    frequency,
    propertyTaxes,
    heatingCost,
    isStressTestEnabled,
    renewalRate
  } = input;
  
  const annualRateStart = interestRate / 100;
  const annualRateRenewal = renewalRate / 100;

  // Canadian semi-annual compounding formula: (1 + r_annual/2)^(2/p) - 1
  const getPeriodicRate = (annualRate: number, periodsPerYear: number) => 
    Math.pow(Math.pow(1 + annualRate / 2, 2), 1 / periodsPerYear) - 1;

  // Setup periodic factors
  let periodsPerYear = frequency === PaymentFrequency.MONTHLY ? 12 : 26;
  const totalPeriods = termYears * periodsPerYear;
  const renewalPeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;

  const calculatePayment = (p: number, rate: number, n: number) => 
    p * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);

  // Initial Rates and Payments
  let currentPeriodicRate = getPeriodicRate(annualRateStart, periodsPerYear);
  let currentStdPeriodicPayment = calculatePayment(principal, currentPeriodicRate, totalPeriods);
  
  // Accelerated path often uses (Monthly / 2) as a benchmark even if paying bi-weekly
  const monthlyBenchmarkRate = getPeriodicRate(annualRateStart, 12);
  const monthlyBenchmarkPayment = calculatePayment(principal, monthlyBenchmarkRate, termYears * 12);
  
  let currentAccPeriodicPayment = (frequency === PaymentFrequency.ACC_BI_WEEKLY) 
    ? monthlyBenchmarkPayment / 2 
    : currentStdPeriodicPayment;

  // Periodic Carrying Costs
  const periodicTaxes = propertyTaxes / periodsPerYear;
  const periodicHeating = (heatingCost * 12) / periodsPerYear;

  const schedule: AmortizationPoint[] = [];
  let currentStdBalance = principal;
  let currentAccBalance = principal;
  let totalStdInterest = 0;
  let totalAccInterest = 0;

  for (let p = 0; p <= totalPeriods; p++) {
    const year = Math.floor(p / periodsPerYear);
    const monthIndex = Math.floor(p / (periodsPerYear / 12));
    const isRenewalPoint = isStressTestEnabled && p === renewalPeriod;

    // Handle Renewal Shock: Recalculate remaining payments
    if (isRenewalPoint) {
      const remainingPeriods = totalPeriods - p;
      const newRate = getPeriodicRate(annualRateRenewal, periodsPerYear);
      const newMonthlyRate = getPeriodicRate(annualRateRenewal, 12);
      
      // Path 1: Standard
      currentStdPeriodicPayment = calculatePayment(currentStdBalance, newRate, remainingPeriods);
      
      // Path 2: Accelerated (Maintain acceleration ratio)
      const newMonthlyBenchmark = calculatePayment(currentAccBalance, newMonthlyRate, (termYears - RENEWAL_YEAR_BENCHMARK) * 12);
      currentAccPeriodicPayment = (frequency === PaymentFrequency.ACC_BI_WEEKLY)
        ? newMonthlyBenchmark / 2
        : calculatePayment(currentAccBalance, newRate, remainingPeriods);
      
      currentPeriodicRate = newRate;
    }

    const isEndOfMonth = frequency === PaymentFrequency.MONTHLY || (p > 0 && p % Math.round(periodsPerYear / 12) === 0);

    let actualStdPayment = p === 0 ? 0 : currentStdPeriodicPayment;
    let actualAccPayment = 0;
    let currentExtra = 0;
    let currentLumpSum = 0;

    if (p > 0 && currentAccBalance > 0) {
      const accInterest = currentAccBalance * currentPeriodicRate;
      
      if (isEndOfMonth) {
        currentExtra = extraMonthly * Math.pow(1 + (extraAnnualPercent / 100), year);
        if (monthIndex === lumpSumMonth) currentLumpSum = lumpSumAmount;
      }

      actualAccPayment = Math.min(currentAccPeriodicPayment + currentExtra + currentLumpSum, currentAccBalance + accInterest);
    }
    
    schedule.push({
      period: p,
      year: year,
      monthLabel: monthIndex,
      balance: Math.max(0, currentStdBalance),
      acceleratedBalance: Math.max(0, currentAccBalance),
      totalInterest: totalStdInterest,
      acceleratedTotalInterest: totalAccInterest,
      standardPayment: actualStdPayment,
      acceleratedPayment: actualAccPayment,
      extraMonthly: currentExtra,
      lumpSum: currentLumpSum,
      pithTotal: (p === 0) ? 0 : actualAccPayment + periodicTaxes + periodicHeating,
      isRenewal: isRenewalPoint
    });

    if (p === totalPeriods) break;

    // Apply payments for next period
    const stdInterest = currentStdBalance * currentPeriodicRate;
    totalStdInterest += stdInterest;
    currentStdBalance -= (currentStdPeriodicPayment - stdInterest);

    if (currentAccBalance > 0) {
      const accInterest = currentAccBalance * currentPeriodicRate;
      totalAccInterest += accInterest;
      currentAccBalance -= (actualAccPayment - accInterest);
    }
  }

  return schedule;
};
