
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { CockpitBaseline, CockpitMutationState } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { Info, Maximize2, Minimize2, MoveVertical, Zap, Check } from 'lucide-react';
import { TacticalBottomSheet } from './TacticalBottomSheet';

interface StrategicSankeyProps {
  baseline: CockpitBaseline;
  mutation: CockpitMutationState;
  onMutationChange: (newMutation: CockpitMutationState) => void;
}

interface SankeyNode {
  id: string;
  label: string;
  value: number;
  type: 'income_anchor' | 'expense' | 'savings' | 'invested' | 'cash';
  column: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

const CATEGORICAL_COLORS = [
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export const StrategicSankey: React.FC<StrategicSankeyProps> = ({ 
  baseline, mutation, onMutationChange 
}) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [activeDrag, setActiveDrag] = useState<{ id: string; startPos: number; startMultiplier: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isClusterFocused, setIsClusterFocused] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const flow = useMemo(() => {
    const incomeCategories = Object.entries(baseline.income) as [string, number][];
    const expenseCategories = Object.entries(baseline.expenses) as [string, number][];

    const baseIncome = incomeCategories.reduce((sum: number, [cat, val]) => {
        const mult = mutation.incomeMultipliers[cat] ?? 1;
        return sum + (val * mult);
    }, 0);
    
    const totalIncome = baseIncome * mutation.globalIncomeMultiplier;
    
    const coreExpenses = expenseCategories.map(([cat, val], idx) => ({
        cat,
        value: val * (mutation.expenseMultipliers[cat] ?? 1) * mutation.globalExpenseMultiplier,
        color: CATEGORICAL_COLORS[idx % CATEGORICAL_COLORS.length]
    })).filter(e => !isClusterFocused || e.value > 0);

    const totalExpenseValue = coreExpenses.reduce((sum: number, e) => sum + e.value, 0);
    const savings = Math.max(0, totalIncome - totalExpenseValue);

    const invested = savings * mutation.investmentRate;
    const cash = savings * (1 - mutation.investmentRate);

    const nodes: SankeyNode[] = [];
    nodes.push({ id: 'income_root', label: 'Gross Income', value: totalIncome, type: 'income_anchor', column: 0, color: '#3b82f6' });

    coreExpenses.forEach(e => {
        nodes.push({ id: `exp-${e.cat}`, label: e.cat, value: e.value, type: 'expense', column: 1, color: e.color });
    });
    nodes.push({ id: 'savings', label: 'Surplus', value: savings, type: 'savings', column: 1, color: '#10b981' });

    nodes.push({ id: 'invested', label: 'Invested', value: invested, type: 'invested', column: 2, color: '#10b981' });
    nodes.push({ id: 'cash', label: 'Cash', value: cash, type: 'cash', column: 2, color: '#64748b' });

    const links: SankeyLink[] = [];
    coreExpenses.forEach(e => {
        links.push({ source: 'income_root', target: `exp-${e.cat}`, value: e.value, color: e.color });
    });
    links.push({ source: 'income_root', target: 'savings', value: savings, color: '#10b981' });
    links.push({ source: 'savings', target: 'invested', value: invested, color: '#10b981' });
    links.push({ source: 'savings', target: 'cash', value: cash, color: '#64748b' });

    return { nodes, links, totalIncome, savings };
  }, [baseline, mutation, isClusterFocused]);

  // Viewport dimensions
  const width = isMobile ? 800 : 1400;
  const height = isMobile ? 1100 : 700; // Increased mobile height for better spacing
  const stepSize = isMobile ? 360 : 400; 
  const nodeSpacing = isMobile ? 30 : 35;
  const paddingMain = isMobile ? 60 : 220; 
  const paddingCross = isMobile ? 80 : 60; 

  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const buckets: Record<number, SankeyNode[]> = {};
    
    flow.nodes.forEach(n => {
        if (!buckets[n.column]) buckets[n.column] = [];
        buckets[n.column].push(n);
    });

    const maxBucketValue = Math.max(...Object.values(buckets).map(c => (c as SankeyNode[]).reduce((s: number, n: SankeyNode) => s + n.value, 0)));
    
    // Cross-dimension scale
    const crossDimensionTotal = isMobile ? width : height;
    const scale = (crossDimensionTotal - paddingCross * 2 - (Object.keys(buckets).length * nodeSpacing)) / (maxBucketValue || 1);

    Object.keys(buckets).forEach(bucketIdxStr => {
        const idx = parseInt(bucketIdxStr);
        const bNodes = buckets[idx];
        const bTotalValue = bNodes.reduce((s: number, n: SankeyNode) => s + n.value, 0);
        const bTotalCrossHeight = bTotalValue * scale;
        
        let currentCross = (crossDimensionTotal - bTotalCrossHeight - (bNodes.length - 1) * nodeSpacing) / 2;

        bNodes.forEach(n => {
            const crossSize = Math.max(8, n.value * scale);
            if (isMobile) {
              // Vertical Flow: Buckets are rows (0=Top, 1=Mid, 2=Bottom)
              pos[n.id] = { 
                x: currentCross, 
                y: paddingMain + idx * stepSize, 
                w: crossSize, 
                h: 24 
              };
            } else {
              // Horizontal Flow: Buckets are columns (0=Left, 1=Mid, 2=Right)
              pos[n.id] = { 
                x: paddingMain + idx * stepSize, 
                y: currentCross, 
                w: 24, 
                h: crossSize 
              };
            }
            currentCross += crossSize + nodeSpacing;
        });
    });

    return pos;
  }, [flow, isMobile, width, height, stepSize, paddingMain, paddingCross]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    const node = flow.nodes.find(n => n.id === id);
    if (!node || (node.type !== 'expense' && node.id !== 'income_root' && node.id !== 'savings' && node.id !== 'invested')) return;
    
    triggerHaptic();
    setSelectedNodeId(id);

    if (isMobile) return; // Mobile uses Bottom Sheet

    let startMultiplier = 1;
    if (node.id === 'income_root') startMultiplier = mutation.globalIncomeMultiplier;
    else if (node.id === 'savings') startMultiplier = mutation.globalExpenseMultiplier;
    else if (node.id === 'invested') startMultiplier = mutation.investmentRate;
    else startMultiplier = (mutation.expenseMultipliers[id.replace('exp-', '')] ?? 1);

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setActiveDrag({ id, startPos: clientY, startMultiplier });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!activeDrag) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const delta = activeDrag.startPos - clientY;
        const sensitivity = 0.005; 
        const id = activeDrag.id;
        
        if (id === 'income_root') {
            onMutationChange({ ...mutation, globalIncomeMultiplier: Math.max(0, activeDrag.startMultiplier + delta * sensitivity) });
        } else if (id === 'savings') {
            const newExpMultiplier = Math.max(0.1, activeDrag.startMultiplier - delta * sensitivity);
            onMutationChange({ ...mutation, globalExpenseMultiplier: newExpMultiplier });
        } else if (id === 'invested') {
            onMutationChange({ ...mutation, investmentRate: Math.min(1, Math.max(0, activeDrag.startMultiplier + delta * sensitivity)) });
        } else {
            const cat = id.replace('exp-', '');
            onMutationChange({ ...mutation, expenseMultipliers: { ...mutation.expenseMultipliers, [cat]: Math.max(0, activeDrag.startMultiplier + delta * sensitivity) } });
        }
    };
    const handleUp = () => setActiveDrag(null);
    if (activeDrag) {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleUp);
    };
  }, [activeDrag, mutation, onMutationChange]);

  const renderPath = (link: SankeyLink) => {
      const source = nodePositions[link.source];
      const target = nodePositions[link.target];
      if (!source || !target) return null;

      const sourceNode = flow.nodes.find(n => n.id === link.source)!;
      const targetNode = flow.nodes.find(n => n.id === link.target)!;
      const outgoingLinks = flow.links.filter(l => l.source === link.source);
      const incomingLinks = flow.links.filter(l => l.target === link.target);
      
      let sourceOffset = 0;
      for (const l of outgoingLinks) { 
        if (l === link) break; 
        sourceOffset += (l.value / sourceNode.value) * (isMobile ? source.w : source.h); 
      }
      let targetOffset = 0;
      for (const l of incomingLinks) { 
        if (l === link) break; 
        targetOffset += (l.value / targetNode.value) * (isMobile ? target.w : target.h); 
      }

      const segmentSize = (link.value / sourceNode.value) * (isMobile ? source.w : source.h);
      
      if (isMobile) {
        // Vertical Path Logic
        const x0 = source.x + sourceOffset + segmentSize / 2;
        const x1 = target.x + targetOffset + segmentSize / 2;
        const y0 = source.y + 24;
        const y1 = target.y;
        const cpy = y0 + (y1 - y0) / 2;
        return (
          <path key={`${link.source}-${link.target}`} d={`M ${x0} ${y0} C ${x0} ${cpy}, ${x1} ${cpy}, ${x1} ${y1}`} fill="none" stroke={link.color} strokeWidth={Math.max(2, segmentSize)} strokeOpacity={0.12} className="transition-all duration-300" />
        );
      } else {
        // Horizontal Path Logic
        const x0 = source.x + 24;
        const x1 = target.x;
        const y0 = source.y + sourceOffset + segmentSize / 2;
        const y1 = target.y + targetOffset + segmentSize / 2;
        const cpx = x0 + (x1 - x0) / 2;
        return (
          <path key={`${link.source}-${link.target}`} d={`M ${x0} ${y0} C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`} fill="none" stroke={link.color} strokeWidth={Math.max(2, segmentSize)} strokeOpacity={0.12} className="transition-all duration-300" />
        );
      }
  };

  const baselineInflowTotal = useMemo(() => (Object.values(baseline.income) as number[]).reduce((a, b) => a + b, 0), [baseline]);
  const baselineOutflowTotal = useMemo(() => (Object.values(baseline.expenses) as number[]).reduce((a, b) => a + b, 0), [baseline]);
  const baselineSavings = Math.max(0, baselineInflowTotal - baselineOutflowTotal);

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] lg:rounded-[3.5rem] p-6 lg:p-12 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative flex flex-col">
      <div className="flex flex-col gap-4 z-10 w-full mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-[12px] lg:text-[16px] font-black uppercase text-slate-400 tracking-[0.25em]">Strategic Pulse</h4>
          <div className="group relative">
              <Info size={14} className="text-slate-300 hover:text-blue-500 transition-colors cursor-help" />
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl text-xs font-bold leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isMobile ? "Tap nodes to open control sheet" : "Drag nodes to simulate shifts"}
              </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <svg 
          ref={containerRef} 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto select-none transition-all duration-700"
        >
          <g>{flow.links.map(renderPath)}</g>
          <g>
            {flow.nodes.map(n => {
              const pos = nodePositions[n.id];
              if (!pos) return null;
              const isMutable = n.type === 'expense' || n.id === 'income_root' || n.id === 'savings' || n.id === 'invested';
              const isSelected = selectedNodeId === n.id;
              
              let multiplier = 1;
              if (n.id === 'income_root') multiplier = mutation.globalIncomeMultiplier;
              else if (n.id === 'savings') multiplier = mutation.globalExpenseMultiplier;
              else if (n.id === 'invested') multiplier = mutation.investmentRate;
              else if (n.type === 'expense') multiplier = (mutation.expenseMultipliers[n.id.replace('exp-', '')] ?? 1);

              const isLeftAlignedColumn = n.column === 0 || n.column === 1;
              
              // Adjust label positions for vertical/horizontal flow
              let textX = pos.x;
              let textY = pos.y;
              let textAnchor: "start" | "end" | "middle" | "inherit" = "start";

              if (isMobile) {
                textX = pos.x + pos.w / 2;
                textY = pos.y - 12;
                textAnchor = "middle";
              } else {
                textX = isLeftAlignedColumn ? pos.x - 16 : pos.x + 40;
                textY = pos.y + pos.h / 2 - 8;
                textAnchor = isLeftAlignedColumn ? "end" : "start";
              }

              const showDiff = isMutable && (n.id === 'invested' ? true : multiplier !== 1);
              const diffText = n.id === 'invested' ? `${(multiplier * 100).toFixed(0)}% Rate` : `${multiplier < 1 ? '-' : '+'}${Math.abs((1 - multiplier) * 100).toFixed(0)}%`;

              return (
                <g 
                  key={n.id} 
                  className="transition-all duration-500 cursor-pointer"
                  onMouseDown={(e) => handleMouseDown(e, n.id)}
                  onTouchStart={(e) => handleMouseDown(e, n.id)}
                >
                  <rect 
                    x={pos.x} y={pos.y} width={pos.w} height={pos.h} 
                    fill={isSelected ? '#3b82f6' : n.color} 
                    rx={isMobile ? 8 : 6} 
                    className={`transition-all ${isMutable ? 'hover:opacity-80 active:opacity-100 shadow-2xl' : 'opacity-100'}`} 
                    style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' : 'none' }}
                  />
                  
                  {/* Visual Mutation Glow */}
                  {isSelected && (
                    <circle cx={pos.x + pos.w/2} cy={pos.y + pos.h/2} r={30} fill="#3b82f6" fillOpacity={0.1} className="animate-ping" />
                  )}

                  <text 
                    x={textX} y={textY} dy=".35em" 
                    fontSize={isMobile ? 16 : 18} 
                    textAnchor={textAnchor} 
                    className={`font-black uppercase tracking-widest transition-colors ${isSelected ? 'fill-blue-500' : 'fill-slate-600 dark:fill-slate-300'}`}
                  >
                    {n.label}
                  </text>
                  
                  {n.value > 0 && (
                      <text 
                        x={textX} 
                        y={isMobile ? pos.y + pos.h + 20 : textY + 26} 
                        fontSize={isMobile ? 14 : 15} 
                        textAnchor={textAnchor} 
                        className="font-mono font-bold fill-slate-900 dark:fill-white ghost-blur"
                      >
                          {formatBaseCurrency(n.value)}
                          {showDiff && (
                              <tspan className={(n.id === 'savings' ? multiplier > 1 : multiplier < 1) ? (n.id === 'income_root' || n.id === 'invested' ? 'fill-rose-500' : 'fill-emerald-500') : (n.id === 'income_root' || n.id === 'invested' ? 'fill-emerald-500' : 'fill-rose-500')}>
                                  {` (${diffText})`}
                              </tspan>
                          )}
                      </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {isMobile && (
        <div className="mt-8 flex justify-center pb-4">
            <button 
              onClick={() => setIsClusterFocused(!isClusterFocused)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isClusterFocused ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
            >
              {isClusterFocused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isClusterFocused ? 'Collapse Clusters' : 'Focus Cluster'}
            </button>
        </div>
      )}

      {!isMobile && (
        <div className="mt-8 lg:mt-12 flex flex-col sm:flex-row justify-end gap-6 lg:gap-12 border-t border-slate-100 dark:border-slate-800 pt-8 lg:pt-10">
            <div className="text-left sm:text-right">
                <p className="text-[10px] lg:text-[14px] font-black uppercase text-slate-400 tracking-widest">Projected Monthly Surplus</p>
                <p className={`text-xl lg:text-3xl font-black font-mono ghost-blur ${flow.savings > baselineInflowTotal * 0.2 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{formatBaseCurrency(flow.savings)}</p>
            </div>
            <div className="text-left sm:text-right">
                <p className="text-[10px] lg:text-[14px] font-black uppercase text-slate-400 tracking-widest">Simulation Optimization Δ</p>
                <p className="text-xl lg:text-3xl font-black font-mono text-blue-500 ghost-blur">+{formatBaseCurrency(Math.max(0, flow.savings - baselineSavings))}</p>
            </div>
        </div>
      )}

      <TacticalBottomSheet 
        isOpen={isMobile && !!selectedNodeId} 
        nodeId={selectedNodeId} 
        onClose={() => setSelectedNodeId(null)}
        mutation={mutation}
        onMutationChange={onMutationChange}
        baseline={baseline}
      />
    </div>
  );
};
