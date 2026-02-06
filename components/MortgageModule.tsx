import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { X, Clock, TrendingUp, Zap, Terminal, Shield, Building, Save, ChevronDown, RotateCcw } from 'lucide-react';
import { calculateAmortization, RENEWAL_YEAR_BENCHMARK } from '../services/mortgageService';
import { MortgageInput, PaymentFrequency, MortgageScenario, AmortizationPoint } from '../types';
import { formatCurrency } from '../services/currencyService';
import { saveMortgageScenario, getMortgageScenarios, deleteMortgageScenario } from '../services/storage';
import { haptics } from '../services/infrastructure/HapticService';

type SectionKey = 'CORE' | 'STRATEGY' | 'LOGISTICS';

const CustomTooltip = ({ active, payload, label, schedule }: any) => {
  if (active && payload && payload.length) {
    const periodIndex = label;
    const point = schedule?.[periodIndex] || payload[0].payload;
    const year = point?.year ?? 0;
    const strategyVal = payload[1]?.value || 0;
    const standardVal = payload[0]?.value || 0;
    const savings = standardVal - strategyVal;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-5 rounded-[1.5rem] shadow-2xl border border-slate-700 min-w-[220px] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year {year}</p>
          </div>
          {savings > 0 && (
            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              SAVING ${formatCurrency(savings, 0, 0)}
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Strategy</span>
            <span className="text-lg font-black text-white tracking-tight font-mono">${formatCurrency(strategyVal, 0, 0)}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Path</span>
            <span className="text-base font-bold text-slate-400 tracking-tight font-mono opacity-60">${formatCurrency(standardVal, 0, 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const AccordionHeader = ({ section, icon: Icon, label, summary, isOpen, onToggle }: { section: SectionKey, icon: any, label: string, summary?: string, isOpen: boolean, onToggle: (s: SectionKey) => void }) => {
    return (
        <button 
            onClick={() => onToggle(section)}
            className={`w-full flex items-center justify-between p-6 transition-all duration-300 ${isOpen ? 'bg-blue-600/5' : 'hover:bg-slate-50 dark:hover:bg-slate-950'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-all ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Icon size={18} />
                </div>
                <div className="text-left">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isOpen ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                        {label}
                    </h4>
                    {!isOpen && summary && (
                        <p className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-tighter mt-1">{summary}</p>
                    )}
                </div>
            </div>
            <ChevronDown size={16} className={`text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </button>
    );
};

export const MortgageModule: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>('CORE');
  const [inputs, setInputs] = useState<MortgageInput>({
    principal: 580000,
    interestRate: 3.8,
    termYears: 25,
    extraMonthly: 100,
    extraAnnualPercent: 0,
    lumpSumAmount: 0,
    lumpSumMonth: 12,
    frequency: PaymentFrequency.ACC_BI_WEEKLY,
    propertyTaxes: 3000,
    heatingCost: 200,
    isStressTestEnabled: false,
    renewalRate: 7.24
  });

  const [scenarios, setScenarios] = useState<MortgageScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const list = await getMortgageScenarios();
    setScenarios(list.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) return;
    haptics.click('light');
    setIsSaving(true);
    const newScenario: MortgageScenario = {
      id: crypto.randomUUID(),
      name: scenarioName.trim(),
      inputs: { ...inputs },
      timestamp: Date.now()
    };
    try {
      await saveMortgageScenario(newScenario);
      setScenarioName("");
      await loadScenarios();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.click('heavy');
    if (!confirm("Irreversibly delete this scenario protocol?")) return;
    await deleteMortgageScenario(id);
    await loadScenarios();
  };

  const handleLoadScenario = (scenario: MortgageScenario) => {
    haptics.click('soft');
    setInputs(scenario.inputs);
  };

  const schedule = useMemo(() => calculateAmortization(inputs), [inputs]);

  const stats = useMemo(() => {
    const finalPoint = (schedule[schedule.length - 1] || { 
      totalInterest: 0, 
      period: 0, 
      acceleratedTotalInterest: 0, 
      year: 0, 
      acceleratedBalance: 0,
      acceleratedPayment: 0
    }) as AmortizationPoint;
    
    const lastAcc = schedule.find(s => s.acceleratedBalance <= 0) || finalPoint;
    
    const timeSavedPeriods = Math.max(0, schedule.length - (lastAcc.period || 0) - 1);
    const periodsPerYear = inputs.frequency === PaymentFrequency.MONTHLY ? 12 : 26;
    
    const milestonePeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;
    const mPoint = schedule[Math.min(milestonePeriod, schedule.length - 1)] || { acceleratedBalance: 0 };
    
    const monthlyPre = schedule.length > 2 
        ? (schedule[Math.max(1, Math.min(schedule.length - 1, milestonePeriod - 1))].acceleratedPayment * periodsPerYear) / 12
        : 0;
    const monthlyPost = schedule.length > 2
        ? (schedule[Math.min(schedule.length - 1, milestonePeriod + 1)].acceleratedPayment * periodsPerYear) / 12
        : 0;
    const shockAmount = Math.max(0, monthlyPost - monthlyPre);

    return {
      interestSaved: Math.max(0, finalPoint.totalInterest - lastAcc.acceleratedTotalInterest),
      yearsSaved: Math.floor(timeSavedPeriods / periodsPerYear),
      monthsSaved: Math.round((timeSavedPeriods % periodsPerYear) / (periodsPerYear / 12)),
      totalInterest: finalPoint.totalInterest,
      payoffYear: new Date().getFullYear() + (lastAcc.year || 0),
      milestone: {
        balance: mPoint.acceleratedBalance,
        equity: Math.max(0, inputs.principal - mPoint.acceleratedBalance),
        ratio: ((inputs.principal - mPoint.acceleratedBalance) / (inputs.principal || 1)) * 100
      },
      pith: {
        total: (schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost,
        taxPercent: ((inputs.propertyTaxes / 12) / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost) || 1)) * 100,
        heatPercent: (inputs.heatingCost / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost) || 1)) * 100
      },
      shock: {
        amount: shockAmount,
        percent: (shockAmount / (monthlyPre || 1)) * 100
      }
    };
  }, [schedule, inputs]);

  const handleInputChange = (key: keyof MortgageInput, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    haptics.click('soft');
    setInputs({
      principal: 580000,
      interestRate: 3.8,
      termYears: 25,
      extraMonthly: 100,
      extraAnnualPercent: 0,
      lumpSumAmount: 0,
      lumpSumMonth: 12,
      frequency: PaymentFrequency.ACC_BI_WEEKLY,
      propertyTaxes: 3000,
      heatingCost: 200,
      isStressTestEnabled: false,
      renewalRate: 7.24
    });
  };

  const toggleSection = (section: SectionKey) => {
    haptics.click('soft');
    setExpandedSection(prev => prev === section ? null : section);
  };

  const periodsPerYear = inputs.frequency === PaymentFrequency.MONTHLY ? 12 : 26;
  const milestonePeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;

  return (
    <div className="flex flex-col xl:flex-row gap-8 min-h-[800px] animate-in fade-in duration-700 tabular-nums">
      
      {/* 1. Results Column (Left) */}
      <main className="flex-1 space-y-8 min-w-0 order-1 xl:order-1">
        
        {/* Primary Outcome Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-2 border-slate-900">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10 space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Resource Preservation</p>
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white font-mono flex items-baseline">
                        ${formatCurrency(stats.interestSaved, 0, 0)}
                        <span className="text-xs sm:text-sm text-emerald-500 font-black ml-4 uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Saved</span>
                    </h2>
                    <div className="pt-6 border-t border-slate-900 flex items-center justify-between">
                         <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             <TrendingUp size={12} className="text-emerald-500" /> Strategy Alpha Optimized
                         </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-2 border-slate-900">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10 space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Velocity Compression</p>
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white font-mono flex items-baseline">
                        {stats.yearsSaved}<span className="text-2xl ml-1 text-slate-600">Y</span> {stats.monthsSaved}<span className="text-2xl ml-1 text-slate-600">M</span>
                        <span className="text-xs sm:text-sm text-blue-500 font-black ml-4 uppercase tracking-[0.2em] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Shortened</span>
                    </h2>
                    <div className="pt-6 border-t border-slate-900 flex items-center justify-between">
                         <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                             <Clock size={12} className="text-blue-500" /> Payoff Anchor: {stats.payoffYear}
                         </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Amortization Curve Visualizer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-10 md:p-12 shadow-sm relative overflow-hidden group transition-all duration-500 hover:shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-12 relative z-10 gap-6">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Amortization Gradient</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Strategic vs Nominal Balance Evolution</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded-sm border-t-2 border-dashed border-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Path</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-600 rounded-sm shadow-lg shadow-indigo-600/30" />
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest font-black">Strategy</span>
                    </div>
                </div>
            </div>

            <div className="h-[450px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={schedule} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                        <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.05}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                        <XAxis 
                            dataKey="period" 
                            tick={{fontSize: 10, fill: '#64748b', fontWeight: '900'}} 
                            axisLine={false} tickLine={false} 
                            interval={periodsPerYear * 4}
                            tickFormatter={(v) => `Y${Math.floor(v / periodsPerYear)}`}
                        />
                        <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: '900'}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}` + 'k'} width={55} />
                        <Tooltip content={<CustomTooltip schedule={schedule} />} />
                        <Area type="monotone" dataKey="balance" stroke="#94a3b8" fill="url(#colorStd)" strokeWidth={2} strokeDasharray="8 6" animationDuration={1000} isAnimationActive={false} />
                        <Area type="monotone" dataKey="acceleratedBalance" stroke="#4f46e5" fill="url(#colorAcc)" strokeWidth={5} animationDuration={1500} isAnimationActive={false} />
                        {inputs.isStressTestEnabled && (
                            <ReferenceLine x={milestonePeriod} stroke="#f43f5e" strokeDasharray="10 5" strokeWidth={2}>
                                <Label value="RENEWAL PULSE" position="top" fill="#f43f5e" fontSize={8} fontWeight="900" className="uppercase" />
                            </ReferenceLine>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Supporting Secondary Audit Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between group hover:border-blue-500/30 transition-all shadow-sm">
                <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Monthly Carry (PITH)</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">${formatCurrency(stats.pith.total, 0, 0)}</h3>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900">
                        <div className="bg-indigo-600 transition-all duration-1000" style={{ width: `${Math.max(0, 100 - stats.pith.taxPercent - stats.pith.heatPercent)}%` }} />
                        <div className="bg-amber-400 transition-all duration-1000" style={{ width: `${stats.pith.taxPercent}%` }} />
                        <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${stats.pith.heatPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-tighter">
                        <span className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-600 rounded-full" /> P+I</span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 bg-amber-400 rounded-full" /> TAX</span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 bg-rose-500 rounded-full" /> HEAT</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">5-Yr Equity Captured</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">${formatCurrency(stats.milestone.equity, 0, 0)}</h3>
                </div>
                <div className="mt-6 space-y-2">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.milestone.ratio}%` }} />
                    </div>
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                        {stats.milestone.ratio.toFixed(1)}% Principal Amortized
                    </p>
                </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col justify-between shadow-sm ${inputs.isStressTestEnabled ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50'}`}>
                <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${inputs.isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>
                        {inputs.isStressTestEnabled ? 'Periodic Shock' : 'Stress Tolerance'}
                    </p>
                    <h3 className={`text-2xl font-black font-mono tracking-tighter ${inputs.isStressTestEnabled ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {inputs.isStressTestEnabled ? `+$${formatCurrency(stats.shock.amount, 0, 0)}` : 'Stable'}
                    </h3>
                </div>
                {inputs.isStressTestEnabled && (
                    <div className="mt-6 space-y-2">
                        <div className="h-2 w-full bg-rose-100 dark:bg-rose-950 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${Math.min(100, stats.shock.percent)}%` }} />
                        </div>
                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                            {stats.shock.percent.toFixed(1)}% Increase Protocol
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Audit Footnote */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-center gap-6 group shadow-sm hover:shadow-md transition-all">
            <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Terminal size={24} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sovereign Debt Audit</p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                    Strategy execution secures <span className="text-emerald-500 font-black">${formatCurrency(stats.interestSaved, 0, 0)}</span> in net capital preservation. 
                    Structure remains compliant with Canadian semi-annual compounding protocols.
                </p>
            </div>
        </div>

      </main>

      {/* 2. Control Sidebar (Right) */}
      <aside className="xl:w-[400px] shrink-0 order-2 xl:order-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-fit sticky top-8">
            
            {/* Core Loan Parameters */}
            <div className="border-b border-slate-100 dark:border-slate-800">
                <AccordionHeader 
                    section="CORE" 
                    icon={Shield} 
                    label="Core Debt Profile" 
                    summary={`$${(inputs.principal/1000).toFixed(0)}k @ ${inputs.interestRate}%`}
                    isOpen={expandedSection === 'CORE'}
                    onToggle={toggleSection}
                />
                {expandedSection === 'CORE' && (
                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Global Principal</label>
                            <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 focus-within:border-blue-500/50 transition-all shadow-inner">
                                <input 
                                    type="number" 
                                    value={inputs.principal} 
                                    onChange={e => handleInputChange('principal', parseFloat(e.target.value))}
                                    className="bg-transparent w-full font-black font-mono text-lg outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            <input type="range" min="50000" max="2500000" step="10000" value={inputs.principal} onChange={(e) => handleInputChange('principal', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Rate %</label>
                                <input type="number" step="0.01" value={inputs.interestRate} onChange={e => handleInputChange('interestRate', parseFloat(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-mono font-black text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Term (Y)</label>
                                <input type="number" value={inputs.termYears} onChange={e => handleInputChange('termYears', parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-mono font-black text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Protocol</label>
                            <div className="grid grid-cols-1 gap-1.5">
                                {['MONTHLY', 'BI_WEEKLY', 'ACC_BI_WEEKLY'].map(f => (
                                    <button 
                                        key={f} 
                                        onClick={() => handleInputChange('frequency', f)}
                                        className={`w-full py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 text-left px-5 flex items-center justify-between ${inputs.frequency === f ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-800'}`}
                                    >
                                        {f.replace(/_/g, ' ')}
                                        {inputs.frequency === f && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Acceleration Strategy Parameters */}
            <div className="border-b border-slate-100 dark:border-slate-800">
                <AccordionHeader 
                    section="STRATEGY" 
                    icon={Zap} 
                    label="Acceleration Logic" 
                    summary={`+$${inputs.extraMonthly}/mo • Escalating ${inputs.extraAnnualPercent}%`}
                    isOpen={expandedSection === 'STRATEGY'}
                    onToggle={toggleSection}
                />
                {expandedSection === 'STRATEGY' && (
                    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Supplementary Flow</label>
                                <span className="text-emerald-500 font-mono font-black text-[10px]">+${inputs.extraMonthly}/mo</span>
                            </div>
                            <input type="range" min="0" max="5000" step="50" value={inputs.extraMonthly} onChange={(e) => handleInputChange('extraMonthly', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Annual Escalation</label>
                                <span className="text-emerald-500 font-mono font-black text-[10px]">+{inputs.extraAnnualPercent}%</span>
                            </div>
                            <input type="range" min="0" max="20" step="1" value={inputs.extraAnnualPercent} onChange={(e) => handleInputChange('extraAnnualPercent', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${inputs.isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>Renewal Stress Test</label>
                                <button onClick={() => handleInputChange('isStressTestEnabled', !inputs.isStressTestEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${inputs.isStressTestEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${inputs.isStressTestEnabled ? 'left-5.5' : 'left-0.5'}`} style={{ left: inputs.isStressTestEnabled ? '22px' : '2px' }}></div>
                                </button>
                            </div>
                            {inputs.isStressTestEnabled && (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="flex justify-between text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        <span>Shock Projection</span>
                                        <span className="font-mono">{inputs.renewalRate}%</span>
                                    </div>
                                    <input type="range" min="0" max="15" step="0.1" value={inputs.renewalRate} onChange={(e) => handleInputChange('renewalRate', parseFloat(e.target.value))} className="w-full h-1 bg-rose-200 dark:bg-rose-900 rounded-lg appearance-none cursor-pointer accent-rose-600" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Carrying Logistics */}
            <div className="border-b border-slate-100 dark:border-slate-800">
                <AccordionHeader 
                    section="LOGISTICS" 
                    icon={Building} 
                    label="Operating Logistics" 
                    summary={`Tax: $${inputs.propertyTaxes} • Heat: $${inputs.heatingCost}`}
                    isOpen={expandedSection === 'LOGISTICS'}
                    onToggle={toggleSection}
                />
                {expandedSection === 'LOGISTICS' && (
                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Annual Property Taxes</label>
                            <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-inner">
                                <input 
                                    type="number" 
                                    value={inputs.propertyTaxes} 
                                    onChange={e => handleInputChange('propertyTaxes', parseFloat(e.target.value) || 0)}
                                    className="bg-transparent w-full font-black font-mono text-sm outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Monthly Heating</label>
                            <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-inner">
                                <input 
                                    type="number" 
                                    value={inputs.heatingCost} 
                                    onChange={e => handleInputChange('heatingCost', parseFloat(e.target.value) || 0)}
                                    className="bg-transparent w-full font-black font-mono text-sm outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scenario Persistence & Defaults */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6">
                <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="SCENARIO_ID" 
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500 text-slate-900 dark:text-white shadow-sm"
                    />
                    <button onClick={handleSaveScenario} disabled={!scenarioName.trim() || isSaving} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-30">
                        <Save size={16} />
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
                    {scenarios.map((s, idx) => (
                        <div key={s.id} className="relative group shrink-0">
                            <button 
                                onClick={() => handleLoadScenario(s)}
                                className="whitespace-nowrap px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-all shadow-sm"
                            >
                                SC-{idx + 1}
                            </button>
                            <button onClick={(e) => handleDeleteScenario(s.id, e)} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <X size={6} strokeWidth={4} />
                            </button>
                        </div>
                    ))}
                    <button onClick={handleReset} className="p-2 text-slate-400 hover:text-blue-500 rounded-xl transition-all ml-auto" title="Reset Default">
                      <RotateCcw size={14} />
                    </button>
                </div>
            </div>
        </div>
      </aside>

    </div>
  );
};