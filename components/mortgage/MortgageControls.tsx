import React, { useState } from 'react';
import { Shield, Zap, Building, ChevronDown, Save, X, RotateCcw } from 'lucide-react';
import { MortgageInput, MortgageScenario } from '../../types';

type SectionKey = 'CORE' | 'STRATEGY' | 'LOGISTICS';

interface MortgageControlsProps {
    inputs: MortgageInput;
    actions: {
        handleInputChange: (key: keyof MortgageInput, value: any) => void;
        handleReset: () => void;
        handleSaveScenario: () => void;
        handleDeleteScenario: (id: string, e: React.MouseEvent) => void;
        handleLoadScenario: (scenario: MortgageScenario) => void;
        setScenarioName: (name: string) => void;
    };
    data: {
        scenarios: MortgageScenario[];
        scenarioName: string;
        isSaving: boolean;
    };
}

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

export const MortgageControls: React.FC<MortgageControlsProps> = ({ inputs, actions, data }) => {
    const [expandedSection, setExpandedSection] = useState<SectionKey | null>('CORE');

    const toggleSection = (section: SectionKey) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-fit sticky top-8">

            {/* Core Loan Parameters */}
            <div className="border-b border-slate-100 dark:border-slate-800">
                <AccordionHeader
                    section="CORE"
                    icon={Shield}
                    label="Core Debt Profile"
                    summary={`$${(inputs.principal / 1000).toFixed(0)}k @ ${inputs.interestRate}%`}
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
                                    onChange={e => actions.handleInputChange('principal', parseFloat(e.target.value))}
                                    className="bg-transparent w-full font-black font-mono text-lg outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            <input type="range" min="50000" max="2500000" step="10000" value={inputs.principal} onChange={(e) => actions.handleInputChange('principal', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Rate %</label>
                                <input type="number" step="0.01" value={inputs.interestRate} onChange={e => actions.handleInputChange('interestRate', parseFloat(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-mono font-black text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Term (Y)</label>
                                <input type="number" value={inputs.termYears} onChange={e => actions.handleInputChange('termYears', parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-mono font-black text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Protocol</label>
                            <div className="grid grid-cols-1 gap-1.5">
                                {['MONTHLY', 'BI_WEEKLY', 'ACC_BI_WEEKLY'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => actions.handleInputChange('frequency', f)}
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
                            <input type="range" min="0" max="5000" step="50" value={inputs.extraMonthly} onChange={(e) => actions.handleInputChange('extraMonthly', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Annual Escalation</label>
                                <span className="text-emerald-500 font-mono font-black text-[10px]">+{inputs.extraAnnualPercent}%</span>
                            </div>
                            <input type="range" min="0" max="20" step="1" value={inputs.extraAnnualPercent} onChange={(e) => actions.handleInputChange('extraAnnualPercent', parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-5">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${inputs.isStressTestEnabled ? 'text-rose-500' : 'text-slate-400'}`}>Renewal Stress Test</label>
                                <button onClick={() => actions.handleInputChange('isStressTestEnabled', !inputs.isStressTestEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${inputs.isStressTestEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${inputs.isStressTestEnabled ? 'left-5.5' : 'left-0.5'}`} style={{ left: inputs.isStressTestEnabled ? '22px' : '2px' }}></div>
                                </button>
                            </div>
                            {inputs.isStressTestEnabled && (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="flex justify-between text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        <span>Shock Projection</span>
                                        <span className="font-mono">{inputs.renewalRate}%</span>
                                    </div>
                                    <input type="range" min="0" max="15" step="0.1" value={inputs.renewalRate} onChange={(e) => actions.handleInputChange('renewalRate', parseFloat(e.target.value))} className="w-full h-1 bg-rose-200 dark:bg-rose-900 rounded-lg appearance-none cursor-pointer accent-rose-600" />
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
                                    onChange={e => actions.handleInputChange('propertyTaxes', parseFloat(e.target.value) || 0)}
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
                                    onChange={e => actions.handleInputChange('heatingCost', parseFloat(e.target.value) || 0)}
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
                        value={data.scenarioName}
                        onChange={(e) => actions.setScenarioName(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500 text-slate-900 dark:text-white shadow-sm"
                    />
                    <button onClick={actions.handleSaveScenario} disabled={!data.scenarioName.trim() || data.isSaving} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-30">
                        <Save size={16} />
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
                    {data.scenarios.map((s, idx) => (
                        <div key={s.id} className="relative group shrink-0">
                            <button
                                onClick={() => actions.handleLoadScenario(s)}
                                className="whitespace-nowrap px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-all shadow-sm"
                            >
                                SC-{idx + 1}
                            </button>
                            <button onClick={(e) => actions.handleDeleteScenario(s.id, e)} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <X size={6} strokeWidth={4} />
                            </button>
                        </div>
                    ))}
                    <button onClick={actions.handleReset} className="p-2 text-slate-400 hover:text-blue-500 rounded-xl transition-all ml-auto" title="Reset Default">
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
