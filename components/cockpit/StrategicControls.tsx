import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp, ShoppingBag, Zap, Plus, Trash2, Calendar, DollarSign, Bookmark, Sparkles, Save, Play } from 'lucide-react';
import { CockpitMutationState, CockpitBaseline, SimulationEvent } from '../../types';
import { formatBaseCurrency } from '../../services/currencyService';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { MONTH_NAMES_TITLED as MONTH_NAMES } from '../../services/parsers/parserUtils';

interface StrategicControlsProps {
  mutation: CockpitMutationState;
  onMutationChange: (m: CockpitMutationState) => void;
  baseline: CockpitBaseline;
}

interface SavedScenario {
    id: string;
    name: string;
    mutation: CockpitMutationState;
    timestamp: string;
}

export const StrategicControls: React.FC<StrategicControlsProps> = ({ mutation, onMutationChange, baseline }) => {
  const [openSection, setOpenSection] = useState<'macro' | 'spending' | 'events' | 'scenarios' | null>('macro');
  const [scenarioName, setScenarioName] = useState('');
  const [savedScenarios, setSavedScenarios] = useIndexedDB<SavedScenario[]>('fintrack_saved_scenarios', []);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const updateMultiplier = (cat: string, type: 'income' | 'expense', value: number) => {
    const key = type === 'income' ? 'incomeMultipliers' : 'expenseMultipliers';
    onMutationChange({
      ...mutation,
      [key]: { ...mutation[key], [cat]: value }
    });
  };

  const addEvent = () => {
    const newEvent: SimulationEvent = {
      id: crypto.randomUUID(),
      month: 12,
      amount: 5000,
      type: 'OUTFLOW',
      label: 'New Strategic Event'
    };
    onMutationChange({ ...mutation, events: [...mutation.events, newEvent] });
  };

  const removeEvent = (id: string) => {
    onMutationChange({ ...mutation, events: mutation.events.filter(e => e.id !== id) });
  };

  const updateEvent = (id: string, updates: Partial<SimulationEvent>) => {
    onMutationChange({
      ...mutation,
      events: mutation.events.map(e => e.id === id ? { ...e, ...updates } : e)
    });
  };

  const saveCurrentScenario = () => {
      if (!scenarioName.trim()) return;
      const newScenario: SavedScenario = {
          id: crypto.randomUUID(),
          name: scenarioName.trim(),
          mutation: { ...mutation },
          timestamp: new Date().toISOString()
      };
      setSavedScenarios([...savedScenarios, newScenario]);
      setScenarioName('');
  };

  const deleteScenario = (id: string) => {
      setSavedScenarios(savedScenarios.filter(s => s.id !== id));
  };

  const applyPreset = (type: 'lean' | 'balanced' | 'growth') => {
      const presets: Record<string, Partial<CockpitMutationState>> = {
          lean: { 
              globalIncomeMultiplier: 1.0, globalExpenseMultiplier: 0.8, 
              investmentRate: 0.5, macroGrowthRate: 0.05,
              incomeMultipliers: {}, expenseMultipliers: {}
          },
          balanced: { 
              globalIncomeMultiplier: 1.0, globalExpenseMultiplier: 1.0, 
              investmentRate: 0.2, macroGrowthRate: 0.07,
              incomeMultipliers: {}, expenseMultipliers: {}
          },
          growth: { 
              globalIncomeMultiplier: 1.15, globalExpenseMultiplier: 1.0, 
              investmentRate: 0.35, macroGrowthRate: 0.09,
              incomeMultipliers: {}, expenseMultipliers: {}
          }
      };
      onMutationChange({ ...mutation, ...presets[type] });
  };

  const SectionHeader = ({ id, icon: Icon, title, sub }: { id: any, icon: any, title: string, sub: string }) => (
    <button 
      onClick={() => setOpenSection(openSection === id ? null : id)}
      className={`w-full flex items-center justify-between px-5 py-4 transition-all duration-300 ${openSection === id ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${openSection === id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          <Icon size={16} />
        </div>
        <div className="text-left">
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{title}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{sub}</p>
        </div>
      </div>
      {openSection === id ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
    </button>
  );

  const getEventTimeLabels = (totalMonthIndex: number) => {
      const targetMonth = (currentMonth + totalMonthIndex) % 12;
      const targetYear = currentYear + Math.floor((currentMonth + totalMonthIndex) / 12);
      return { monthName: MONTH_NAMES[targetMonth], year: targetYear, month: targetMonth };
  };

  const handleTimeChange = (id: string, field: 'monthName' | 'year', value: string) => {
      const event = mutation.events.find(e => e.id === id);
      if (!event) return;
      const { month: m, year: y } = getEventTimeLabels(event.month);
      let newM = m, newY = y;
      if (field === 'monthName') newM = MONTH_NAMES.indexOf(value);
      else newY = parseInt(value);
      const totalTargetMonths = (newY * 12 + newM);
      const totalNowMonths = (currentYear * 12 + currentMonth);
      updateEvent(id, { month: Math.max(0, totalTargetMonths - totalNowMonths) });
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col h-full">
      <div className="border-b border-slate-100 dark:border-slate-700/50">
        <SectionHeader id="macro" icon={Target} title="Core Mechanics" sub="Baseline Assumptions" />
        {openSection === 'macro' && (
          <div className="p-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Income Scalar</p>
                <span className={`text-xs font-black font-mono ${mutation.globalIncomeMultiplier > 1 ? 'text-emerald-500' : mutation.globalIncomeMultiplier < 1 ? 'text-rose-500' : 'text-blue-500'}`}>{(mutation.globalIncomeMultiplier * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0.5" max="3" step="0.01" value={mutation.globalIncomeMultiplier} onChange={(e) => onMutationChange({ ...mutation, globalIncomeMultiplier: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Spending Scalar</p>
                <span className={`text-xs font-black font-mono ${mutation.globalExpenseMultiplier < 1 ? 'text-emerald-500' : mutation.globalExpenseMultiplier > 1 ? 'text-rose-500' : 'text-blue-500'}`}>{(mutation.globalExpenseMultiplier * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0.5" max="3" step="0.01" value={mutation.globalExpenseMultiplier} onChange={(e) => onMutationChange({ ...mutation, globalExpenseMultiplier: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Reinvestment</p>
                <span className="text-xs font-black text-indigo-500 font-mono">{(mutation.investmentRate * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={mutation.investmentRate} onChange={(e) => onMutationChange({ ...mutation, investmentRate: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Annual Return</p>
                <span className="text-xs font-black text-amber-500 font-mono">{(mutation.macroGrowthRate * 100).toFixed(1)}%</span>
              </div>
              <input type="range" min="0" max="0.20" step="0.005" value={mutation.macroGrowthRate} onChange={(e) => onMutationChange({ ...mutation, macroGrowthRate: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-slate-100 dark:border-slate-700/50">
        <SectionHeader id="spending" icon={ShoppingBag} title="Spending Variance" sub="Category Modifiers" />
        {openSection === 'spending' && (
          <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[400px] overflow-y-auto custom-scrollbar">
            {(Object.entries(baseline.expenses) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
              const mult = mutation.expenseMultipliers[cat] ?? 1;
              return (
                <div key={cat} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider truncate mr-2">{cat}</span>
                    <span className={`text-[9px] font-black font-mono ${mult < 1 ? 'text-emerald-500' : mult > 1 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {formatBaseCurrency(val * mult * mutation.globalExpenseMultiplier)} ({mult < 1 ? '-' : '+'}{Math.abs((1 - mult) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <input type="range" min="0" max="3" step="0.05" value={mult} onChange={(e) => updateMultiplier(cat, 'expense', parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-b border-slate-100 dark:border-slate-700/50">
        <SectionHeader id="events" icon={Zap} title="Life Events" sub="Strategic Triggers" />
        {openSection === 'events' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[500px] overflow-y-auto custom-scrollbar">
            {mutation.events.map(ev => {
              const { monthName, year } = getEventTimeLabels(ev.month);
              return (
                <div key={ev.id} className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-xl border border-slate-700/50 relative group">
                  <button onClick={() => removeEvent(ev.id)} className="absolute top-3 right-3 p-1 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${ev.type === 'INFLOW' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}><Zap size={12} /></div>
                    <input type="text" value={ev.label} onChange={(e) => updateEvent(ev.id, { label: e.target.value })} className="bg-transparent border-b border-white/10 outline-none text-[10px] font-black uppercase tracking-widest flex-1 focus:border-blue-500 transition-colors text-white" placeholder="Event Name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={8}/> Date</p>
                      <div className="flex gap-1">
                          <select value={monthName} onChange={(e) => handleTimeChange(ev.id, 'monthName', e.target.value)} className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none border border-white/5 text-white cursor-pointer">{MONTH_NAMES.map(m => <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>)}</select>
                          <select value={year} onChange={(e) => handleTimeChange(ev.id, 'year', e.target.value)} className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none border border-white/5 text-white cursor-pointer">{Array.from({length: 6}, (_, i) => currentYear + i).map(y => (<option key={y} value={y} className="bg-slate-800 text-white">{y}</option>))}</select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><DollarSign size={8}/> Amount</p>
                      <input type="number" value={ev.amount} onChange={(e) => updateEvent(ev.id, { amount: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-mono font-bold outline-none focus:border-blue-500/30 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                    <button onClick={() => updateEvent(ev.id, { type: 'INFLOW' })} className={`flex-1 py-1 rounded-lg text-[8px] font-black transition-all ${ev.type === 'INFLOW' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>INFLOW</button>
                    <button onClick={() => updateEvent(ev.id, { type: 'OUTFLOW' })} className={`flex-1 py-1 rounded-lg text-[8px] font-black transition-all ${ev.type === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>OUTFLOW</button>
                  </div>
                </div>
              );
            })}
            <button onClick={addEvent} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all text-[9px] font-black uppercase tracking-widest group"><Plus size={14} className="group-hover:scale-110 transition-transform" /> Life Event</button>
          </div>
        )}
      </div>

      <div>
        <SectionHeader id="scenarios" icon={Bookmark} title="Scenarios" sub="Snapshots & Presets" />
        {openSection === 'scenarios' && (
          <div className="p-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Strategic Presets</p>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'lean', label: 'Lean', icon: ShoppingBag, color: 'hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' },
                        { id: 'balanced', label: 'Balanced', icon: Target, color: 'hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10' },
                        { id: 'growth', label: 'Growth', icon: Sparkles, color: 'hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' }
                    ].map(preset => (
                        <button key={preset.id} onClick={() => applyPreset(preset.id as any)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 transition-all active:scale-95 ${preset.color}`}><preset.icon size={16} /><span className="text-[9px] font-black uppercase tracking-tighter">{preset.label}</span></button>
                    ))}
                </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Save Snapshot</p>
                <div className="flex gap-2">
                    <input type="text" placeholder="Scenario name..." value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-slate-100" />
                    <button onClick={saveCurrentScenario} disabled={!scenarioName.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-90"><Save size={18} /></button>
                </div>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {savedScenarios.length > 0 ? savedScenarios.map(s => (
                    <div key={s.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-blue-400/40 transition-all">
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[120px]">{s.name}</span><span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(s.timestamp).toLocaleDateString()}</span></div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onMutationChange(s.mutation)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg" title="Load"><Play size={14} fill="currentColor" /></button>
                            <button onClick={() => deleteScenario(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Delete"><Trash2 size={14} /></button>
                        </div>
                    </div>
                )) : <div className="py-6 text-center text-slate-400 opacity-40 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl"><Bookmark size={24} className="mx-auto mb-2 opacity-10" /><span className="text-[9px] font-black uppercase tracking-widest">No Saved Scenarios</span></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};