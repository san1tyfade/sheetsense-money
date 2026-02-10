
import { ExchangeRates } from '../types';

export const PRIMARY_CURRENCY = 'CAD';



/**
 * Returns a flag emoji for common currencies.
 */
export const getCurrencyFlag = (currency: string = 'CAD'): string => {
  const code = currency.toUpperCase().trim();
  const map: Record<string, string> = {
    'CAD': '🇨🇦',
    'USD': '🇺🇸',
    'EUR': '🇪🇺',
    'GBP': '🇬🇧',
    'JPY': '🇯🇵',
    'AUD': '🇦🇺',
    'CHF': '🇨🇭',
    'BTC': '₿',
    'ETH': 'Ξ'
  };
  return map[code] || '🌐';
};

/**
 * Converts a foreign amount to the primary base currency (CAD).
 */
export const convertToBase = (amount: number, currency: string = 'CAD', rates?: ExchangeRates): number => {
  if (!currency || currency.toUpperCase() === PRIMARY_CURRENCY) return amount;
  const code = currency.toUpperCase().trim();

  // Use provided rates map. If missing, we prefer a known fallback over 1.0
  if (!rates || rates[code] === undefined) {
    if (code === 'USD') return amount * 1.35; // Sensible hard-coded fallback for USD if API is dead
    return amount;
  }

  return amount * rates[code];
};

export const formatBaseCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: PRIMARY_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Standardized currency formatter with configurable precision.
 */
export const formatCurrency = (value: number, min = 2, max = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
};

export const formatNativeCurrency = (amount: number, currency: string) => {
  try {
    const code = (currency || PRIMARY_CURRENCY).toUpperCase().trim();
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    // Fallback for invalid currency codes
    return `${currency || '$'} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};
