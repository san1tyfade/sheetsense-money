import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine, ReferenceArea, Label } from 'recharts';
import { SimulationPoint, SimulationEvent } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { useChartTheme } from '../../hooks/useChartTheme';
import { SimulationResult } from '../../services/cockpit/projectionEngine';
import { Flame, TrendingUp, Target, Zap } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';

interface ProjectionChartProps {
  result: SimulationResult;
  initialWealth: number;
  isDarkMode: boolean;
  events?: SimulationEvent[];
}

export const ProjectionChart: React.FC<ProjectionChartProps> = ({ result, initialWealth, isDarkMode }) => {
  const { isGhostMode } = useFinancialStore();
  const theme = useChartTheme(isDarkMode);
  const data = result.points;
  const freedomMonth = result.freedomMonth;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dynamic interval for X axis labels based on data length and device type
  const xAxisInterval = useMemo(() => {
    const totalMonths = data.length;
    let base = 47; // Default for desktop (every 4 years)
    if (totalMonths <= 12) base = 11;
    else if (totalMonths <= 60) base = 11;
    else if (totalMonths <= 120) base = 23;

    // Be twice as aggressive on mobile to prevent overlapping labels
    return isMobile ? Math.floor(base * 2.1) : base;
  }, [data, isMobile]);

  const horizonPoint = data[data.length - 1];
  const horizonWealth = horizonPoint?.totalWealth ?? 0;
  const wealthMultiplier = horizonWealth / (initialWealth || 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const year = Math.floor(label / 12);
      const month = label % 12;
      const currentVal = payload[0].value + payload[1].value;
      const velocity = currentVal / (initialWealth || 1);
      
      const point = data[label];
      const isEvent = point?.isMilestone && point?.milestoneLabel !== 'FI/RE';
      
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-2 min-w-[200px] z-[120]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Year {year} • Month {month}
                </p>
                {isEvent && (
                    <span className="text-[9px] font-black text-amber-400 uppercase flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> {point.milestoneLabel}
                    </span>
                )}
            </div>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                {velocity.toFixed(1)}x Velocity
            </span>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between gap-4 text-[10px] font-black">
              <span className="text-slate-500 uppercase">Invested</span>
              <span className="text-blue-400 font-mono">{isGhostMode ? '*****' : formatBaseCurrency(payload[0].value)}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-black">
              <span className="text-slate-500 uppercase">Reserves</span>
              <span className="text-slate-300 font-mono">{isGhostMode ? '*****' : formatBaseCurrency(payload[1].value)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-slate-800 mt-2 text-[11px] font-black">
              <span className="text-slate-200 uppercase tracking-widest">Total Wealth</span>
              <span className="text-white font-mono">{isGhostMode ? '*****' : formatBaseCurrency(currentVal)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 md:p-10 rounded-[3rem] md:rounded-[3.5rem] shadow-xl flex flex-col h-[550px] md:h-[650px] relative overflow-hidden group">
      
      <div className="flex flex-wrap gap-3 mb-4 md:mb-0 md:absolute md:top-8 md:left-10 z-20 pointer-events-none">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-600/20">
                <TrendingUp size={16} />
            </div>
            <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Velocity</p>
                <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                    {wealthMultiplier.toFixed(1)}x <span className="text-[8px] md:text-[10px] text-slate-500 font-bold ml-0.5">Multiplier</span>
                </h4>
            </div>
        </div>
        
        {freedomMonth !== null && (
            <div className="bg-emerald-500/10 dark:bg-emerald-500/5 backdrop-blur-sm border border-emerald-500/20 px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-3 animate-in slide-in-from-left-4 duration-700">
                <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-500/20">
                    <Flame size={16} />
                </div>
                <div>
                    <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Independence</p>
                    <h4 className="text-sm md:text-base font-black text-emerald-700 dark:text-emerald-300 leading-none mt-0.5">
                        {(freedomMonth / 12).toFixed(1)} <span className="text-[8px] md:text-[10px] opacity-70 font-bold ml-0.5">YEARS</span>
                    </h4>
                </div>
            </div>
        )}
      </div>

      <div className="absolute top-8 right-6 md:right-10 z-20 pointer-events-none hidden sm:block">
          <div className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-col items-end">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Snapshot Forecast</p>
              <h3 className="text-lg font-black font-mono mt-0.5 tracking-tighter">
                {isGhostMode ? '*****' : formatBaseCurrency(horizonWealth).replace(/\.00$/, '')}
              </h3>
          </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative z-10 mt-4 md:mt-16 ghost-blur">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 40, right: 30, left: isMobile ? 5 : -10, bottom: 20 }}>
            <defs>
              <linearGradient id="projInvest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="independenceZone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.03}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.3} />
            
            {freedomMonth !== null && (
                <ReferenceArea 
                    x1={freedomMonth} 
                    x2={data.length - 1} 
                    fill="url(#independenceZone)" 
                    className="transition-all duration-1000"
                />
            )}

            <XAxis 
              dataKey="month" 
              tickFormatter={(m) => isMobile ? `${Math.floor(m / 12)}Y` : `Yr ${Math.floor(m / 12)}`} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: theme.axisColor }}
              interval={xAxisInterval} 
              tickMargin={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 900, fill: theme.axisColor }}
              tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
              width={isMobile ? 55 : 60}
            />
            
            <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} 
                animationDuration={0}
            />
            
            {freedomMonth !== null && (
                <ReferenceLine 
                    x={freedomMonth} 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    strokeDasharray="8 4" 
                >
                    <Label 
                        value={isMobile ? "FIRE" : "Independence Gateway"} 
                        position="top" 
                        offset={20} 
                        fill="#10b981" 
                        fontSize={8} 
                        fontWeight="900" 
                        className="uppercase tracking-[0.3em]"
                    />
                </ReferenceLine>
            )}

            {data.map((p, idx) => {
                if (p.isMilestone && p.milestoneLabel !== 'FI/RE') {
                    return (
                        <ReferenceDot 
                            key={`ev-${idx}`}
                            x={p.month} 
                            y={p.totalWealth} 
                            r={3} 
                            fill="#f59e0b" 
                            stroke="#fff" 
                            strokeWidth={2}
                        />
                    );
                }
                return null;
            })}

            <Area 
              type="monotone" 
              dataKey="investments" 
              stackId="1" 
              stroke="#3b82f6" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#projInvest)" 
              animationDuration={1500}
            />
            <Area 
              type="monotone" 
              dataKey="cash" 
              stackId="1" 
              stroke={isDarkMode ? '#475569' : '#cbd5e1'} 
              strokeWidth={2} 
              fill={isDarkMode ? '#0f172a' : '#f8fafc'} 
              fillOpacity={0.8}
              animationDuration={2000}
            />

            {freedomMonth !== null && (
                <ReferenceDot 
                  x={freedomMonth} 
                  y={data[freedomMonth].totalWealth} 
                  r={6} 
                  fill="#10b981" 
                  stroke="#fff" 
                  strokeWidth={3}
                  className="shadow-2xl"
                >
                    <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                </ReferenceDot>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 opacity-40">
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Yield Engine</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Reserve Core</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Life Event</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">FIRE</span>
            </div>
      </div>
    </div>
  );
};