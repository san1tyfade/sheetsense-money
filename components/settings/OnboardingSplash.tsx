import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { FileSpreadsheet, Loader2, Info, ExternalLink, Sparkles, Download, Search, CheckCircle2, ShieldCheck, Terminal, ArrowRight, AlertTriangle } from 'lucide-react';
import { setupTemplateDataSource, signIn, fetchUserProfile } from '../../services/authService';
import { openPicker } from '../../services/pickerService';
import { useFinancialStore } from '../../context/FinancialContext';

const MASTER_TEMPLATE_ID = '12YnkmOuHSeiy5hcmbxc6ZT8e8D6ruo1SEZdk'; 

interface OnboardingSplashProps {
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  onSignIn: () => void;
  onTourStart: () => void;
  refreshArchives: () => void;
}

export const OnboardingSplash: React.FC<OnboardingSplashProps> = ({ 
  userProfile, isAuthLoading, onSignIn, onTourStart, refreshArchives 
}) => {
  const { setSheetConfig, setSheetUrl, sheetConfig, sync, setAuthSession, setUserProfile } = useFinancialStore();
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'cloning' | 'syncing' | 'complete' | 'error' | 'manual'>('idle');
  const [showPopupHint, setShowPopupHint] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isAuthLoading) {
      timer = setTimeout(() => setShowPopupHint(true), 3000);
    } else {
      setShowPopupHint(false);
    }
    return () => clearTimeout(timer);
  }, [isAuthLoading]);

  const handleInitialize = async () => {
      if (!userProfile) return;
      setOnboardingStatus('cloning');
      try {
          const result = await setupTemplateDataSource(MASTER_TEMPLATE_ID, 'Sheetsense Finance');
          setOnboardingStatus('syncing');
          setSheetConfig({ ...sheetConfig, sheetId: result.id });
          setSheetUrl(result.url);
          await sync();
          setOnboardingStatus('complete');
          onTourStart();
          refreshArchives();
      } catch (e: any) {
          if (e.message === 'PRIVACY_RESTRICTION') setOnboardingStatus('manual');
          else setOnboardingStatus('error');
      }
  };

  const handleOpenPicker = async () => {
      try {
          const session = await signIn();
          setAuthSession(session);
          
          if (!userProfile) {
              const profile = await fetchUserProfile(session.token);
              if (profile) setUserProfile(profile);
          }

          const result = await openPicker(sheetConfig.clientId);
          if (result) { 
            setSheetConfig({ ...sheetConfig, sheetId: result.id }); 
            setSheetUrl(result.url); 
          }
      } catch (e) { 
        alert("Spreadsheet selection cancelled."); 
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-1 bg-white dark:bg-slate-900/40 rounded-[4rem] shadow-2xl relative overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800/60 backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 opacity-80"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] -ml-48 -mb-48"></div>

      <div className="relative z-10 p-12 md:p-20 flex flex-col items-center text-center">
          <div className="mb-12 relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
              <div className="w-24 h-24 md:w-28 md:h-28 bg-slate-950 dark:bg-slate-950 rounded-[2.5rem] border border-blue-500/30 shadow-2xl flex items-center justify-center text-blue-500 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                  <FileSpreadsheet size={48} strokeWidth={2.5} className="relative z-10" />
              </div>
          </div>

          <div className="space-y-6 max-w-xl mx-auto mb-16">
              <div className="space-y-2">
                <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-blue-500 mb-2">Institutional Ledger Core</p>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.85]">
                  Welcome to <br/>
                  <span className="text-blue-600 dark:text-blue-400">Sheetsense</span>
                </h2>
              </div>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-4">
                Redefining personal financial orchestration. To maintain absolute sovereignty, we only request access to files you explicitly provide.
              </p>
          </div>
          
          {!userProfile ? (
              <div className="w-full max-w-md space-y-6">
                  <button 
                    onClick={onSignIn} 
                    disabled={isAuthLoading} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 px-12 rounded-[2rem] shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-5 transition-all hover:-translate-y-1 active:scale-95 text-lg group"
                  >
                      {isAuthLoading ? <Loader2 className="animate-spin" size={24} /> : (
                        <div className="bg-white rounded-xl p-1.5 shadow-inner">
                          <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                        </div>
                      )}
                      <span className="uppercase tracking-widest text-sm">Authenticate Session</span>
                      {!isAuthLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                  </button>

                  {showPopupHint && (
                      <div className="p-5 bg-amber-500/10 border-2 border-amber-500/20 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                              <AlertTriangle size={18} />
                          </div>
                          <div className="text-left">
                              <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-widest">Popup Guard Active</p>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white">Check your browser's address bar to allow the authentication window.</h4>
                          </div>
                      </div>
                  )}

                  <div className="mt-8 flex items-center justify-center gap-3 opacity-40">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Zero-Knowledge Protocol Active</span>
                  </div>
              </div>
          ) : onboardingStatus === 'manual' ? (
              <div className="bg-blue-50/50 dark:bg-blue-900/20 p-10 rounded-[3rem] border-2 border-blue-500/30 text-left space-y-10 animate-in slide-in-from-bottom-4 duration-500 shadow-2xl max-w-2xl backdrop-blur-md">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-600/20"><Info size={28} /></div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Access Guard</h4>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-2">Security Restriction Detected</p>
                      </div>
                  </div>
                  <div className="grid gap-6">
                      <div className="flex items-start gap-6 p-6 bg-white dark:bg-slate-800/60 rounded-[2rem] border border-blue-200 dark:border-blue-700/50 shadow-sm">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-base font-black shadow-lg">1</div>
                          <div className="space-y-2 flex-1">
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Provision Infrastructure</p>
                              <p className="text-[11px] text-slate-500 font-bold">Copy the master template to your private Google Drive environment.</p>
                              <a href={`https://docs.google.com/spreadsheets/d/${MASTER_TEMPLATE_ID}/edit`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-black hover:underline underline-offset-4 decoration-2">
                                Launch Master Template <ExternalLink size={12} />
                              </a>
                          </div>
                      </div>
                      <div className="flex items-start gap-6 p-6 bg-white dark:bg-slate-800/60 rounded-[2rem] border border-blue-200 dark:border-blue-700/50 shadow-sm">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-base font-black shadow-lg">2</div>
                          <div className="space-y-3 flex-1">
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Establish Linkage</p>
                              <p className="text-[11px] text-slate-500 font-bold">Authorize Sheetsense to interface with your newly created spreadsheet node.</p>
                              <button onClick={handleOpenPicker} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95">Select Dynamic Node</button>
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-center pt-4">
                    <button onClick={() => setOnboardingStatus('idle')} className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] hover:text-blue-500 transition-colors flex items-center gap-2">
                        <Terminal size={12} /> Reset Initialization Path
                    </button>
                  </div>
              </div>
          ) : (
              <div className="grid md:grid-cols-2 gap-10 pt-6 w-full max-w-4xl">
                  <div className="p-10 bg-slate-50 dark:bg-slate-900/60 rounded-[3rem] border border-slate-200 dark:border-slate-700/50 space-y-8 text-left group hover:border-blue-500/40 transition-all hover:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
                      <div className="flex items-center gap-5 relative z-10">
                          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl shadow-inner"><Sparkles size={24} /></div>
                          <h4 className="font-black text-xl text-slate-900 dark:text-white tracking-tight uppercase">Automated Path</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed relative z-10">Provision a fresh financial instance using the verified Sheetsense Pro template. Recommended for new users.</p>
                      <button 
                        onClick={handleInitialize} 
                        disabled={onboardingStatus === 'cloning' || onboardingStatus === 'syncing'} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl flex justify-center items-center gap-3 transition-all active:scale-95 relative z-10 uppercase text-[10px] tracking-[0.2em]"
                      >
                          {onboardingStatus === 'cloning' ? <Loader2 className="animate-spin" size={18} /> : onboardingStatus === 'syncing' ? <CheckCircle2 size={18} /> : <Download size={18} strokeWidth={3} />}
                          {onboardingStatus === 'cloning' ? 'Cloning Node...' : onboardingStatus === 'syncing' ? 'Ingesting Flow...' : 'Initialize Logic'}
                      </button>
                  </div>

                  <div className="p-10 bg-slate-50 dark:bg-slate-900/60 rounded-[3rem] border border-slate-200 dark:border-slate-700/50 space-y-8 text-left group hover:border-emerald-500/40 transition-all hover:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
                      <div className="flex items-center gap-5 relative z-10">
                          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shadow-inner"><Search size={24} /></div>
                          <h4 className="font-black text-xl text-slate-900 dark:text-white tracking-tight uppercase">Manual Link</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed relative z-10">Map an existing spreadsheet from your cloud storage. Requires compliant tab architecture.</p>
                      <button 
                        onClick={handleOpenPicker} 
                        className="w-full bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 relative z-10 uppercase text-[10px] tracking-[0.2em]"
                      >
                        Select Source Node
                      </button>
                  </div>
              </div>
          )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/40 p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-4 text-slate-400">
              <ShieldCheck size={18} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">End-to-End Encryption • Local-First Persistence</p>
          </div>
          <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Protocol Nominal</span>
          </div>
      </div>
    </div>
  );
};