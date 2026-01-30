import { Transaction, LedgerData, TimeFocus, CustomDateRange } from '../../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

/**
 * Prepares Waterfall Chart data for Portfolio analysis.
 * Shows: START -> INFLOW (Trades) -> MARKET (Growth) -> CURRENT.
 * Note: Range arrays are sorted [min, max] so the charting engine positions 
 * labels at the visual top (highest value) regardless of direction.
 */
export const transformWaterfallData = (attribution: any) => {
  if (!attribution) return [];
  const { startValue, contributions, marketAlpha, endValue } = attribution;
  
  // Intermediate step for Inflow
  const inflowEnd = startValue + contributions;
  
  return [
    { 
      name: 'START', 
      range: [0, startValue], 
      actual: startValue, 
      type: 'anchor', 
      display: 'Initial' 
    },
    { 
      name: 'INFLOW', 
      range: [startValue, inflowEnd].sort((a, b) => a - b), 
      actual: contributions, 
      type: contributions >= 0 ? 'inflow' : 'outflow', 
      display: 'Net Trades' 
    },
    { 
      name: 'MARKET', 
      range: [inflowEnd, endValue].sort((a, b) => a - b), 
      actual: marketAlpha, 
      type: marketAlpha >= 0 ? 'inflow' : 'outflow', 
      display: 'Market Δ' 
    },
    { 
      name: 'CURRENT', 
      range: [0, endValue], 
      actual: endValue, 
      type: 'anchor', 
      display: 'Terminal' 
    }
  ];
};

/**
 * Prepares Sankey Chart data for Flow analysis from Ledger data.
 * Updated to enforce strict hierarchy: 
 * - If no category focused: Show Total -> Categories.
 * - If category focused: Show Category -> Sub-categories.
 */
export const transformSankeyData = (
  detailedExpenses: LedgerData | undefined,
  monthIndex: number,
  isDarkMode: boolean,
  selectedCategoryName: string | null
) => {
  if (!detailedExpenses || !detailedExpenses.categories.length) {
    return { nodes: [], links: [] };
  }

  const nodes: { name: string; color?: string }[] = [];
  const links: { source: number; target: number; value: number }[] = [];
  let nextId = 0;

  const totalColor = isDarkMode ? '#1e293b' : '#334155';

  if (!selectedCategoryName) {
    // Mode A: High-level overview (Total -> All Categories)
    nodes.push({ name: 'Total Spending', color: totalColor });
    nextId = 1;

    detailedExpenses.categories.forEach((cat, cIdx) => {
      const catMonthValue = cat.subCategories.reduce((sum, sub) => sum + (sub.monthlyValues[monthIndex] || 0), 0);
      if (catMonthValue <= 0) return;

      const catColor = COLORS[cIdx % COLORS.length];
      const catNodeIdx = nextId++;
      nodes.push({ name: cat.name, color: catColor });
      links.push({ source: 0, target: catNodeIdx, value: catMonthValue });
    });
  } else {
    // Mode B: Drill-down view (Selected Category -> Its Sub-categories)
    const cat = detailedExpenses.categories.find(c => c.name === selectedCategoryName);
    if (!cat) return { nodes: [], links: [] };

    const cIdx = detailedExpenses.categories.indexOf(cat);
    const catColor = COLORS[cIdx % COLORS.length];
    
    nodes.push({ name: cat.name, color: catColor });
    nextId = 1;

    const activeSubs = cat.subCategories
      .map(sub => ({ name: sub.name, value: sub.monthlyValues[monthIndex] || 0 }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Group minor sub-categories to keep the flow manageable
    const MAX_SUBS = 12;
    const displayedSubs = activeSubs.slice(0, MAX_SUBS);
    const otherSubs = activeSubs.slice(MAX_SUBS);
    const otherTotal = otherSubs.reduce((sum, item) => sum + item.value, 0);

    displayedSubs.forEach(sub => {
      const subNodeIdx = nextId++;
      nodes.push({ name: sub.name, color: catColor });
      links.push({ source: 0, target: subNodeIdx, value: sub.value });
    });

    if (otherTotal > 0) {
      const otherNodeIdx = nextId++;
      nodes.push({ name: `Other ${cat.name}`, color: catColor });
      links.push({ source: 0, target: otherNodeIdx, value: otherTotal });
    }
  }

  return { nodes, links };
};

/**
 * Prepares detailed trend data for Bar charts.
 * Groups minor categories into "Other" to keep charts clean and legends readable.
 */
export const transformDetailedTrendData = (detailedExpenses: LedgerData | undefined) => {
  if (!detailedExpenses) return [];

  // Identify top categories by annual total to maintain consistent grouping
  const catAnnualTotals: Record<string, number> = {};
  detailedExpenses.categories.forEach(cat => {
    catAnnualTotals[cat.name] = cat.subCategories.reduce((sum, sub) => sum + sub.total, 0);
  });

  const sortedCatNames = Object.entries(catAnnualTotals)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  const TOP_N = 8;
  const topCats = sortedCatNames.slice(0, TOP_N);

  return detailedExpenses.months.map((month, mIdx) => {
    const row: Record<string, any> = { name: month };
    let otherTotal = 0;

    detailedExpenses.categories.forEach(cat => {
      const val = cat.subCategories.reduce((sum, sub) => sum + (sub.monthlyValues[mIdx] || 0), 0);
      if (topCats.includes(cat.name)) {
        row[cat.name] = val;
      } else {
        otherTotal += val;
      }
    });

    if (sortedCatNames.length > TOP_N) {
      row['Other'] = otherTotal;
    }
    return row;
  });
};

/**
 * Standardizes Benchmarking data transformation.
 */
export const transformBenchmarkComparison = (
  portfolioData: { date: string; totalValue: number }[],
  benchmarkData: { date: string; price: number }[]
) => {
  if (portfolioData.length < 2 || benchmarkData.length < 2) return [];

  const sortedPortfolio = [...portfolioData].sort((a, b) => a.date.localeCompare(b.date));
  const sortedBenchmark = [...benchmarkData].sort((a, b) => a.date.localeCompare(b.date));

  const firstPDate = sortedPortfolio[0].date;
  let anchorBenchmarkEntry = sortedBenchmark.find(b => b.date >= firstPDate) || sortedBenchmark[0];
  const firstBPrice = anchorBenchmarkEntry.price;
  const firstPValue = sortedPortfolio[0].totalValue;

  let lastKnownBenchmarkPrice = firstBPrice;

  return sortedPortfolio.map(e => {
    const bMatch = sortedBenchmark.filter(bh => bh.date <= e.date).pop();
    if (bMatch) lastKnownBenchmarkPrice = bMatch.price;

    return {
      date: e.date,
      portfolio: firstPValue > 0 ? ((e.totalValue / firstPValue) - 1) * 100 : 0,
      benchmark: firstBPrice > 0 ? ((lastKnownBenchmarkPrice / firstBPrice) - 1) * 100 : 0
    };
  });
};