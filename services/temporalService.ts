import { Transaction, LedgerData, TimeFocus, CustomDateRange, NetWorthEntry } from '../types';
import { MONTH_NAMES, isSafeKey } from './parsers/parserUtils';
import { getAppDB, DB_CONFIG } from './infrastructure/DatabaseProvider';

/**
 * TemporalSovereign: The Chronos Authority
 * Normalizes 'Current Date' based on the active financial context.
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
      return this.getLogicalToday(contextYear).toISOString().split('T')[0];
  }

  static toISO(date: Date | string | number): string {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '1970-01-01';
      return d.toISOString().split('T')[0];
  }
}

/**
 * Checks if an ISO date string (YYYY-MM-DD) falls within a specific focus window.
 */
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
  const todayISO = logicalToday.toISOString().split('T')[0];
  
  switch (focus) {
    case TimeFocus.MTD: {
      const mStart = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1).toISOString().split('T')[0];
      return cleanDate >= mStart && cleanDate <= todayISO;
    }
    case TimeFocus.QTD: {
      const qStartMonth = Math.floor(logicalToday.getMonth() / 3) * 3;
      const qStart = new Date(logicalToday.getFullYear(), qStartMonth, 1).toISOString().split('T')[0];
      return cleanDate >= qStart && cleanDate <= todayISO;
    }
    case TimeFocus.YTD: {
      const yStart = new Date(logicalToday.getFullYear(), 0, 1).toISOString().split('T')[0];
      return cleanDate >= yStart && cleanDate <= todayISO;
    }
    case TimeFocus.ROLLING_12M: {
      const limitDate = new Date(logicalToday);
      limitDate.setFullYear(logicalToday.getFullYear() - 1);
      const limitISO = limitDate.toISOString().split('T')[0];
      return cleanDate >= limitISO && cleanDate <= todayISO;
    }
    default:
      return true;
  }
};

/**
 * Returns the anchor date for a given time focus.
 */
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
    
    const toISO = (d: Date) => {
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        return d.toISOString().split('T')[0];
    };

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
        current: { start: toISO(currentStart), end: toISO(currentEnd) },
        shadow: { start: toISO(shadowStart), end: toISO(shadowEnd) },
        label
    };
};

export const buildUnifiedTimeline = async (): Promise<Transaction[]> => {
  const db = await getAppDB();
  const tx = db.transaction(DB_CONFIG.APP.STORE, 'readonly');
  const store = tx.objectStore(DB_CONFIG.APP.STORE);
  return new Promise((resolve) => {
    const keyRequest = store.getAllKeys();
    keyRequest.onsuccess = async () => {
      const keys = keyRequest.result.map(String);
      const ledgerKeys = keys.filter(k => k.includes('fintrack_detailed_'));
      if (ledgerKeys.length === 0) { resolve([]); return; }
      const results = await Promise.all(ledgerKeys.map(key => new Promise<{key: string, data: LedgerData | undefined}>((res) => {
          const req = store.get(key);
          req.onsuccess = () => res({ key, data: req.result });
          req.onerror = () => res({ key, data: undefined });
      })));
      const timeline: Transaction[] = [];
      results.forEach(({ key, data }) => {
          if (!data?.months || !data?.categories) return;
          const typeMatch = key.match(/fintrack_detailed_(income|expenses)_(\d{4})/);
          if (!typeMatch) return;
          const type = typeMatch[1] === 'income' ? 'INCOME' : 'EXPENSE';
          const year = typeMatch[2];
          data.categories.forEach(cat => {
              cat.subCategories.forEach(sub => {
                  sub.monthlyValues.forEach((val, monthIdx) => {
                      if (!val || val === 0) return;
                      const monthName = data.months[monthIdx]; 
                      const isoDate = parseMonthLabelToISO(monthName, year);
                      timeline.push({
                          id: `${key}-${cat.name}-${sub.name}-${monthIdx}`,
                          date: isoDate,
                          description: sub.name,
                          category: cat.name,
                          subCategory: sub.name,
                          amount: Math.abs(val),
                          type: type
                      });
                  });
              });
          });
      });
      resolve(timeline.sort((a, b) => b.date.localeCompare(a.date)));
    };
    keyRequest.onerror = () => resolve([]);
  });
};

const parseMonthLabelToISO = (label: string, yearHint: string): string => {
    const cleanLabel = (label || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const parts = cleanLabel.split(/\s+/);
    const mIdx = MONTH_NAMES.indexOf(parts[0].substring(0, 3));
    const month = mIdx === -1 ? '01' : String(mIdx + 1).padStart(2, '0');
    let year = yearHint;
    if (parts.length > 1) {
        const yearPart = parts[parts.length - 1];
        year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    }
    return `${year}-${month}-01`;
};

/**
 * aggregateDimensions: Analytics Engine
 * Groups transactions by category, subcategory, or month based on drill-down depth.
 */
export const aggregateDimensions = (
  timeline: Transaction[],
  drillPath: string[],
  type: string
): { name: string; total: number; count: number }[] => {
  const depth = drillPath.length;
  const groups: Record<string, { total: number; count: number }> = {};
  const norm = (s: string) => (s || '').trim().toLowerCase();

  timeline.forEach(t => {
    if (t.type !== type) return;

    let groupKey = '';
    if (depth === 0) {
      groupKey = t.category || 'Uncategorized';
    } else if (depth === 1) {
      if (norm(t.category) === norm(drillPath[0])) {
        groupKey = t.subCategory || 'Other';
      }
    } else if (depth === 2) {
      if (norm(t.category) === norm(drillPath[0]) && norm(t.subCategory || 'Other') === norm(drillPath[1])) {
        groupKey = t.date.substring(0, 7); // YYYY-MM
      }
    }

    if (groupKey) {
      if (!groups[groupKey]) groups[groupKey] = { total: 0, count: 0 };
      groups[groupKey].total += t.amount;
      groups[groupKey].count += 1;
    }
  });

  return Object.entries(groups).map(([name, stats]) => ({
    name,
    total: stats.total,
    count: stats.count
  }));
};

/**
 * aggregateComparativeTrend: Multi-Window Temporal Analysis
 * Aggregates trend data for current vs shadow periods.
 */
export const aggregateComparativeTrend = (
  currentTimeline: Transaction[],
  shadowTimeline: Transaction[],
  drillPath: string[],
  type: string
) => {
  const norm = (s: string) => (s || '').trim().toLowerCase();
  
  const getTrendPoints = (tl: Transaction[]) => {
      const points: Record<string, number> = {};
      tl.forEach(t => {
          if (t.type !== type) return;
          if (drillPath.length >= 1 && norm(t.category) !== norm(drillPath[0])) return;
          if (drillPath.length >= 2 && norm(t.subCategory || 'Other') !== norm(drillPath[1])) return;
          
          const key = t.date.substring(0, 7); // YYYY-MM
          points[key] = (points[key] || 0) + t.amount;
      });
      return points;
  };

  const currPoints = getTrendPoints(currentTimeline);
  const shadPoints = getTrendPoints(shadowTimeline);

  const allMonths = Array.from(new Set([...Object.keys(currPoints), ...Object.keys(shadPoints)])).sort();

  return allMonths.map(m => ({
      label: m,
      current: currPoints[m] || 0,
      shadow: shadPoints[m] || 0
  }));
};

/**
 * calculateDimensionAverage: Benchmark Logic
 * Calculates rolling average for a specific dimension over N months.
 */
export const calculateDimensionAverage = (
    timeline: Transaction[],
    drillPath: string[],
    type: string,
    months: number = 12
): number => {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const monthlyTotals: Record<string, number> = {};

    timeline.forEach(t => {
        if (t.type !== type) return;
        if (drillPath.length >= 1 && norm(t.category) !== norm(drillPath[0])) return;
        if (drillPath.length >= 2 && norm(t.subCategory || 'Other') !== norm(drillPath[1])) return;

        const mKey = t.date.substring(0, 7);
        monthlyTotals[mKey] = (monthlyTotals[mKey] || 0) + t.amount;
    });

    const values = Object.values(monthlyTotals);
    if (values.length === 0) return 0;
    
    const recentValues = values.slice(-months);
    return recentValues.reduce((a, b) => a + b, 0) / Math.max(1, recentValues.length);
};

/**
 * calculateTemporalVariance: Mathematical Primitives
 * Calculates percentage delta between periods.
 */
export const calculateTemporalVariance = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};
