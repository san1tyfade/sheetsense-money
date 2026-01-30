import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Cloud, Clock, Loader2, CloudUpload, CloudDownload, CheckCircle2, Terminal } from 'lucide-react';
import { performCloudVaultSync, performCloudVaultRestore } from '../../services/backupService';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { RestoreSuccessModal } from './RestoreSuccessModal';

interface CloudSyncModuleProps {
  userProfile: UserProfile | null;
  sheetId: string;
}

export const CloudSyncModule: React.FC<CloudSyncModuleProps> = ({ userProfile, sheetId }) => {
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastCloudSyncAt, setLastCloudSyncAt] = useIndexedDB<string | null>('fintrack_last_cloud_sync_at', null);

  const handleCloudSync = async () => {
      if (!userProfile) {
          alert("Please sign in to use Cloud Sync.");
          return;
      }
      setIsCloudSyncing(true);
      setSyncStatus('idle');
      try {
          const timestamp = await performCloudVaultSync(sheetId, userProfile);
          setLastCloudSyncAt(timestamp);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (e: any) { 
          alert("Cloud sync failed: " + e.message); 
          setSyncStatus('error');
      } finally { 
          setIsCloudSyncing(false); 
      }
  };

  const handleCloudRestore = async () => {
      if (!userProfile) {
          alert("Please sign in to verify identity.");
          return;
      }
      if (!confirm("Overwrite local data with Cloud Vault?")) return;
      
      setIsCloudSyncing(true);
      setSyncStatus('idle');
      try {
          await performCloudVaultRestore(sheetId, userProfile);
          setIsSuccess(true);
      } catch (e: any) { 
          alert("Cloud restore failed: " + e.message); 
          setSyncStatus('error');
          setIsCloudSyncing(false); 
      }
  };

  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[3rem] p-10 shadow-sm flex flex-col gap-10 group hover:border-emerald-500/30 transition-all">
      {isSuccess && <RestoreSuccessModal onReload={() => window.location.reload()} />}
      
      <div className="flex items-center gap-6">
          <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Cloud size={28} />
          </div>
          <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Cloud Vault</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.3em] mt-3">Encrypted Drive Inbound/Outbound</p>
          </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] flex flex-col gap-8 shadow-inner border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="space-y-4 text-left relative z-10">
              <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Terminal size={12} /> Sync Manifest</h4>
                  {lastCloudSyncAt && !isCloudSyncing && syncStatus === 'idle' && (
                      <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                          <Clock size={10} /> LAST {new Date(lastCloudSyncAt).toLocaleDateString()}
                      </div>
                  )}
                  {syncStatus === 'success' && (
                      <div className="flex items-center gap-2 text-[8px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 animate-in fade-in zoom-in-95">
                          <CheckCircle2 size={10} /> TRANSMITTED
                      </div>
                  )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold uppercase tracking-wider opacity-70">Provision local IndexedDB state into a hidden system partition on your Google Drive.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
              <button onClick={handleCloudSync} disabled={isCloudSyncing} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                {isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} strokeWidth={3} />} Uplink
              </button>
              <button onClick={handleCloudRestore} disabled={isCloudSyncing} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                {isCloudSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} strokeWidth={3} />} Downlink
              </button>
          </div>
      </div>
    </div>
  );
};