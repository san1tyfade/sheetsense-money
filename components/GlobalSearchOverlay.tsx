import { Search, X, Wallet, TrendingUp, History, Banknote, Receipt, Landmark, ArrowRight, Zap, Terminal, Command, Plus, HelpCircle, Sparkles } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinancialStore } from '../context/FinancialContext';
import { ViewState } from '../types';
import { formatBaseCurrency } from '../services/currencyService';
import { haptics } from '../services/infrastructure/HapticService';

export const GlobalSearchOverlay: React.FC = () => {
  const { 
    isSearchOpen, setIsSearchOpen, assets, reconciledInvestments, 
    trades, timeline, subscriptions, accounts, setView, setGlobalModal 
  } = useFinancialStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMAND_SYNTAX = [
    { prefix: '+t', label: 'Trade Ledger', example: '+t AAPL 10 220', desc: '[TICKER] [QTY] [PRICE]', icon: History, color: 'text-blue-500' },
    { prefix: '+a', label: 'Asset Inventory', labelFull: 'Register Asset', example: '+a Tesla 45000', desc: '[NAME] [VALUATION]', icon: Wallet, color: 'text-emerald-500' },
    { prefix: '+s', label: 'Commitment Registry', labelFull: 'Add Subscription', example: '+s Netflix 22', desc: '[SERVICE] [MONTHLY_COST]', icon: Receipt, color: 'text-indigo-500' },
    { prefix: '+i', label: 'Institutional Link', labelFull: 'Register Bank', example: '+i Amex Cobalt', desc: '[BANK] [LABEL]', icon: Landmark, color: 'text-amber-500' }
  ];

  // NLP Command Parser Logic
  const commandResult = useMemo(() => {
    if (!query.startsWith('+')) return null;
    const parts = query.substring(1).trim().split(/\s+/);
    if (parts.length === 0) return null;

    const cmd = parts[0].toLowerCase();
    
    // Trade Command: +t [ticker] [qty] [price]
    if (cmd === 't' || cmd === 'trade') {
      const ticker = parts[1]?.toUpperCase() || '...';
      const qty = parseFloat(parts[2]) || 0;
      const price = parseFloat(parts[3]) || 0;
      return {
        type: 'TRADE',
        label: `Add Trade: ${ticker}`,
        details: `${qty} units @ $${price}`,
        data: { ticker, quantity: qty, price, type: 'BUY', date: new Date().toISOString().split('T')[0] }
      };
    }

    // Asset Command: +a [name] [value]
    if (cmd === 'a' || cmd === 'asset') {
      const name = parts.slice(1, -1).join(' ') || (parts[1] && isNaN(parseFloat(parts[1])) ? parts[1] : 'New Asset');
      const valPart = parts[parts.length - 1];
      const value = parseFloat(valPart) || 0;
      return {
        type: 'ASSET',
        label: `Register Asset: ${name}`,
        details: `Initial Valuation: ${formatBaseCurrency(value)}`,
        data: { name, value, type: 'Cash', currency: 'CAD' }
      };
    }

    // Subscription Command: +s [name] [cost]
    if (cmd === 's' || cmd === 'sub') {
        const name = parts.slice(1, -1).join(' ') || (parts[1] && isNaN(parseFloat(parts[1])) ? parts[1] : 'New Commitment');
        const cost = parseFloat(parts[parts.length - 1]) || 0;
        return {
            type: 'SUBSCRIPTION',
            label: `Add Commitment: ${name}`,
            details: `Monthly Drain: ${formatBaseCurrency(cost)}`,
            data: { name, cost, period: 'Monthly', category: 'General', active: true }
        };
    }

    // Institution Command: +i [bank] [label]
    if (cmd === 'i' || cmd === 'inst') {
        const institution = parts[1] || 'New Bank';
        const name = parts.slice(2).join(' ') || 'Primary';
        return {
            type: 'ACCOUNT',
            label: `Register Institution: ${institution}`,
            details: `Label: ${name}`,
            data: { institution, name, type: 'Checking', paymentType: 'Card', transactionType: 'Debit', currency: 'CAD', accountNumber: '****' }
        };
    }

    return null;
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        haptics.click('soft');
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  const results = useMemo(() => {
    if (!query.trim() || query.startsWith('+') || query.length < 2) return null;
    const term = query.toLowerCase();

    const matchedAssets = assets.filter(a => a.name.toLowerCase().includes(term) || a.type.toLowerCase().includes(term)).slice(0, 5);
    const matchedInvestments = reconciledInvestments.filter(i => i.ticker.toLowerCase().includes(term) || i.name.toLowerCase().includes(term)).slice(0, 5);
    const matchedTrades = trades.filter(t => t.ticker.toLowerCase().includes(term)).slice(0, 5);
    const matchedTimeline = timeline.filter(t => t.description.toLowerCase().includes(term) || t.category.toLowerCase().includes(term)).slice(0, 10);
    const matchedSubs = subscriptions.filter(s => s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term)).slice(0, 5);
    const matchedBanks = accounts.filter(a => a.institution.toLowerCase().includes(term) || a.name.toLowerCase().includes(term)).slice(0, 5);

    return {
      assets: matchedAssets,
      investments: matchedInvestments,
      trades: matchedTrades,
      timeline: matchedTimeline,
      subscriptions: matchedSubs,
      accounts: matchedBanks
    };
  }, [query, assets, reconciledInvestments, trades, timeline, subscriptions, accounts]);

  const hasAnyResults = results && Object.values(results).some((arr: any) => Array.isArray(arr) && arr.length > 0);

  if (!isSearchOpen) return null;

  const navigateToResult = (view: ViewState) => {
    haptics.click('light');
    setView(view);
    setIsSearchOpen(false);
  };

  const handleExecuteCommand = () => {
    if (!commandResult) return;
    haptics.click('light');
    setGlobalModal({ type: commandResult.type as any, initialData: commandResult.data });
    setIsSearchOpen(false);
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && commandResult) {
      handleExecuteCommand();
    }
  };

  const applyPrefix = (prefix: string) => {
    haptics.click('soft');
    setQuery(prefix + ' ');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-10 md:p-20 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-top-10 duration-500">
        
        {/* Search Input Layer */}
        <div className="relative border-b border-slate-100 dark:border-slate-800 p-6 md:p-10 flex items-center">
          {query.startsWith('+') ? (
            <Plus size={24} className="text-emerald-500 absolute left-8 md:left-12 animate-pulse" strokeWidth={3} />
          ) : (
            <Search size={24} className="text-blue-500 absolute left-8 md:left-12" strokeWidth={3} />
          )}
          <input 
            ref={inputRef}
            type="text" 
            placeholder="DISCOVER NODES OR TYPE + FOR COMMANDS..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInInput}
            className="w-full bg-transparent pl-12 md:pl-20 pr-12 text-lg md:text-2xl font-black tracking-tight outline-none text-slate-900 dark:text-white uppercase placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors absolute right-8 md:right-12"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Results & Hint Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 custom-scrollbar">
          {commandResult ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
               <div className="flex items-center gap-4 px-2">
                 <Command size={16} className="text-slate-400" />
                 <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Command Recognition</h5>
               </div>
               <button 
                onClick={handleExecuteCommand}
                className="w-full flex items-center justify-between p-8 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-[2.5rem] hover:bg-emerald-500/20 transition-all group"
               >
                 <div className="flex items-center gap-8">
                    <div className="p-5 bg-emerald-500 text-white rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
                      <Plus size={28} strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{commandResult.label}</h4>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-2">{commandResult.details}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">EXECUTE</span>
                   <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black shadow-sm">ENTER</div>
                 </div>
               </button>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                  <div className="p-6 bg-slate-50 dark:bg-slate-850 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={10} fill="currentColor" /> Neural Optimization
                    </p>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                        Structure recognized via local buffer. Proceed to provision the target node immediately.
                    </p>
                  </div>
               </div>
            </div>
          ) : !query.trim() || (query === '+') ? (
            <div className="space-y-12 animate-in fade-in duration-500">
                <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <Terminal size={16} className="text-blue-500" />
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Available Protocols</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {COMMAND_SYNTAX.map((cmd) => (
                            <button 
                                key={cmd.prefix}
                                onClick={() => applyPrefix(cmd.prefix)}
                                className="flex items-start gap-5 p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all group/card text-left"
                            >
                                <div className={`p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm ${cmd.color} group-hover/card:scale-110 transition-transform`}>
                                    <cmd.icon size={20} />
                                </div>
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h6 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{cmd.label}</h6>
                                        <code className="text-[9px] font-mono font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{cmd.prefix}</code>
                                    </div>
                                    <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-tighter truncate">{cmd.desc}</p>
                                    <div className="pt-2 flex items-center gap-2">
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Example:</span>
                                        <code className="text-[9px] text-slate-500 font-bold">{cmd.example}</code>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-10 text-center opacity-30 border-t border-slate-100 dark:border-slate-800">
                    <Sparkles size={32} className="mb-4 text-blue-500" />
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500 leading-loose">
                        Neural Hub Operational<br/>
                        Awaiting Sequence Input...
                    </p>
                </div>
            </div>
          ) : !hasAnyResults ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-8 bg-rose-500/10 rounded-full text-rose-500 mb-8 border border-rose-500/20">
                    <Zap size={40} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Zero Node Matches</h4>
                <p className="text-sm text-slate-500 font-bold mt-4 uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">The discovery matrix returned null for this logical string across all active data partitions.</p>
                <button onClick={() => setQuery('')} className="mt-10 text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] hover:underline underline-offset-8 decoration-2">Reset Buffer</button>
            </div>
          ) : (
            <>
              {results.assets.length > 0 && (
                <ResultGroup title="Inventory Matrix" icon={Wallet}>
                  {results.assets.map(a => (
                    <ResultItem 
                      key={a.id} 
                      title={a.name} 
                      subtitle={a.type} 
                      value={formatBaseCurrency(a.value)}
                      onClick={() => navigateToResult(ViewState.ASSETS)} 
                    />
                  ))}
                </ResultGroup>
              )}

              {results.investments.length > 0 && (
                <ResultGroup title="Portfolio Core" icon={TrendingUp}>
                  {results.investments.map(i => (
                    <ResultItem 
                      key={i.id} 
                      title={i.ticker} 
                      subtitle={i.name} 
                      value={formatBaseCurrency(i.quantity * i.currentPrice)}
                      onClick={() => navigateToResult(ViewState.INVESTMENTS)} 
                    />
                  ))}
                </ResultGroup>
              )}

              {results.trades.length > 0 && (
                <ResultGroup title="Event Ledger" icon={History}>
                  {results.trades.map(t => (
                    <ResultItem 
                      key={t.id} 
                      title={`${t.type} ${t.ticker}`} 
                      subtitle={t.date} 
                      value={formatBaseCurrency(t.total)}
                      onClick={() => navigateToResult(ViewState.TRADES)} 
                    />
                  ))}
                </ResultGroup>
              )}

              {results.timeline.length > 0 && (
                <ResultGroup title="Cash Flow Stream" icon={Banknote}>
                  {results.timeline.map(t => (
                    <ResultItem 
                      key={t.id} 
                      title={t.description} 
                      subtitle={`${t.category} • ${t.date}`} 
                      value={formatBaseCurrency(t.amount)}
                      variant={t.type === 'INCOME' ? 'success' : 'danger'}
                      onClick={() => navigateToResult(ViewState.INCOME)} 
                    />
                  ))}
                </ResultGroup>
              )}

              {results.subscriptions.length > 0 && (
                <ResultGroup title="Registry Commitments" icon={Receipt}>
                  {results.subscriptions.map(s => (
                    <ResultItem 
                      key={s.id} 
                      title={s.name} 
                      subtitle={s.category} 
                      value={`${formatBaseCurrency(s.cost)} / ${s.period}`}
                      onClick={() => navigateToResult(ViewState.INFORMATION)} 
                    />
                  ))}
                </ResultGroup>
              )}

              {results.accounts.length > 0 && (
                <ResultGroup title="Institutional Nodes" icon={Landmark}>
                  {results.accounts.map(a => (
                    <ResultItem 
                      key={a.id} 
                      title={a.institution} 
                      subtitle={a.name} 
                      value={a.accountNumber ? `•••• ${a.accountNumber}` : ''}
                      onClick={() => navigateToResult(ViewState.INFORMATION)} 
                    />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>

        {/* Footer Hints */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center px-10">
            <div className="flex gap-8">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">ESC</span>
                    Cancel
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">ENTER</span>
                    Select
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                    <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">/</span>
                    Hotlink
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Local-First Buffer Active</span>
            </div>
        </div>
      </div>
    </div>
  );
};

const ResultGroup: React.FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4 px-2">
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 shadow-inner">
        <Icon size={16} />
      </div>
      <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em]">{title}</h5>
    </div>
    <div className="grid gap-3">
      {children}
    </div>
  </div>
);

const ResultItem: React.FC<{ title: string; subtitle: string; value?: string; onClick: () => void; variant?: 'success' | 'danger' | 'default' }> = ({ 
  title, subtitle, value, onClick, variant = 'default' 
}) => {
  const valueColor = variant === 'success' ? 'text-emerald-500' : variant === 'danger' ? 'text-rose-500' : 'text-slate-900 dark:text-white';

  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-[1.75rem] hover:border-blue-500/50 hover:bg-blue-500/[0.03] transition-all group/item text-left shadow-sm"
    >
      <div className="flex-1 min-w-0 pr-8">
        <h6 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover/item:text-blue-500 transition-colors">{title}</h6>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-6">
        {value && <span className={`text-base font-black font-mono tracking-tighter ghost-blur ${valueColor}`}>{value}</span>}
        <ArrowRight size={18} className="text-slate-300 group-hover/item:translate-x-1 group-hover/item:text-blue-500 transition-all" />
      </div>
    </button>
  );
};