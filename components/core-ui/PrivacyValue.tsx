import React from 'react';
import { formatBaseCurrency, formatNativeCurrency } from '../../services/currencyService';
import { useFinancialStore } from '../../context/FinancialContext';

interface PrivacyValueProps {
  value: number | string;
  format?: 'currency' | 'percent' | 'native' | 'number';
  currency?: string;
  className?: string;
  precision?: number;
  // Added style property to allow parent components to pass inline styles (e.g. dynamic colors in charts)
  style?: React.CSSProperties;
}

/**
 * RegistryValue: Atomic Rendering Protocol
 * Centralized logic for financial values with built-in Ghost Mode compliance.
 * Uses asterisk masking for privacy instead of CSS blur for improved legibility.
 */
export const PrivacyValue: React.FC<PrivacyValueProps> = ({ 
  value, 
  format = 'currency', 
  currency, 
  className = "", 
  precision = 0,
  style
}) => {
  const { isGhostMode } = useFinancialStore();

  const formattedValue = React.useMemo(() => {
    if (typeof value === 'string') return value;
    // TypeScript narrowing ensures 'value' is a number here
    if (isNaN(value)) return '0.00';
    
    switch (format) {
      case 'currency':
        return formatBaseCurrency(value).replace(/\.00$/, '');
      case 'native':
        return formatNativeCurrency(value, currency || 'CAD').replace(/\.00$/, '');
      case 'percent':
        return `${value.toFixed(precision)}%`;
      case 'number':
        return value.toLocaleString(undefined, { 
            minimumFractionDigits: precision, 
            maximumFractionDigits: precision 
        });
      default:
        return String(value);
    }
  }, [value, format, currency, precision]);

  return (
    // Applied style prop to allow components like SpendTreemap to control text presentation
    <span className={`tabular-nums ${className}`} style={style}>
      {isGhostMode ? '*****' : formattedValue}
    </span>
  );
};
