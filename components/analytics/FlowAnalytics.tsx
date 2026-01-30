
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TimeFocus, CustomDateRange } from '../../types';
import { ComposedChart, Line, Area, BarChart, Bar, Cell, LabelList, ReferenceLine, Label, Tooltip } from 'recharts';
import { LayoutGrid, Activity, Zap, Terminal, History } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { aggregateDimensions, aggregateComparativeTrend, getTemporalWindows, calculateDimensionAverage } from '../../services/temporalService';
import { StatHighlight, DrillBreadcrumbs, StandardTooltip } from './AnalyticsPrimitives';
import { useFinancialStore } from '../../context/FinancialContext';
import { SharedChart, StandardGrid, StandardXAxis, StandardYAxis } from '../shared/SharedChart';
import { StatusState } from '../shared/StatusState';

interface FlowAnalyticsProps {
  timeline: Transaction[];
  timeFocus: TimeFocus;
  customRange: CustomDateRange;
  activeType: 'EXPENSE' | 'INCOME';
  isComparisonMode: boolean;
  sortMode: 'TOTAL' | 'VARIANCE';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

export const FlowAnalytics: React.FC<FlowAnalyticsProps> = ({
  timeline, timeFocus, customRange, activeType, isComparisonMode, sortMode
}) => {
  const { setInspector, journalEntries } = useFinancialStore();
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const temporalWindows = useMemo(() => getTemporalWindows(timeFocus, customRange), [timeFocus, customRange]);

  const activeTimeline = useMemo(() => timeline.filter(t => t.date >= temporalWindows.current.start && t.date <= temporalWindows.current.end), [timeline, temporalWindows]);
  const shadowTimeline = useMemo(() => timeline.filter(t => t.date >= temporalWindows.shadow.start && t.date <= temporalWindows.shadow.end), [timeline, temporalWindows]);

  const periodStats = useMemo(() => {
    const inc = activeTimeline.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const exp = activeTimeline.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const savings = inc - exp;
    return {
      income: inc,
      expense: exp,
      savings,
      rate: inc > 0 ? (savings / inc) * 100 : 0,
      eventCount: activeTimeline.length
    };
  }, [activeTimeline]);

  const isHistoryMode = drillPath.length === 2;

  const dimensionData = useMemo(() => {
    const current = aggregateDimensions(activeTimeline, drillPath, activeType);
    const shadow = aggregateDimensions(shadowTimeline, drillPath, activeType);
    const shadowMap = new Map(shadow.map(g => [g.name, g.total]));
    const total = activeType === 'INCOME' ? periodStats.income : periodStats.expense;

    return current.map(curr => {
      const prevTotal = (shadowMap.get(curr.name) || 0) as number;
      const delta = curr.total - prevTotal;
      const pctOfTotal = total > 0 ? (curr.total / total) * 100 : 0;
      const amountLabel = formatBaseCurrency(curr.total).replace(/\.00$/, '');
      const label = isMobile
        ? `${amountLabel}`
        : `${amountLabel} — ${pctOfTotal.toFixed(1)}%`;

      return { ...curr, prevTotal, delta, pctOfTotal, label };
    }).sort((a, b) => {
      if (isHistoryMode) return b.name.localeCompare(a.name);
      return sortMode === 'VARIANCE' ? Math.abs(b.delta) - Math.abs(a.delta) : b.total - a.total;
    });
  }, [activeTimeline, shadowTimeline, drillPath, activeType, sortMode, periodStats, isMobile, isHistoryMode]);

  const trendData = useMemo(() => aggregateComparativeTrend(activeTimeline, shadowTimeline, drillPath, activeType), [activeTimeline, shadowTimeline, drillPath, activeType]);

  const historicalAverage = useMemo(() => {
    return calculateDimensionAverage(timeline, drillPath, activeType, 12);
  }, [timeline, drillPath, activeType]);

  const currentPeriodTotal = activeType === 'INCOME' ? periodStats.income : periodStats.expense;
  const focusedTotal = drillPath.length > 0 ? dimensionData.reduce((s, d) => s + d.total, 0) : currentPeriodTotal;

  const windowMonthsCount = useMemo(() => {
    const s = new Date(temporalWindows.current.start + 'T00:00:00');
    const e = new Date(temporalWindows.current.end + 'T00:00:00');
    return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
  }, [temporalWindows]);

  const focusedMonthlyAvg = focusedTotal / windowMonthsCount;
  const avgVariance = historicalAverage > 0 ? ((focusedMonthlyAvg - historicalAverage) / historicalAverage) * 100 : 0;

  const handleBarClick = (data: any) => {
    if (!data || !data.name) return;

    const nodeName = data.name;
    const isTerminal = isHistoryMode;

    if (!isTerminal) {
      setDrillPath(p => [...p, nodeName]);
    } else {
      const norm = (s: string) => (s || '').trim().toLowerCase();
      const yearMonth = nodeName;

      const journalMatches = journalEntries.filter(j => {
        const dateStr = j.date || '';
        return norm(j.category) === norm(drillPath[0]) &&
          norm(j.subCategory) === norm(drillPath[1]) &&
          dateStr.startsWith(yearMonth);
      });

      if (journalMatches.length > 0) {
        setInspector({
          isOpen: true,
          title: drillPath[1],
          subtitle: `${yearMonth} Traceability Audit`,
          transactions: journalMatches.map(j => ({
            ...j,
            type: activeType
          })) as Transaction[]
        });
      } else {
        const contributing = activeTimeline.filter(t => {
          return t.type === activeType &&
            norm(t.category) === norm(drillPath[0]) &&
            norm(t.subCategory) === norm(drillPath[1]) &&
            t.date.startsWith(yearMonth);
        });

        setInspector({
          isOpen: true,
          title: drillPath[1],
          subtitle: `${yearMonth} Logical Summary`,
          transactions: contributing
        });
      }
    }
  };

  const formatDimensionName = (name: string) => {
    if (isHistoryMode && /^\d{4}-\d{2}$/.test(name)) {
      const d = new Date(name + '-02');
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).toUpperCase();
    }
    return name;
  };

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
        <StatHighlight label="Net Yield" value={periodStats.savings} variant={periodStats.savings >= 0 ? 'success' : 'danger'} subValue={`${periodStats.rate.toFixed(1)}% efficiency`} />
        <StatHighlight label="Gross Inflow" value={periodStats.income} variant="success" />
        <StatHighlight
          label={drillPath.length > 0 ? `${drillPath[drillPath.length - 1]} Total` : "Total Outflow"}
          value={drillPath.length > 0 ? focusedTotal : periodStats.expense}
          variant="danger"
          subValue={drillPath.length > 0 ? `Avg. ${formatBaseCurrency(historicalAverage)} / mo (L12M)` : "Global Drain"}
          trend={drillPath.length > 0 ? avgVariance : undefined}
        />
        <StatHighlight label="Node Points" value={periodStats.eventCount} isCurrency={false} variant="info" subValue="Captured Events" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 relative px-2">
        <div className="xl:col-span-7 bg-white dark:bg-slate-800/40 p-6 md:p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[500px] md:h-[600px] shadow-sm relative group overflow-hidden transition-all duration-500">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12 gap-6 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <LayoutGrid size={isMobile ? 20 : 24} className="text-blue-500" />
                <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Hierarchical Matrix</h3>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Constituent Distribution Logic</p>
                {isHistoryMode && (
                  <span className="flex items-center gap-1 text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-blue-500/20">
                    <History size={10} /> History Resolution
                  </span>
                )}
              </div>
            </div>
            <DrillBreadcrumbs path={drillPath} onReset={() => setDrillPath([])} onPop={(i) => setDrillPath(p => p.slice(0, i + 1))} type={activeType} />
          </div>

          <div className="flex-1 w-full min-w-0 relative z-10">
            {dimensionData.length > 0 ? (
              <SharedChart>

                {/* @ts-ignore: Margin types are conflicting in this Recharts version */}
                <BarChart
                  data={dimensionData}
                  layout="vertical"
                  margin={{
                    left: isMobile ? 5 : 20,
                    right: isMobile ? 80 : 160,
                    top: 0,
                    bottom: 0
                  }}
                >
                  <StandardGrid />
                  <StandardXAxis type="number" hide domain={[0, 'dataMax']} />
                  <StandardYAxis
                    type="category"
                    dataKey="name"
                    formatter={formatDimensionName}
                    width={isMobile ? 100 : 120}
                  />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} content={<StandardTooltip isDarkMode={true} />} />
                  {isComparisonMode && <Bar dataKey="prevTotal" radius={[0, 4, 4, 0]} barSize={isMobile ? 8 : 12} fill="#cbd5e1" className="dark:fill-slate-700 opacity-40" />}
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={isMobile ? 18 : 26} onClick={handleBarClick} className="cursor-pointer">
                    <LabelList
                      dataKey="label"
                      content={(p: any) => {
                        if (!p || p.width === undefined) return null;
                        return (
                          <text
                            x={p.x + p.width + 8}
                            y={p.y + p.height / 2}
                            fill="#94a3b8"
                            textAnchor="start"
                            dominantBaseline="middle"
                            fontSize={isMobile ? 9 : 12}
                            fontWeight="900"
                            className="font-mono tracking-tighter"
                          >
                            {p.value}
                          </text>
                        );
                      }}
                    />
                    {dimensionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} className="hover:fill-opacity-100 transition-all duration-300" />)}
                  </Bar>
                </BarChart>
              </SharedChart>
            ) : (
              <div className="h-full flex items-center justify-center">
                <StatusState
                  isEmpty={true}
                  emptyTitle="No Data In Window"
                  emptyMessage="Try adjusting the time range or focus to view flow metrics."
                  variant="minimal"
                />
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-10">
          <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col h-[420px] shadow-sm relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 relative z-10 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-blue-600/10 rounded-2xl text-blue-600 border border-blue-600/20">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Temporal Velocity</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Movement Gradient</p>
                </div>
              </div>
              {historicalAverage > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Benchmark Active</span>
                </div>
              )}
            </div>
            <div className="flex-1 w-full min-h-0 relative z-10">
              <SharedChart>
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <StandardGrid />
                  <StandardXAxis dataKey="label" formatter={(v) => v ? new Date(v + '-02').toLocaleDateString(undefined, { month: 'short' }) : ''} />
                  <StandardYAxis formatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} width={50} />
                  <Tooltip content={<StandardTooltip isDarkMode={true} />} />

                  {historicalAverage > 0 && (
                    <ReferenceLine y={historicalAverage} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5">
                      <Label value="L12M AVG" position="right" fill="#f59e0b" fontSize={9} fontWeight="900" className="uppercase tracking-widest" offset={10} />
                    </ReferenceLine>
                  )}

                  <Line name="prev" type="monotone" dataKey="shadow" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" border="none" dot={false} opacity={0.3} />
                  <Area name="curr" type="monotone" dataKey="current" fill="#3b82f6" fillOpacity={0.1} />
                  <Line name="curr" type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={4} dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }} />
                </ComposedChart>
              </SharedChart>
            </div>
          </div>

          <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl border border-blue-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                <Zap size={32} fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Terminal size={10} /> Intelligence Engine
                  </p>
                  {drillPath.length > 0 && (
                    <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-blue-500/20">Target Focused</span>
                  )}
                </div>
                <h4 className="text-lg font-black text-white leading-tight uppercase tracking-tight">Period Analysis Nominal</h4>
                <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                  {drillPath.length > 0
                    ? `Monitoring ${drillPath[drillPath.length - 1]} vs historical baseline. Current period is ${Math.abs(avgVariance).toFixed(1)}% ${avgVariance >= 0 ? 'above' : 'below'} the 12-month rolling median.`
                    : `System observing ${timeFocus} focus across ${periodStats.eventCount} logical nodes. Allocation remains stable within target standard deviation.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
