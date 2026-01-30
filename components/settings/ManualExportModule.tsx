import React, { useState, useRef } from 'react';
import { Database, Clock, RefreshCw, Loader2, DownloadCloud, UploadCloud, ShieldCheck, ShieldAlert, FileWarning, AlertTriangle, CheckCircle2, Terminal, Shield } from 'lucide-react';
import { formatBaseCurrency } from '../../services/currencyService';
import { 
  exportBackup, processAndValidateBackup, finalizeImport, 
  ValidationResult 
} from '../../services/backupService';
import { useIndexedDB } from '../../hooks/useIndexedDB';
// Fix: Import VaultEnvelope from types instead of backupService
import { UserProfile, VaultEnvelope } from '../../types';
import { RestoreSuccessModal } from './RestoreSuccessModal';

interface ManualExportModuleProps {
  sheetId: string;
  userProfile: UserProfile | null;
}

export const ManualExportModule: React.FC<ManualExportModuleProps> = ({ sheetId, userProfile }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useIndexedDB<string | null>('fintrack_last_backup_at', null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [integrityState, setIntegrityState] = useState<{
      status: ValidationResult | 'scanning' | 'idle',
      envelope?: VaultEnvelope
  }>({ status: 'idle' });

  const handleExport = async () => {
      setIsBackingUp(true);
      try {
          await exportBackup(sheetId, userProfile?.sub, userProfile?.email);
          setLastBackupAt(new Date().toISOString());
      } catch (e: any) { 
          alert("Backup failed: " + e.message); 
      } finally { 
          setIsBackingUp(false); 
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIntegrityState({ status: 'scanning' });
      setIsBackingUp(true);
      try {
          const result = await processAndValidateBackup(file, sheetId, userProfile?.sub);
          setIntegrityState({ status: result.status, envelope: result.envelope });
      } catch (err: any) {
          alert("Verification Failed: " + err.message);
          setIntegrityState({ status: 'idle' });
      } finally {
          setLastBackupAt(null); // Clear last backup context on active verify
          setIsBackingUp(false);
      }
  };

  const confirmImport = async () => {
      if (!integrityState.envelope) return;
      if (!confirm("Overwrite current session with this backup?")) return;
      try {
          await finalizeImport(integrityState.envelope);
          setIsSuccess(true);
      } catch (err: any) {
          alert("Restore failed: " + err.message);
      }
  };

  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[3rem] p-10 shadow-sm flex flex-col gap-10 group hover:border-blue-500/30 transition-all">
      {isSuccess && <RestoreSuccessModal onReload={() => window.location.reload()} />}
      
      <div className="flex items-center gap-6">
          <div className="p-4 bg-blue-500/10 rounded-[1.5rem] text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Database size={28} />
          </div>
          <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Cold Storage</h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.3em] mt-3">Signed Offline JSON Snapshots</p>
          </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] flex flex-col gap-8 shadow-inner border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="space-y-4 text-left relative z-10">
              <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Terminal size={12} /> Vault Integrity</h4>
                  {lastBackupAt && integrityState.status === 'idle' && (
                      <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                          <Clock size={10} /> SAVED {new Date(lastBackupAt).toLocaleDateString()}
                      </div>
                  )}
              </div>
              
              {integrityState.status === 'idle' ? (
                  <div className="space-y-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold uppercase tracking-wider opacity-70">Generate a signed JSON manifest for local archiving. Contains all settings, tax logs, and cache.</p>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit">
                          <Shield size={12} className="text-emerald-600" />
                          <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Neural Encryption Enabled</span>
                      </div>
                  </div>
              ) : integrityState.status === 'scanning' ? (
                  <div className="flex items-center gap-3 py-2 animate-pulse">
                      <RefreshCw className="animate-spin text-blue-500" size={16} />
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Scanning Cipher Hash...</span>
                  </div>
              ) : (
                  <div className={`p-5 rounded-2xl border-2 transition-all animate-in zoom-in-95 ${
                      integrityState.status === 'valid' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                      'bg-rose-500/5 border-rose-500/20'
                  }`}>
                      <div className="flex items-center gap-3 mb-3">
                          {integrityState.status === 'valid' ? <ShieldCheck className="text-emerald-500" size={18} /> : <ShieldAlert className="text-rose-600" size={18} />}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${integrityState.status === 'valid' ? 'text-emerald-600' : 'text-rose-700'}`}>
                              {integrityState.status === 'valid' ? 'Identity Context Verified' : 'Security Access Denied'}
                          </span>
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                          <p className="text-[9px] font-black uppercase tracking-tighter opacity-50">Origin: {integrityState.envelope?.integrity.origin_hint}</p>
                          <p className="text-[9px] font-mono font-bold truncate text-slate-500 bg-white/50 dark:bg-black/20 p-1 rounded">SID: {integrityState.envelope?.integrity.sheet_id}</p>
                      </div>
                  </div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
              {integrityState.status === 'idle' || integrityState.status === 'scanning' ? (
                  <>
                      <button onClick={handleExport} disabled={isBackingUp} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isBackingUp && integrityState.status === 'idle' ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} strokeWidth={3} />} Snapshot
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isBackingUp} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isBackingUp && integrityState.status === 'scanning' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} strokeWidth={3} />} Verify
                      </button>
                  </>
              ) : (
                  <>
                      <button onClick={() => setIntegrityState({status: 'idle'})} className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl">Abort</button>
                      <button onClick={confirmImport} disabled={integrityState.status !== 'valid'} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${integrityState.status === 'valid' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-rose-600 text-white shadow-rose-500/30'}`}>Mount Vault</button>
                  </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          </div>
      </div>
    </div>
  );
};
