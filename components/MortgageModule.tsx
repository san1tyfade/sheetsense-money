import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { X, Plus, Clock, Target, TrendingUp, Zap, Terminal } from 'lucide-react';
import { calculateAmortization, RENEWAL_YEAR_BENCHMARK } from '../services/mortgageService';
import { MortgageInput, PaymentFrequency, MortgageScenario } from '../types';
import { formatCurrency } from '../services/currencyService';
import { saveMortgageScenario, getMortgageScenarios, deleteMortgageScenario } from '../services/storage';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const year = label;
    const strategyVal = payload[1]?.value || 0;
    const standardVal = payload[0]?.value || 0;
    const savings = standardVal - strategyVal;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl border border-slate-700 min-w-[240px] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Year {year} Status</p>
          </div>
          {savings > 0 && (
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              SAVING ${formatCurrency(savings, 0, 0)}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Your Strategy Balance</span>
            <span className="text-2xl font-black text-white tracking-tight font-mono">${formatCurrency(strategyVal, 0, 0)}</span>
          </div>

          <div className="flex flex-col border-t border-slate-800 pt-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Path Balance</span>
            <span className="text-lg font-bold text-slate-400 tracking-tight font-mono">${formatCurrency(standardVal, 0, 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const MortgageModule: React.FC = () => {
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

  // Debounce inputs for expensive calculations
  const [debouncedInputs, setDebouncedInputs] = useState<MortgageInput>(inputs);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInputs(inputs);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputs]);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const list = await getMortgageScenarios();
    setScenarios(list.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) return;
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
    if (!confirm("Delete this scenario?")) return;
    await deleteMortgageScenario(id);
    await loadScenarios();
  };

  const handleLoadScenario = (scenario: MortgageScenario) => {
    setInputs(scenario.inputs);
  };

  // Schedule depends on DEBOUNCED inputs
  const schedule = useMemo(() => calculateAmortization(debouncedInputs), [debouncedInputs]);

  // Stats depend on SCHEDULE (which complies with debounced inputs) and DEBOUNCED inputs (for consistency)
  const stats = useMemo(() => {
    const finalPoint = schedule[schedule.length - 1];
    const lastAcc = schedule.find(s => s.acceleratedBalance <= 0) || finalPoint;

    const timeSavedPeriods = schedule.length - lastAcc.period - 1;
    const periodsPerYear = debouncedInputs.frequency === PaymentFrequency.MONTHLY ? 12 : 26;

    const milestonePeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;
    const mPoint = schedule[Math.min(milestonePeriod, schedule.length - 1)];

    const monthlyPre = (schedule[Math.max(1, milestonePeriod - 1)].acceleratedPayment * periodsPerYear) / 12;
    const monthlyPost = (schedule[Math.min(schedule.length - 1, milestonePeriod + 1)].acceleratedPayment * periodsPerYear) / 12;
    const shockAmount = monthlyPost - monthlyPre;

    return {
      interestSaved: finalPoint.totalInterest - lastAcc.acceleratedTotalInterest,
      yearsSaved: Math.floor(timeSavedPeriods / periodsPerYear),
      monthsSaved: Math.round((timeSavedPeriods % periodsPerYear) / (periodsPerYear / 12)),
      totalInterest: finalPoint.totalInterest,
      payoffYear: new Date().getFullYear() + lastAcc.year,
      milestone: {
        balance: mPoint.acceleratedBalance,
        equity: debouncedInputs.principal - mPoint.acceleratedBalance,
        ratio: ((debouncedInputs.principal - mPoint.acceleratedBalance) / (debouncedInputs.principal || 1)) * 100
      },
      pith: {
        total: (schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (debouncedInputs.propertyTaxes / 12) + debouncedInputs.heatingCost,
        taxPercent: ((debouncedInputs.propertyTaxes / 12) / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (debouncedInputs.propertyTaxes / 12) + debouncedInputs.heatingCost) || 1)) * 100,
        heatPercent: (debouncedInputs.heatingCost / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (debouncedInputs.propertyTaxes / 12) + debouncedInputs.heatingCost) || 1)) * 100
      },
      shock: {
        amount: shockAmount,
        percent: (shockAmount / (monthlyPre || 1)) * 100
      }
    };
  }, [schedule, debouncedInputs]);

  const chartTicks = useMemo(() => {
    const ticks = [];
    const step = 5;
    for (let i = 0; i <= debouncedInputs.termYears; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== debouncedInputs.termYears) ticks.push(debouncedInputs.termYears);
    return ticks;
  }, [debouncedInputs.termYears]);

  const handleInputChange = (key: keyof MortgageInput, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-10 animate-fade-in tabular-nums pb-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-2">
        <div className="bg-slate-950 p-6 sm:p-10 rounded-[3rem] text-white shadow-2xl col-span-1 md:col-span-2 flex flex-col justify-between overflow-hidden relative group border-2 border-slate-900">
          <div className="flex flex-col sm:flex-row justify-between items-start relative z-10 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Interest Reduction Protocol</p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter font-mono text-white">${formatCurrency(stats.interestSaved, 0, 0)}</h2>
            </div>
            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 sm:px-5 sm:py-2 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-inner shrink-0">
              {stats.yearsSaved}Y {stats.monthsSaved}M Shortened
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-900 flex items-center justify-between relative z-10">
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Terminal Payoff: <span className="text-white ml-2">{stats.payoffYear}</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
              Strategy Alpha: <span className="text-emerald-400 ml-2">-{((stats.interestSaved / (stats.totalInterest || 1)) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-blue-600/20 transition-all duration-1000"></div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col justify-between backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Monthly Carry (PITH)</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">${formatCurrency(stats.pith.total, 0, 0)}</h2>
          </div>
          <div className="space-y-4 mt-8">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full flex overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
              <div className="h-full bg-indigo-500" style={{ width: `${100 - stats.pith.taxPercent - stats.pith.heatPercent}%` }}></div>
              <div className="h-full bg-amber-400" style={{ width: `${stats.pith.taxPercent}%` }}></div>
              <div className="h-full bg-rose-500" style={{ width: `${stats.pith.heatPercent}%` }}></div>
            </div>
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>MTG</span>
              <span>TAX</span>
              <span>HEAT</span>
            </div>
          </div>
        </div>

        <div className={`p-10 rounded-[3rem] border transition-all duration-700 flex flex-col justify-between backdrop-blur-xl ${inputs.isStressTestEnabled ? 'bg-rose-500/5 border-rose-500/20 shadow-rose-500/5' : 'bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 shadow-sm'}`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${inputs.isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>
              {inputs.isStressTestEnabled ? 'Renewal Pulse' : '5-Yr Net Equity'}
            </p>
            <h2 className={`text-3xl font-black font-mono tracking-tighter ${inputs.isStressTestEnabled ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {inputs.isStressTestEnabled ? `+$${formatCurrency(stats.shock.amount, 0, 0)}` : `$${formatCurrency(stats.milestone.equity, 0, 0)}`}
            </h2>
          </div>
          <div className="mt-8 text-[10px] font-black uppercase tracking-wider text-slate-400 leading-relaxed opacity-80 italic">
            {inputs.isStressTestEnabled
              ? `Periodic pmt jump: ${stats.shock.percent.toFixed(1)}%`
              : `Net Amortized: ${stats.milestone.ratio.toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-2">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white dark:bg-slate-800/40 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-xl">
            <div className="bg-slate-50 dark:bg-slate-950/40 px-8 py-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setInputs({ ...inputs, extraMonthly: 0, extraAnnualPercent: 0, isStressTestEnabled: false })}
                className="whitespace-nowrap px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all shadow-sm"
              >
                Zero All
              </button>
              {scenarios.map((s, idx) => (
                <div key={s.id} className="relative group shrink-0">
                  <button
                    onClick={() => handleLoadScenario(s)}
                    className="whitespace-nowrap px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all shadow-sm"
                  >
                    SCN {idx + 1}
                  </button>
                  <button onClick={(e) => handleDeleteScenario(s.id, e)} className="absolute -top-1.5 -right-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <X size={10} className="text-rose-500" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                <input
                  type="text"
                  placeholder="ID..."
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-12 bg-transparent text-[10px] font-black uppercase outline-none border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
                <button onClick={handleSaveScenario} disabled={!scenarioName.trim()} className="p-1.5 bg-blue-600 text-white rounded-lg hover:opacity-80 transition-all disabled:opacity-20 active:scale-90">
                  <Plus size={14} strokeWidth={4} />
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Indebtedness</h4>
                  <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">${formatCurrency(inputs.principal)}</span>
                </div>
                <input type="range" min="100000" max="2000000" step="10000" value={inputs.principal} onChange={(e) => handleInputChange('principal', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Node Rate %</label>
                    <input type="number" step="0.01" value={inputs.interestRate} onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-black font-mono outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Term Span (Y)</label>
                    <input type="number" value={inputs.termYears} onChange={(e) => handleInputChange('termYears', parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-black font-mono outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Interaction Frequency</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {['MONTHLY', 'BI_WEEKLY', 'ACC_BI_WEEKLY'].map((f) => (
                      <button
                        key={f}
                        onClick={() => handleInputChange('frequency', f)}
                        className={`px-2 py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all ${inputs.frequency === f ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {f.split('_').join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-8 rounded-[2rem] border-2 transition-all duration-500 ${inputs.isStressTestEnabled ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between mb-6">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${inputs.isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>Enable Rate Shock</label>
                  <button onClick={() => handleInputChange('isStressTestEnabled', !inputs.isStressTestEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${inputs.isStressTestEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${inputs.isStressTestEnabled ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
                {inputs.isStressTestEnabled && (
                  <div className="space-y-4 animate-in zoom-in-95">
                    <div className="flex justify-between text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                      <span>Shock Value</span>
                      <span className="font-mono">{inputs.renewalRate}%</span>
                    </div>
                    <input type="range" min="0" max="15" step="0.1" value={inputs.renewalRate} onChange={(e) => handleInputChange('renewalRate', parseFloat(e.target.value))} className="w-full h-1.5 bg-rose-200 dark:bg-rose-900 rounded-lg appearance-none cursor-pointer accent-rose-600" />
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Velocity Strategy</h4>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Supplementary Inflow</span>
                      <span className="text-emerald-500 font-black">+${formatCurrency(inputs.extraMonthly)}/MO</span>
                    </div>
                    <input type="range" min="0" max="5000" step="50" value={inputs.extraMonthly} onChange={(e) => handleInputChange('extraMonthly', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Annual Dynamic Scaling</span>
                      <span className="text-emerald-500 font-black">+{inputs.extraAnnualPercent}%</span>
                    </div>
                    <input type="range" min="0" max="20" step="1" value={inputs.extraAnnualPercent} onChange={(e) => handleInputChange('extraAnnualPercent', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Carrying Costs</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prop. Tax (YR)</label>
                    <input type="number" step="100" value={inputs.propertyTaxes} onChange={(e) => handleInputChange('propertyTaxes', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-black font-mono outline-none text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heating (MO)</label>
                    <input type="number" step="10" value={inputs.heatingCost} onChange={(e) => handleInputChange('heatingCost', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-black font-mono outline-none text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white dark:bg-slate-800/40 p-12 rounded-[3.5rem] shadow-sm border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 max-w-[240px] hidden xl:block z-20">
              <p className="text-[11px] font-black text-slate-400 italic leading-relaxed text-right uppercase tracking-wider">
                Deployment of <span className="text-emerald-500 font-black">${formatCurrency(inputs.extraMonthly)}</span> monthly surplus effectively optimizes terminal payoff by <span className="text-blue-500 font-black">{stats.yearsSaved} Years</span>.
              </p>
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-3">Amortization Gradient</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-12">Delta analysis of accelerated vs nominal strategy</p>

              <div className="h-[480px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={schedule}>
                    <defs>
                      <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                    <XAxis
                      dataKey="year"
                      ticks={chartTicks}
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: '900' }}
                      axisLine={false} tickLine={false}
                      label={{ value: 'AMORTIZATION YEAR', position: 'bottom', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: '0.2em' }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: '900' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="balance" stroke="#94a3b8" fill="url(#colorStd)" strokeWidth={2} strokeDasharray="8 6" />
                    <Area type="monotone" dataKey="acceleratedBalance" stroke="#4f46e5" fill="url(#colorAcc)" strokeWidth={5} />
                    {inputs.isStressTestEnabled && (
                      <ReferenceLine x={RENEWAL_YEAR_BENCHMARK} stroke="#f43f5e" strokeDasharray="10 5" strokeWidth={2} label={{ value: 'RENEWAL PULSE', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10, fontWeight: '900', letterSpacing: '0.1em' }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-12 flex gap-12 border-t border-slate-100 dark:border-slate-700/50 pt-10">
                <div className="flex items-center gap-4 group/legend">
                  <div className="w-6 h-1 bg-slate-300 dark:bg-slate-600 border-t-2 border-dashed border-slate-400 group-hover:scale-x-110 transition-transform"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nominal Protocol</span>
                </div>
                <div className="flex items-center gap-4 group/legend">
                  <div className="w-8 h-2 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20 group-hover:scale-x-110 transition-transform"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Dynamic Strategy</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-10 rounded-[3.5rem] flex items-center gap-10 shadow-sm backdrop-blur-xl group">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform duration-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div className="space-y-2">
              <p className="text-emerald-800 dark:text-emerald-400 font-black text-2xl tracking-tight leading-snug">
                Liquidity Optimization Nominal.
              </p>
              <p className="text-emerald-700/70 dark:text-emerald-500/70 font-bold text-sm leading-relaxed uppercase tracking-wider">
                Execution of this strategy secures <span className="text-emerald-600 dark:text-emerald-300 font-black">${formatCurrency(stats.interestSaved, 0, 0)}</span> in realized savings with terminal debt-freedom achieved by <span className="underline decoration-emerald-500/30 underline-offset-4">{stats.payoffYear}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};