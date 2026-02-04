import React, { memo, useMemo } from 'react';
import { formatBaseCurrency, formatNativeCurrency } from '../../services/currencyService';
import { useSettings } from '../../context/SystemContext';

interface PrivacyValueProps {
  value: number | string | undefined | null;
  format?: 'currency' | 'percent' | 'native' | 'number';
  currency?: string;
  className?: string;
  precision?: number;
  style?: React.CSSProperties;
}

/**
 * PrivacyValue
 * Standardized rendering with Ghost Mode protection.
 */
export const PrivacyValue: React.FC<PrivacyValueProps> = memo(({ 
  value, 
  format = 'currency', 
  currency, 
  className = "", 
  precision = 0,
  style
}) => {
  const { isGhostMode } = useSettings();

  const formattedValue = useMemo(() => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
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
    <span className={`tabular-nums ${className}`} style={style}>
      {isGhostMode ? '*****' : formattedValue}
    </span>
  );
});