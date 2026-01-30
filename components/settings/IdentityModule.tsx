
import React, { useState } from 'react';
import { UserProfile, ViewState } from '../../types';
import { Lock, LogOut, Search, ExternalLink, UserCheck, Link, Check, AlertCircle, Loader2, ShieldCheck, Shield } from 'lucide-react';
import { openPicker } from '../../services/pickerService';
import { useFinancialStore } from '../../context/FinancialContext';
import { extractSheetId } from '../../services/sheetService';
import { getAccessToken, performFullSignIn } from '../../services/authService';

interface IdentityModuleProps {
  userProfile: UserProfile | null;
  sheetUrl: string;
  sheetId: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const IdentityModule: React.FC<IdentityModuleProps> = ({ 
  userProfile, sheetUrl, sheetId, onSignIn, onSignOut 
}) => {
  const { setSheetUrl, setSheetConfig, sheetConfig, setAuthSession, setUserProfile, setView } = useFinancialStore();
  const [isManual, setIsManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState(false);
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);

  const handleOpenPicker = async () => {
    setIsOpeningPicker(true);
    try {
      let token = getAccessToken();
      if (!token) {
        try {
          const { session, profile } = await performFullSignIn(sheetConfig.clientId);
          setAuthSession(session);
          setUserProfile(profile);
          token = session.token;
        } catch (authErr) {
          throw new Error("Identity verification failed.");
        }
      }
      const result = await openPicker(sheetConfig.clientId);
      if (result) {
        setSheetConfig({ ...sheetConfig, sheetId: result.id });
        setSheetUrl(result.url);
        setIsManual(false);
      }
    } catch (e: any) {
      if (e.message?.includes('AUTH') || e.message?.includes('PICKER')) {
        setIsManual(true);
        alert(`Cloud Selector: ${e.message}. Fallback to Manual ID.`);
      }
    } finally {
      setIsOpeningPicker(false);
    }
  };

  const handleManualSubmit = () => {
    const id = extractSheetId(manualInput);
    if (id) {
      setSheetConfig({ ...sheetConfig, sheetId: id });
      setSheetUrl(manualInput.includes('http') ? manualInput : `https://docs.google.com/spreadsheets/d/${id}/edit`);
      setIsManual(false);
      setManualInput('');
      setManualError(false);
    } else {
      setManualError(true);
      setTimeout(() => setManualError(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[3rem] shadow-2xl p-8 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden backdrop-blur-md group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-500/10 transition-all duration-1000"></div>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start relative z-10 gap-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 text-center sm:text-left">
                  {userProfile ? (
                      <>
                          <div className="relative group/avatar">
                              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-[2.5rem] blur opacity-25 group-hover/avatar:opacity-50 transition-opacity"></div>
                              <img src={userProfile?.picture || ''} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] border-4 border-white dark:border-slate-800 shadow-2xl relative z-10 transition-transform group-hover/avatar:scale-105" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-slate-800 rounded-full z-20"></div>
                          </div>
                          <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                  <span className="text-[8px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-widest">Active Identity</span>
                                  <span className="text-[8px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full tracking-widest flex items-center gap-1"><ShieldCheck size={8}/> Verified</span>
                              </div>
                              <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{userProfile?.name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center sm:justify-start gap-2 opacity-80 max-w-full truncate"><Lock size={12} className="text-blue-500 shrink-0" /> {userProfile?.email}</p>
                          </div>
                      </>
                  ) : (
                      <button onClick={onSignIn} className="flex items-center gap-6 bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-inner">
                          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><UserCheck size={32} /></div>
                          <div className="text-left">
                              <span className="block text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Security Clearance</span>
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sign In to Authenticate Protocol</span>
                          </div>
                      </button>
                  )}
              </div>
              {userProfile && (
                  <div className="flex gap-3 w-full sm:w-auto justify-center sm:justify-end">
                      <button 
                          onClick={() => setIsManual(!isManual)} 
                          className={`flex-1 sm:flex-none p-4 rounded-2xl transition-all flex items-center justify-center ${isManual ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500'}`}
                          title="Toggle Manual ID"
                      >
                          <Link size={20} />
                      </button>
                      <button onClick={onSignOut} className="flex-1 sm:flex-none p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-90 flex items-center justify-center" title="Sign Out">
                          <LogOut size={20} />
                      </button>
                  </div>
              )}
          </div>

          <div className="pt-8 md:pt-10 border-t border-slate-100 dark:border-slate-700/50 space-y-5 relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <span className="flex items-center gap-2"><ExternalLink size={12} className="text-blue-500"/> Infrastructure Gateway</span>
                {!isManual && sheetUrl && (
                  <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-black hover:underline underline-offset-4 decoration-2">Open Cloud Spreadsheet</a>
                )}
              </div>

              {isManual ? (
                  <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-left-2 duration-300">
                      <div className="flex-1 relative">
                          <input 
                              type="text" 
                              value={manualInput}
                              onChange={(e) => setManualInput(e.target.value)}
                              placeholder="Enter Infrastructure ID..."
                              className={`w-full bg-slate-50 dark:bg-slate-900/80 px-6 py-5 rounded-2xl border-2 text-sm font-black font-mono outline-none transition-all ${manualError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`}
                          />
                          {manualError && <AlertCircle size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500" />}
                      </div>
                      <button 
                          onClick={handleManualSubmit}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-5 rounded-2xl font-black text-xs shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center"
                      >
                          <Check size={24} strokeWidth={3} />
                      </button>
                  </div>
              ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 px-6 py-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] font-black font-mono text-slate-400 truncate shadow-inner tracking-widest flex items-center min-w-0">
                        {sheetId ? `SOURCE_ID: ${sheetId}` : 'NO INFRASTRUCTURE LINKED'}
                    </div>
                    <button 
                      onClick={handleOpenPicker} 
                      disabled={isOpeningPicker}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-5 rounded-2xl font-black text-xs shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                    >
                        {isOpeningPicker ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} strokeWidth={3} />}
                        <span className="uppercase tracking-widest text-[10px]">{isOpeningPicker ? 'Authenticating...' : 'Network Discovery'}</span>
                    </button>
                  </div>
              )}
          </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => setView(ViewState.PRIVACY)}>
          <div className="flex items-center gap-6">
              <div className="p-3.5 bg-blue-600/10 text-blue-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Shield size={24} />
              </div>
              <div className="text-left">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Privacy Protocol</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Review Security Standards & Sovereignty</p>
              </div>
          </div>
          <button className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 shadow-sm hover:shadow-md transition-all active:scale-95">
              Launch Hub
          </button>
      </div>
    </div>
  );
};
