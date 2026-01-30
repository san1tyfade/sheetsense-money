
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { HierarchyNode, getHeatmapColor } from '../../services/analytics/hierarchyService';
import { useFinancialStore } from '../../context/FinancialContext';
import { Terminal, Zap, MousePointer2, ArrowRight, ShieldCheck } from 'lucide-react';
import { haptics } from '../../services/infrastructure/HapticService';
import { PrivacyValue } from '../core-ui/PrivacyValue';

interface SpendTreemapProps {
  root: HierarchyNode;
  drillPath: string[];
  onDrill: (path: string[]) => void;
  metric: 'VALUE' | 'COUNT';
  onHover?: (node: HierarchyNode | null, activeTotal: number) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  node: HierarchyNode;
}

/**
 * Mobile Fallback List Component
 */
const HeatmapTileList = ({ nodes = [], total, onDrill, isDarkMode, metric }: any) => {
  return (
    <div className="space-y-3 px-2 py-4 animate-in slide-in-from-bottom-4 duration-500">
      {nodes.map((node: HierarchyNode) => {
        if (!node) return null;
        const totalBasis = metric === 'VALUE' ? total : nodes.reduce((s: number, n: any) => s + n.count, 0);
        const nodeVal = metric === 'VALUE' ? node.value : node.count;
        const ratio = nodeVal / (totalBasis || 1);
        const color = getHeatmapColor(ratio, isDarkMode);
        const hasChildren = node.children && node.children.length > 0;

        return (
          <button
            key={node.id}
            onClick={() => hasChildren && onDrill(node)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none p-5 flex items-center gap-5 transition-all active:scale-[0.98] text-left group overflow-hidden relative shadow-sm"
          >
            <div className="w-1.5 h-10 rounded-none shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest truncate">{node.name || 'Unlabeled Node'}</h4>
                {node.isJournalBacked && <ShieldCheck size={12} className="text-emerald-500" />}
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                <span className="font-mono">{node.count || 0}</span> {node.count === 1 ? 'Transaction' : 'Transactions'} • <span className="font-mono">{(ratio * 100).toFixed(1)}%</span> weight
              </p>
            </div>
            <div className="text-right shrink-0">
              <PrivacyValue 
                value={metric === 'VALUE' ? (node.value || 0) : (node.count || 0)} 
                format={metric === 'VALUE' ? 'currency' : 'number'}
                className="text-sm font-black text-slate-900 dark:text-white font-mono" 
              />
              {hasChildren && <ArrowRight size={14} className="text-blue-500 ml-auto mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />}
            </div>
            {node.isShock && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 rounded-none flex items-start justify-end p-1.5"><Zap size={10} className="text-rose-500 animate-pulse" /></div>}
          </button>
        );
      })}
    </div>
  );
};

export const SpendTreemap: React.FC<SpendTreemapProps> = ({ root, drillPath, onDrill, metric, onHover }) => {
  const { isDarkMode } = useFinancialStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  const activeNode = useMemo(() => {
    let node = root;
    if (!node) return { id: 'null', name: 'Root', value: 0, count: 0, children: [] } as HierarchyNode;
    
    for (const part of drillPath) {
      const found = node.children?.find(c => c.name === part);
      if (found) node = found;
      else break;
    }
    return node;
  }, [root, drillPath]);

  const activeTotal = useMemo(() => {
      if (!activeNode) return 1;
      return metric === 'VALUE' ? (activeNode.value || 0) : (activeNode.count || 0);
  }, [activeNode, metric]);

  const rects = useMemo(() => {
    if (isMobile || !dimensions.width || !dimensions.height || !activeNode?.children?.length) return [];

    const results: Rect[] = [];
    const total = activeTotal || 1;
    
    let remainingX = 0;
    let remainingY = 0;
    let remainingW = dimensions.width;
    let remainingH = dimensions.height;

    const sortedChildren = [...activeNode.children].sort((a, b) => {
      if (a.isJournalBacked && !b.isJournalBacked) return -1;
      if (!a.isJournalBacked && b.isJournalBacked) return 1;
      
      if (a.isSummaryNode && !b.isSummaryNode) return 1;
      if (!a.isSummaryNode && b.isSummaryNode) return -1;

      const valA = metric === 'VALUE' ? (a.value || 0) : (a.count || 0);
      const valB = metric === 'VALUE' ? (b.value || 0) : (b.count || 0);
      return valB - valA;
    });

    sortedChildren.forEach((child, idx) => {
      const val = metric === 'VALUE' ? (child.value || 0) : (child.count || 0);
      const ratio = val / total;
      
      const isVertical = remainingW > remainingH;
      let w, h, x, y;

      if (isVertical) {
        w = remainingW * ratio;
        h = remainingH;
        x = remainingX;
        y = remainingY;
        remainingX += w;
        remainingW -= w;
      } else {
        w = remainingW;
        h = remainingH * ratio;
        x = remainingX;
        y = remainingY;
        remainingY += h;
        remainingH -= h;
      }

      if (idx === sortedChildren.length - 1) {
        if (isVertical) w += remainingW;
        else h += remainingH;
      }

      results.push({ x, y, width: w, height: h, node: child });
    });

    return results;
  }, [activeNode, dimensions, metric, isMobile, activeTotal]);

  const handleNodeClick = useCallback((node: HierarchyNode) => {
    if (node.children && node.children.length > 0) {
      haptics.click('soft');
      onHover?.(null, activeTotal);
      onDrill([...drillPath, node.name]);
    }
  }, [drillPath, onDrill, onHover, activeTotal]);

  if (isMobile) {
    return (
      <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-none border border-slate-200 dark:border-slate-800 min-h-[500px]">
        <HeatmapTileList 
          nodes={activeNode?.children || []} 
          total={activeTotal} 
          onDrill={handleNodeClick}
          isDarkMode={isDarkMode}
          metric={metric}
        />
        {(!activeNode?.children || activeNode.children.length === 0) && (
            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 p-10 text-center">
                <Terminal size={40} className="opacity-10 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Leaf Node Reached</p>
            </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      onMouseLeave={() => onHover?.(null, activeTotal)}
      className="w-full h-full min-h-[500px] relative cursor-default select-none overflow-hidden rounded-none border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-2xl"
    >
      <svg width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
        {rects.map((r) => {
          const val = metric === 'VALUE' ? (r.node.value || 0) : (r.node.count || 0);
          const ratio = val / (activeTotal || 1);
          const color = getHeatmapColor(ratio, isDarkMode);
          const isLarge = r.width > 120 && r.height > 60;
          const isTiny = r.width < 50 || r.height < 30;
          const textColor = (isDarkMode || ratio > 0.4) ? '#ffffff' : '#000000';

          return (
            <g 
              key={r.node.id} 
              onClick={() => handleNodeClick(r.node)} 
              onMouseEnter={() => onHover?.(r.node, activeTotal)}
              className="group cursor-pointer"
            >
              <rect
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                fill={color}
                stroke={isDarkMode ? '#0f172a' : '#fff'}
                strokeWidth={1.5}
                className="transition-all duration-700 group-hover:opacity-90 group-hover:stroke-blue-500/50"
              />
              
              {r.node.isShock && (
                <rect
                  x={r.x + 6}
                  y={r.y + 6}
                  width={Math.max(0, r.width - 12)}
                  height={Math.max(0, r.height - 12)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  className="animate-pulse opacity-50"
                />
              )}

              {!isTiny && (
                <foreignObject x={r.x + 8} y={r.y + 8} width={Math.max(0, r.width - 16)} height={Math.max(0, r.height - 16)} className="pointer-events-none">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                        <p 
                            className={`font-black uppercase tracking-tight truncate ${isLarge ? 'text-xs md:text-sm' : 'text-[9px]'} flex-1`}
                            style={{ color: textColor }}
                        >
                        {r.node.name || 'Unknown'}
                        </p>
                        {r.node.isJournalBacked && (
                            <ShieldCheck size={isLarge ? 12 : 10} className="text-emerald-400 shrink-0" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' }} />
                        )}
                    </div>
                    {isLarge && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline gap-1">
                          <PrivacyValue 
                              value={val} 
                              format={metric === 'VALUE' ? 'currency' : 'number'}
                              className="font-mono font-black text-xs"
                              style={{ color: textColor }}
                          />
                          {metric === 'COUNT' && (
                            <span className="text-[8px] font-black uppercase opacity-60" style={{ color: textColor }}>
                              {val === 1 ? 'Hit' : 'Hits'}
                            </span>
                          )}
                        </div>
                        <p className={`text-[8px] font-black uppercase tracking-widest opacity-60 font-mono`} style={{ color: textColor }}>
                          {(ratio * 100).toFixed(1)}% weight
                        </p>
                      </div>
                    )}
                    {!isLarge && r.height > 40 && (
                       <div className="mt-1">
                          <PrivacyValue 
                              value={val} 
                              format={metric === 'VALUE' ? 'currency' : 'number'}
                              className="font-mono font-black text-[9px]"
                              style={{ color: textColor }}
                          />
                       </div>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-6 right-8 flex items-center gap-4 opacity-20 pointer-events-none">
          <MousePointer2 size={12} className="text-slate-400" />
          <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">Interactive Hierarchy Active</span>
      </div>

      {rects.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/50">
           <div className="p-8 bg-slate-900 rounded-none border border-slate-800 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
              <Terminal size={48} className="opacity-10" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Context Mapped</p>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Adjust Temporal Focus or Logic Depth</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
