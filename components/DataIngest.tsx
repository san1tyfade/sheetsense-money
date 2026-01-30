
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { performFullSignIn } from '../services/authService';
import { getArchiveManagementList, deleteLocalYear, wipeLocalDatabase } from '../services/backupService';
import { useFinancialStore } from '../context/FinancialContext';
import { IdentityModule } from './settings/IdentityModule';
import { SourceMatrix } from './settings/SourceMatrix';
import { VaultModule } from './settings/VaultModule';
import { CloudSyncModule } from './settings/CloudSyncModule';
import { ManualExportModule } from './settings/ManualExportModule';
import { RolloverStepper } from './settings/RolloverStepper';
import { OnboardingSplash } from './settings/OnboardingSplash';
import { WipeConfirmationModal } from './settings/WipeConfirmationModal';
import { FontScale, DensityMode } from '../types';
import { ShieldCheck, Zap, LogOut, Moon, Sun, Eye, EyeOff, Shield, ShieldAlert, Cpu, Terminal, Type, Settings2, Maximize, Minimize, User, Link, Database, Monitor } from 'lucide-react';
import { PerspectiveToggle } from './core-ui/PerspectiveToggle';

interface DataIngestProps {
  onTourStart: () => void;
}

type SettingsSubTab = 'IDENTITY' | 'CONNECTIVITY' | 'PERSISTENCE' | 'SECURITY';

export const DataIngest: React.FC<DataIngestProps> = ({ onTourStart }) => {
  const store = useFinancialStore();
  const { 
    sheetConfig: config, setSheetConfig: onConfigChange, sync, isSyncing, syncingTabs, syncStatus, 
    sheetUrl, setSheetUrl: onSheetUrlChange, isDarkMode, setIsDarkMode, userProfile, authSession,
    setUserProfile: onProfileChange, setAuthSession: onSessionChange, signOut: onSignOut, setView, 
    activeYear, setActiveYear, setSelectedYear, isGhostMode, setIsGhostMode, fontScale, setFontScale,
    densityMode, setDensityMode, notify
  } = store;

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('IDENTITY');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [localArchives, setLocalArchives] = useState<any[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  const refreshArchives = useCallback(async () => {
    setIsLoadingArchives(true);
    try {
      const list = await getArchiveManagementList();
      setLocalArchives(list);
    } catch (e) {
      console.error("Failed to load archives", e);
    } finally {
      setIsLoadingArchives(false);
    }
  }, []);

  useEffect(() => {
    refreshArchives();
  }, [activeYear, refreshArchives]);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const { session, profile } = await performFullSignIn(config.clientId);
      onSessionChange(session); 
      onProfileChange(profile); 
      notify('success', 'Security Authorized', `Incepted identity for ${profile.name}`);
    } catch (e: any) { 
      console.error("Sign-in failed", e);
      notify('error', 'Authorization Fault', 'Identity handshake failed. Verification required.');
    } finally { 
      setIsAuthLoading(false); 
    }
  };

  const handleDeleteArchive = async (year: number) => {
    if (year === activeYear) return;
    if (!confirm(`Delete all local records for ${year === 0 ? 'Global' : year}?`)) return;
    await deleteLocalYear(year);
    refreshArchives();
    notify('warning', 'Vault Pruned', `Local records for ${year} purged from hardware.`);
  };

  const handleWipeDatabase = async () => {
    await wipeLocalDatabase();
    window.location.reload();
  };

  if (!config.sheetId) {
    return (
      <OnboardingSplash 
        userProfile={userProfile}
        isAuthLoading={isAuthLoading}
        onSignIn={handleSignIn}
        onTourStart={onTourStart}
        refreshArchives={refreshArchives}
      />
    );
  }

  const subTabs: { id: SettingsSubTab; label: string; icon: any }[] = [
    { id: 'IDENTITY', label: 'Identity', icon: User },
    { id: 'CONNECTIVITY', label: 'Connectivity', icon: Link },
    { id: 'PERSISTENCE', label: 'Persistence', icon: Database },
    { id: 'SECURITY', label: 'Interface', icon: Monitor }
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-24 px-2 md:px-0 tabular-nums">
      <header className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] flex flex-col uppercase">
                    System <span className="text-blue-600 dark:text-blue-400">Infrastructure</span>
                </h2>
                
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-slate-950 rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden shrink-0 group">
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-blue-500/10 transition-colors"></div>
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tighter relative z-10">2.7</span>
                        <span className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] relative z-10 mt-1">Revision</span>
                    </div>
                </div>
            </div>

            <PerspectiveToggle 
              options={subTabs}
              value={activeSubTab}
              onChange={setActiveSubTab}
            />
        </div>
      </header>

      <div className="transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {activeSubTab === 'IDENTITY' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <IdentityModule 
              userProfile={userProfile}
              sheetUrl={sheetUrl}
              sheetId={config.sheetId}
              onSignIn={handleSignIn}
              onSignOut={onSignOut}
            />
          </div>
        )}

        {activeSubTab === 'CONNECTIVITY' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <SourceMatrix 
              config={config}
              onConfigChange={onConfigChange}
              sync={sync}
              isSyncing={isSyncing}
              syncingTabs={syncingTabs}
              syncStatus={syncStatus}
              token={authSession?.token}
            />
          </div>
        )}

        {activeSubTab === 'PERSISTENCE' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <VaultModule 
              activeYear={activeYear}
              localArchives={localArchives}
              isLoadingArchives={isLoadingArchives}
              refreshArchives={refreshArchives}
              onDeleteArchive={handleDeleteArchive}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <CloudSyncModule userProfile={userProfile} sheetId={config.sheetId} />
                <ManualExportModule sheetId={config.sheetId} userProfile={userProfile} />
            </div>
            
            <div className="bg-slate-950 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group border border-blue-500/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-600/30 group-hover:scale-110 transition-transform duration-700">
                        <Zap size={48} className="fill-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Financial Rollover</h3>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xl font-bold uppercase tracking-widest opacity-80">Finalize the current logical year and provision the next cycle. All archives are structurally locked via API.</p>
                    </div>
                    <button onClick={() => setIsRolloverOpen(true)} className="bg-white text-slate-900 hover:bg-blue-50 font-black px-12 py-6 rounded-[1.5rem] shadow-2xl transition-all uppercase text-xs tracking-[0.25em] active:scale-95">Initiate Year-End Sequence</button>
                </div>

                <RolloverStepper 
                    isOpen={isRolloverOpen} 
                    onClose={() => setIsRolloverOpen(false)} 
                    onSync={async (tabs) => sync(tabs)}
                    sheetId={config.sheetId}
                    incomeTab={config.tabNames.income}
                    expenseTab={config.tabNames.expenses}
                    activeYear={activeYear}
                    onSuccess={(nextYear) => {
                        setActiveYear(nextYear);
                        setSelectedYear(nextYear);
                        refreshArchives();
                        notify('success', 'Rollover Finalized', `Infrastructure provisioned for FY ${nextYear}`);
                    }}
                />
            </div>
          </div>
        )}

        {activeSubTab === 'SECURITY' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-12 rounded-[3.5rem] shadow-sm space-y-10 flex flex-col backdrop-blur-xl group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-500/10 text-blue-600 rounded-[1.5rem] shadow-inner"><Settings2 size={28} /></div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Interface Preferences</h4>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-3">Visual & Experience Tuning</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed flex-1 opacity-80">Configure visual blurring, theme parameters, and typography magnitude for high-accessibility environments.</p>
                    <div className="space-y-4 pt-10 border-t border-slate-100 dark:border-slate-700/50">
                        {/* UI Magnitude Controller */}
                        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                                    {densityMode === DensityMode.ZEN ? <Maximize size={18} /> : <Minimize size={18} />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">UI Magnitude</span>
                            </div>
                            <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm sm:w-56">
                                {(['ZEN', 'COMPACT'] as DensityMode[]).map(mode => (
                                    <button 
                                        key={mode}
                                        onClick={() => { setDensityMode(mode); notify('info', 'Magnitude Recalibrated', `UI scaled to ${mode} mode.`); }}
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all duration-300 ${densityMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font Scale Control Block */}
                        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Type size={18} /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Text Magnitude</span>
                            </div>
                            <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm sm:w-56">
                                {(['SMALL', 'NORMAL', 'LARGE'] as FontScale[]).map(scale => (
                                    <button 
                                        key={scale}
                                        onClick={() => setFontScale(scale)}
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all duration-300 ${fontScale === scale ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        {scale}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setIsGhostMode(!isGhostMode)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${isGhostMode ? 'bg-amber-500/10 border-amber-500 text-amber-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-inner hover:border-blue-500/30'}`}>
                              {isGhostMode ? <EyeOff size={20} /> : <Eye size={20} />}
                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Privacy Protocol</span>
                          </button>
                          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-inner hover:border-blue-500/40 gap-3`}>
                              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Theme Matrix</span>
                          </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-12 rounded-[3.5rem] shadow-sm space-y-10 flex flex-col backdrop-blur-xl group hover:border-rose-500/30 transition-all">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-[1.5rem] shadow-inner"><ShieldAlert size={28} /></div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Atomic Purge</h4>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-3">Destructive Hardware Reset</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed flex-1 opacity-80">Trigger a zero-knowledge hardware wipe. This permanently deletes all local IndexedDB archives and resets configurations to default logic.</p>
                    <div className="pt-10 border-t border-slate-100 dark:border-slate-700/50">
                        <button onClick={() => setIsWipeModalOpen(true)} className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-rose-500/30 transition-all active:scale-95">Trigger Hardware Wipe</button>
                    </div>
                </div>
             </div>

             <div className="bg-slate-950 p-12 rounded-[3.5rem] border-2 border-slate-900 text-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                 <Cpu className="mx-auto mb-8 text-slate-700 animate-pulse" size={48} />
                 <h5 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 mb-4 flex items-center justify-center gap-4">
                    <div className="w-8 h-[1px] bg-slate-800" /> Security Sovereignty Protocol <div className="w-8 h-[1px] bg-slate-800" />
                 </h5>
                 <p className="text-[10px] text-slate-400 max-w-2xl mx-auto font-black uppercase tracking-[0.2em] leading-loose opacity-60">Sheetsense never caches your data on remote hardware. All encryption keys are derived from your Google Identity and held in temporary logic buffers. You are the sole sovereign of this data stream.</p>
             </div>
          </div>
        )}
      </div>

      <WipeConfirmationModal 
        isOpen={isWipeModalOpen} 
        onClose={() => setIsWipeModalOpen(false)} 
        onConfirm={handleWipeDatabase} 
      />

      <footer className="pt-20 pb-12 flex flex-col items-center gap-6 opacity-40">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
             <Terminal size={14} className="text-blue-500" /> Instance Build v2.7.0 Stable
          </div>
      </footer>
    </div>
  );
};
