import { Transaction, TimeFocus, CustomDateRange, NetWorthEntry, LedgerData } from '../types';
import { MONTH_NAMES } from './parsers/parserUtils';

/**
 * TemporalSovereign: The Chronos Authority
 * Centralizes date parsing, formatting, and logical today resolution.
 */
export class TemporalSovereign {
  /**
   * Resolves the "Logical Today" for the application.
   */
  static getLogicalToday(contextYear?: number): Date {
    const now = new Date();
    const year = contextYear || now.getFullYear();
    if (year === now.getFullYear()) return now;
    return new Date(year, 11, 31, 23, 59, 59);
  }

  static getLogicalTodayISO(contextYear?: number): string {
    return this.toAbsoluteISO(this.getLogicalToday(contextYear));
  }

  /**
   * Strictly enforces YYYY-MM-DD from any date input.
   */
  static toAbsoluteISO(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '1970-01-01';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Alias for toAbsoluteISO for compatibility with component usage.
   */
  static toISO(date: Date | string | number): string {
    return this.toAbsoluteISO(date);
  }

  /**
   * Attempt to parse various flexible date formats into YYYY-MM-DD.
   */
  static parseFlexible(dateStr: string): string | null {
    if (!dateStr || dateStr.length < 2) return null;
    const cleanStr = dateStr.trim();
    if (cleanStr.toLowerCase().includes('yyyy-mm-dd')) return null;

    const isoMatch = cleanStr.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1]);
      const m = parseInt(isoMatch[2]);
      const d = parseInt(isoMatch[3]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return this.toAbsoluteISO(new Date(y, m - 1, d));
    }

    const monthYearMatch = cleanStr.match(/^([A-Za-z]{3})[\-\/](\d{2,4})$/);
    if (monthYearMatch) {
      const mStr = monthYearMatch[1].toLowerCase();
      const yStr = monthYearMatch[2];
      const mIdx = MONTH_NAMES.indexOf(mStr);
      if (mIdx !== -1) {
        const y = yStr.length === 2 ? 2000 + parseInt(yStr) : parseInt(yStr);
        return this.toAbsoluteISO(new Date(y, mIdx, 1));
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) return this.toAbsoluteISO(d);
    return null;
  }

  /**
   * Strictly detects if a string is a date marker (used for parser guards).
   */
  static isStrictDateMarker(val: string): boolean {
    const clean = (val || '').trim();
    if (!clean || clean.length < 6) return false;
    const strictIso = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(clean);
    const shortDate = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(clean);
    const monthDayYear = /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/.test(clean);
    return strictIso || shortDate || monthDayYear;
  }

  /**
   * Deterministically calculates month offset without local timezone flipping.
   */
  static getMonthOffset(targetISO: string, referenceISO: string): number {
    const [tY, tM] = targetISO.split('-').map(Number);
    const [rY, rM] = referenceISO.split('-').map(Number);
    return (rY - tY) * 12 + (rM - tM);
  }
}

export const isDateInWindow = (
  dateStr: string,
  focus: TimeFocus,
  customRange?: CustomDateRange,
  contextYear?: number
): boolean => {
  if (!dateStr || focus === TimeFocus.FULL_YEAR) return true;
  const cleanDate = dateStr.split('T')[0].trim();

  if (focus === TimeFocus.CUSTOM && customRange) {
    return cleanDate >= customRange.start && cleanDate <= customRange.end;
  }

  const logicalToday = TemporalSovereign.getLogicalToday(contextYear);
  const todayISO = TemporalSovereign.toAbsoluteISO(logicalToday);

  switch (focus) {
    case TimeFocus.MTD: {
      const mStart = TemporalSovereign.toAbsoluteISO(new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1));
      return cleanDate >= mStart && cleanDate <= todayISO;
    }
    case TimeFocus.QTD: {
      const qStartMonth = Math.floor(logicalToday.getMonth() / 3) * 3;
      const qStart = TemporalSovereign.toAbsoluteISO(new Date(logicalToday.getFullYear(), qStartMonth, 1));
      return cleanDate >= qStart && cleanDate <= todayISO;
    }
    case TimeFocus.YTD: {
      const yStart = TemporalSovereign.toAbsoluteISO(new Date(logicalToday.getFullYear(), 0, 1));
      return cleanDate >= yStart && cleanDate <= todayISO;
    }
    case TimeFocus.ROLLING_12M: {
      const limitDate = new Date(logicalToday);
      limitDate.setFullYear(logicalToday.getFullYear() - 1);
      const limitISO = TemporalSovereign.toAbsoluteISO(limitDate);
      return cleanDate >= limitISO && cleanDate <= todayISO;
    }
    default:
      return true;
  }
};

export const getAnchorDate = (focus: TimeFocus, history: NetWorthEntry[] = [], customRange?: CustomDateRange, contextYear?: number): Date => {
  const today = TemporalSovereign.getLogicalToday(contextYear);
  switch (focus) {
    case TimeFocus.MTD:
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case TimeFocus.QTD:
      return new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    case TimeFocus.YTD:
      return new Date(today.getFullYear(), 0, 1);
    case TimeFocus.ROLLING_12M:
      const d = new Date(today);
      d.setFullYear(today.getFullYear() - 1);
      d.setDate(1);
      return d;
    case TimeFocus.CUSTOM:
      if (customRange?.start) {
        const d = new Date(customRange.start);
        if (!isNaN(d.getTime())) return d;
      }
      return today;
    default:
      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
        return new Date(sorted[0].date);
      }
      return new Date(today.getFullYear() - 5, 0, 1);
  }
};

export const getTemporalWindows = (
  focus: TimeFocus,
  customRange?: CustomDateRange,
  contextYear?: number
): { current: { start: string, end: string }, shadow: { start: string, end: string }, label: string } => {
  const today = TemporalSovereign.getLogicalToday(contextYear);

  let currentStart = new Date(today);
  let currentEnd = new Date(today);
  let shadowStart = new Date(today);
  let shadowEnd = new Date(today);
  let label = 'previous period';

  switch (focus) {
    case TimeFocus.MTD:
      currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
      shadowStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      shadowEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      label = 'last month';
      break;
    case TimeFocus.QTD:
      const currentQ = Math.floor(today.getMonth() / 3);
      currentStart = new Date(today.getFullYear(), currentQ * 3, 1);
      shadowStart = new Date(today.getFullYear(), (currentQ - 1) * 3, 1);
      shadowEnd = new Date(today.getFullYear(), currentQ * 3, 0);
      label = 'last quarter';
      break;
    case TimeFocus.YTD:
      currentStart = new Date(today.getFullYear(), 0, 1);
      shadowStart = new Date(today.getFullYear() - 1, 0, 1);
      shadowEnd = new Date(today.getFullYear() - 1, 11, 31);
      label = 'last year';
      break;
    case TimeFocus.ROLLING_12M:
      currentStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      shadowStart = new Date(today.getFullYear() - 2, today.getMonth(), 1);
      shadowEnd = new Date(today.getFullYear() - 1, today.getMonth(), 0);
      label = 'previous 12 months';
      break;
    case TimeFocus.CUSTOM:
      if (customRange) {
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          currentStart = start;
          currentEnd = end;
          const diff = currentEnd.getTime() - currentStart.getTime();
          shadowStart = new Date(currentStart.getTime() - diff);
          shadowEnd = new Date(currentStart.getTime() - 86400000);
          label = 'previous custom window';
        }
      }
      break;
    default:
      currentStart = new Date(today.getFullYear() - 10, 0, 1);
      label = 'the past';
  }

  return {
    current: { start: TemporalSovereign.toAbsoluteISO(currentStart), end: TemporalSovereign.toAbsoluteISO(currentEnd) },
    shadow: { start: TemporalSovereign.toAbsoluteISO(shadowStart), end: TemporalSovereign.toAbsoluteISO(shadowEnd) },
    label
  };
};

/**
 * Caching layer for expensive aggregations
 */
const AGGREGATION_CACHE = new Map<string, any>();

const getCacheKey = (fnName: string, args: any[]) => {
  return `${fnName}:${JSON.stringify(args)}`;
};

const withCache = <T>(fnName: string, compute: () => T, args: any[]): T => {
  const key = getCacheKey(fnName, args);
  if (AGGREGATION_CACHE.has(key)) return AGGREGATION_CACHE.get(key);
  const result = compute();
  AGGREGATION_CACHE.set(key, result);
  // Simple eviction strategy: Clear cache if it gets too large
  if (AGGREGATION_CACHE.size > 1000) AGGREGATION_CACHE.clear();
  return result;
};

/**
 * aggregateDimensions: Hierarchical data aggregation for Flow analytics.
 */
export const aggregateDimensions = (timeline: Transaction[], drillPath: string[], type: 'EXPENSE' | 'INCOME') => {
  return withCache('aggregateDimensions', () => {
    const depth = drillPath.length;
    const groups: Record<string, { name: string, total: number, count: number }> = {};
    const norm = (s: string) => (s || '').trim().toLowerCase();

    timeline.forEach(t => {
      if (t.type !== type) return;

      let key = '';
      if (depth === 0) {
        key = t.category || 'Uncategorized';
      } else if (depth === 1) {
        if (norm(t.category) === norm(drillPath[0])) key = t.subCategory || 'Other';
      } else if (depth === 2) {
        if (norm(t.category) === norm(drillPath[0]) && norm(t.subCategory) === norm(drillPath[1])) {
          key = t.date.substring(0, 7);
        }
      }

      if (key) {
        if (!groups[key]) groups[key] = { name: key, total: 0, count: 0 };
        groups[key].total += Math.abs(t.amount);
        groups[key].count += 1;
      }
    });

    return Object.values(groups);
  }, [timeline, drillPath, type]);
};

/**
 * aggregateComparativeTrend: Generates period-over-period trend points.
 */
export const aggregateComparativeTrend = (active: Transaction[], shadow: Transaction[], drillPath: string[], type: 'EXPENSE' | 'INCOME') => {
  return withCache('aggregateComparativeTrend', () => {
    const map: Record<string, { label: string; current: number; shadow: number }> = {};
    const norm = (s: string) => (s || '').trim().toLowerCase();

    const filterByPath = (t: Transaction) => {
      if (t.type !== type) return false;
      if (drillPath.length > 0 && norm(t.category) !== norm(drillPath[0])) return false;
      if (drillPath.length > 1 && norm(t.subCategory) !== norm(drillPath[1])) return false;
      return true;
    };

    active.filter(filterByPath).forEach(t => {
      const m = t.date.substring(0, 7);
      if (!map[m]) map[m] = { label: m, current: 0, shadow: 0 };
      map[m].current += Math.abs(t.amount);
    });

    shadow.filter(filterByPath).forEach(t => {
      const m = t.date.substring(0, 7);
      if (!map[m]) map[m] = { label: m, current: 0, shadow: 0 };
      map[m].shadow += Math.abs(t.amount);
    });

    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [active, shadow, drillPath, type]);
};

/**
 * calculateTemporalVariance: Basic MoM variance calculator.
 */
const calculateTemporalVariance = (curr: number, prev: number) => {
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
};

/**
 * calculateDimensionAverage: Calculates rolling monthly average for a dimension.
 */
export const calculateDimensionAverage = (timeline: Transaction[], drillPath: string[], type: 'EXPENSE' | 'INCOME', months: number = 12) => {
  const norm = (s: string) => (s || '').trim().toLowerCase();
  const filtered = timeline.filter(t => {
    if (t.type !== type) return false;
    if (drillPath.length > 0 && norm(t.category) !== norm(drillPath[0])) return false;
    if (drillPath.length > 1 && norm(t.subCategory) !== norm(drillPath[1])) return false;
    return true;
  });
  const total = filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return total / (months || 1);
};

/**
 * buildUnifiedTimeline: Aggregates ledger snapshots and journal receipts into a unified event stream.
 */
export const buildUnifiedTimeline = async (
  detailedIncome?: LedgerData,
  detailedExpenses?: LedgerData,
  activeYear?: number
): Promise<Transaction[]> => {
  // Clear cache when checking for new timeline
  AGGREGATION_CACHE.clear();

  const transactions: Transaction[] = [];
  const year = activeYear || new Date().getFullYear();

  const processLedger = (ledger: LedgerData | undefined, type: 'INCOME' | 'EXPENSE') => {
    if (!ledger || !ledger.categories) return;

    ledger.categories.forEach(cat => {
      cat.subCategories.forEach(sub => {
        sub.monthlyValues.forEach((val, monthIdx) => {
          if (val !== 0) {
            // date construction: YYYY-MM-01
            const m = String(monthIdx + 1).padStart(2, '0');
            const date = `${year}-${m}-01`;

            transactions.push({
              id: `ledger-${type}-${cat.name}-${sub.name}-${monthIdx}`,
              date: date,
              description: `${sub.name} (${type})`,
              category: cat.name,
              subCategory: sub.name,
              amount: type === 'EXPENSE' ? -Math.abs(val) : Math.abs(val),
              type: type
            });
          }
        });
      });
    });
  };

  processLedger(detailedIncome, 'INCOME');
  processLedger(detailedExpenses, 'EXPENSE');

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
