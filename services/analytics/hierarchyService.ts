
import { Transaction, JournalEntry, TimeFocus, CustomDateRange } from '../../types';
import { cleanMerchantDescription } from '../infrastructure/IntelligenceProvider';
import { isDateInWindow, getTemporalWindows } from '../temporalService';
import { FinancialEngine } from '../math/FinancialEngine';

export type LeafType = 'MERCHANT' | 'MONTH';

export interface HierarchyNode {
  id: string;
  name: string;
  value: number;
  count: number;
  maxHit?: number;
  avgMonthly?: number;
  variance?: number; // MoM Variance vs 12M Median
  isShock?: boolean;
  isJournalBacked?: boolean; 
  isSummaryNode?: boolean;   
  unallocatedValue?: number; // Option 1: The delta between Ledger Total and Journal Sum
  children?: HierarchyNode[];
}

/**
 * Formats a YYYY-MM string into Month YYYY (e.g., 2025-10 -> October 2025)
 */
const formatMonthYear = (monthStr: string): string => {
    const parts = (monthStr || '').split('-');
    if (parts.length !== 2) return monthStr || 'Unknown Month';
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    if (isNaN(year) || isNaN(month)) return monthStr;
    const date = new Date(year, month);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

/**
 * Calculates the 12-month rolling median for a specific category or subcategory.
 */
const calculateRollingMedian = (
  timeline: Transaction[],
  name: string,
  level: 'CAT' | 'SUB',
  windowEnd: string
): number => {
  if (!windowEnd) return 0;
  const end = new Date(windowEnd + 'T00:00:00');
  const start = new Date(end);
  start.setFullYear(end.getFullYear() - 1);
  const startISO = start.toISOString().split('T')[0];

  const relevant = timeline.filter(t => {
    const isExpense = t.type === 'EXPENSE';
    const matchesName = level === 'CAT' ? t.category === name : t.subCategory === name;
    return isExpense && matchesName && t.date >= startISO && t.date <= windowEnd;
  });

  if (relevant.length === 0) return 0;

  const monthlyTotals: Record<string, number> = {};
  relevant.forEach(t => {
    const m = t.date.substring(0, 7);
    monthlyTotals[m] = (monthlyTotals[m] || 0) + Math.abs(t.amount);
  });

  return FinancialEngine.median(Object.values(monthlyTotals));
};

/**
 * Transforms flat transactions into a recursive Category > Subcategory > Leaf hierarchy.
 * Option 1 Implementation: Summaries are moved to metadata, Treemap shows Journal only.
 */
export const buildSpendingHierarchy = (
  journalEntries: JournalEntry[] = [],
  timeline: Transaction[] = [],
  focus: TimeFocus,
  customRange: CustomDateRange | undefined,
  selectedYear: number,
  metric: 'VALUE' | 'COUNT',
  leafType: LeafType,
  isPulseMode: boolean,
  identityMap: Record<string, string> = {}
): HierarchyNode => {
  const floorThreshold = 0.015; 
  const windows = getTemporalWindows(focus, customRange, selectedYear);
  const windowEnd = windows?.current?.end || new Date().toISOString().split('T')[0];
  
  const sDate = new Date((windows?.current?.start || windowEnd) + 'T00:00:00');
  const eDate = new Date(windowEnd + 'T00:00:00');
  const monthsInWindow = Math.max(1, (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth()) + 1);

  // Helper to identify summary rows
  const isSummary = (desc: string, cat: string, sub?: string) => {
      const d = (desc || '').toLowerCase().trim();
      const c = (cat || '').toLowerCase().trim();
      const s = (sub || '').toLowerCase().trim();
      return d === c || d === s;
  };

  const allData = [
    ...(journalEntries || []).map(j => ({ ...j, type: 'EXPENSE' as const, isJournal: true })),
    ...(timeline || []).map(t => ({ ...t, isJournal: false }))
  ].filter(t => {
    const isExpense = 'type' in t ? (t as Transaction).type === 'EXPENSE' : true;
    return t.amount > 0 && isExpense && isDateInWindow(t.date, focus, customRange, selectedYear);
  });

  if (isPulseMode) {
    const merchants: Record<string, { val: number; count: number; max: number; isJournal: boolean; originalDesc: string }> = {};
    allData.forEach(tx => {
      // Pulse Mode Restriction: Ignore ledger summaries
      if (!tx.isJournal && isSummary(tx.description, tx.category, tx.subCategory)) return;

      const rawDesc = (tx.description || '').toUpperCase();
      let name = tx.canonicalName || identityMap[rawDesc] || cleanMerchantDescription(tx.description);
      if (!name || name.trim().length === 0) name = tx.description || 'Unidentified Node';

      const amt = Math.abs(tx.amount);
      if (!merchants[name]) merchants[name] = { val: 0, count: 0, max: 0, isJournal: false, originalDesc: tx.description };
      merchants[name].val += amt;
      merchants[name].count += 1;
      if (tx.isJournal) merchants[name].isJournal = true;
      if (amt > merchants[name].max) merchants[name].max = amt;
    });

    const top10 = Object.entries(merchants)
      .sort((a, b) => (metric === 'VALUE' ? b[1].val - a[1].val : b[1].count - a[1].count))
      .slice(0, 10);

    const root: HierarchyNode = { id: 'pulse-root', name: 'Top 10 Merchants', value: 0, count: 0, children: [] };
    top10.forEach(([name, stats]) => {
      root.children!.push({
        id: `pulse-m-${name}`,
        name,
        value: stats.val,
        count: stats.count,
        maxHit: stats.max,
        isJournalBacked: stats.isJournal,
        avgMonthly: stats.val / monthsInWindow
      });
      root.value += stats.val;
      root.count += stats.count;
    });
    return root;
  }

  const root: HierarchyNode = { id: 'root', name: 'Total Spend', value: 0, count: 0, children: [], unallocatedValue: 0 };
  
  // Data map structures
  const categories: Record<string, {
      ledgerTotal: number;
      journalTotal: number;
      subs: Record<string, {
          ledgerTotal: number;
          journalTotal: number;
          leaves: Record<string, { val: number; count: number; max: number; hasJournal: boolean; isSummary: boolean }>;
      }>;
  }> = {};

  allData.forEach(tx => {
    const cat = (tx.category || 'Uncategorized').trim() || 'Uncategorized';
    const sub = (tx.subCategory || 'Other').trim() || 'Other';
    const amt = Math.abs(tx.amount);
    const isSummaryRow = !tx.isJournal && isSummary(tx.description, tx.category, tx.subCategory);

    if (!categories[cat]) categories[cat] = { ledgerTotal: 0, journalTotal: 0, subs: {} };
    if (!categories[cat].subs[sub]) categories[cat].subs[sub] = { ledgerTotal: 0, journalTotal: 0, leaves: {} };

    if (isSummaryRow) {
        categories[cat].ledgerTotal += amt;
        categories[cat].subs[sub].ledgerTotal += amt;
        root.unallocatedValue = (root.unallocatedValue || 0) + amt;
    } else {
        const rawDesc = (tx.description || '').toUpperCase();
        let merchantIdentity = tx.canonicalName || identityMap[rawDesc] || cleanMerchantDescription(tx.description);
        if (!merchantIdentity || merchantIdentity.trim().length === 0) merchantIdentity = tx.description || 'Unidentified Node';

        const leaf = leafType === 'MERCHANT' ? merchantIdentity : formatMonthYear(tx.date.substring(0, 7));

        if (!categories[cat].subs[sub].leaves[leaf]) {
            categories[cat].subs[sub].leaves[leaf] = { val: 0, count: 0, max: 0, hasJournal: false, isSummary: false };
        }

        const lStats = categories[cat].subs[sub].leaves[leaf];
        lStats.val += amt;
        lStats.count += 1;
        if (tx.isJournal) {
            lStats.hasJournal = true;
            categories[cat].journalTotal += amt;
            categories[cat].subs[sub].journalTotal += amt;
        }
        if (amt > lStats.max) lStats.max = amt;
        
        root.value += amt;
        root.count += 1;
    }
  });

  // Re-adjust unallocated to be "Ledger - Journal"
  root.unallocatedValue = Math.max(0, (root.unallocatedValue || 0) - categoriesToJournalTotal(categories));

  Object.entries(categories).forEach(([catName, catData]) => {
    const catNode: HierarchyNode = { 
        id: `cat-${catName}`, 
        name: catName, 
        value: 0, 
        count: 0, 
        maxHit: 0, 
        children: [],
        unallocatedValue: Math.max(0, catData.ledgerTotal - catData.journalTotal)
    };

    Object.entries(catData.subs).forEach(([subName, subData]) => {
      const subNode: HierarchyNode = { 
          id: `sub-${catName}-${subName}`, 
          name: subName, 
          value: 0, 
          count: 0, 
          maxHit: 0, 
          children: [],
          unallocatedValue: Math.max(0, subData.ledgerTotal - subData.journalTotal)
      };

      Object.entries(subData.leaves).forEach(([leafName, stats]) => {
        subNode.children!.push({
          id: `leaf-${catName}-${subName}-${leafName}`,
          name: leafName,
          value: stats.val,
          count: stats.count,
          maxHit: stats.max,
          isJournalBacked: stats.hasJournal,
          avgMonthly: stats.val / monthsInWindow
        });
        subNode.value += stats.val;
        subNode.count += stats.count;
        if (stats.max > (subNode.maxHit || 0)) subNode.maxHit = stats.max;
        if (stats.hasJournal) subNode.isJournalBacked = true;
      });

      subNode.avgMonthly = subNode.value / monthsInWindow;
      const subMedian = calculateRollingMedian(timeline, subName, 'SUB', windowEnd);
      if (subMedian > 0) subNode.variance = ((subNode.avgMonthly - subMedian) / subMedian) * 100;
      
      catNode.children!.push(subNode);
      catNode.value += subNode.value;
      catNode.count += subNode.count;
      if (subNode.isJournalBacked) catNode.isJournalBacked = true;
    });

    catNode.avgMonthly = catNode.value / monthsInWindow;
    const catMedian = calculateRollingMedian(timeline, catName, 'CAT', windowEnd);
    if (catMedian > 0) catNode.variance = ((catNode.avgMonthly - catMedian) / catMedian) * 100;
    root.children!.push(catNode);
  });

  const applyFloor = (node: HierarchyNode) => {
    if (!node.children || node.children.length === 0) return;
    const total = metric === 'VALUE' ? node.value : node.count;
    const threshold = total * floorThreshold;
    const significant = node.children.filter(c => (metric === 'VALUE' ? c.value : c.count) >= threshold);
    const minor = node.children.filter(c => (metric === 'VALUE' ? c.value : c.count) < threshold);
    if (minor.length > 1) {
      node.children = [...significant, {
        id: `${node.id}-other`, name: 'Other Nodes', value: minor.reduce((s, c) => s + c.value, 0), count: minor.reduce((s, c) => s + c.count, 0),
        maxHit: Math.max(...minor.map(c => c.maxHit || 0)), avgMonthly: minor.reduce((s, c) => s + (c.avgMonthly || 0), 0), children: []
      }];
    }
    node.children.forEach(applyFloor);
  };

  applyFloor(root);
  return root;
};

function categoriesToJournalTotal(categories: Record<string, any>): number {
    let sum = 0;
    Object.values(categories).forEach(cat => sum += (cat.journalTotal || 0));
    return sum;
}

export const getHeatmapColor = (ratio: number, isDarkMode: boolean): string => {
  if (isDarkMode) {
    if (ratio < 0.10) return '#c05621'; 
    if (ratio < 0.20) return '#dd6b20'; 
    if (ratio < 0.30) return '#ed8936'; 
    if (ratio < 0.40) return '#f6ad55'; 
    if (ratio < 0.50) return '#2d3748'; 
    if (ratio < 0.60) return '#bee3f8'; 
    if (ratio < 0.70) return '#90cdf4'; 
    if (ratio < 0.85) return '#4299e1'; 
    return '#2c5282'; 
  } else {
    if (ratio < 0.10) return '#fefcbf'; 
    if (ratio < 0.20) return '#fbd38d'; 
    if (ratio < 0.30) return '#f6ad55'; 
    if (ratio < 0.40) return '#ed8936'; 
    if (ratio < 0.55) return '#bee3f8'; 
    if (ratio < 0.70) return '#90cdf4'; 
    if (ratio < 0.85) return '#4299e1'; 
    return '#2b6cb0'; 
  }
};
