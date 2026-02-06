import React from 'react';
import { formatBaseCurrency, formatNativeCurrency } from '../../services/currencyService';
import { useFinancialStore } from '../../context/FinancialContext';

interface PrivacyValueProps {
  value: number | string | undefined | null;
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
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    
    // Convert to number if it's a numeric string that slipped through
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    
    // STRICT VALIDATION FIX: 
    // Only return fallback if it's truly Not-a-Number after parsing
    if (isNaN(num)) return '0.00';
    
    switch (format) {
      case 'currency':
        return formatBaseCurrency(num).replace(/\.00$/, '');
      case 'native':
        return formatNativeCurrency(num, currency || 'CAD').replace(/\.00$/, '');
      case 'percent':
        return `${num.toFixed(precision)}%`;
      case 'number':
        return num.toLocaleString(undefined, { 
            minimumFractionDigits: precision, 
            maximumFractionDigits: precision 
        });
      default:
        return String(num);
    }
  }, [value, format, currency, precision]);

  return (
    // Applied style prop to allow components like SpendTreemap to control text presentation
    <span className={`tabular-nums ${className}`} style={style}>
      {isGhostMode ? '*****' : formattedValue}
    </span>
  );
};
