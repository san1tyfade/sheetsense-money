import React from 'react';
import { ArchiveMeta } from '../../types';
import { Box, RefreshCw, CalendarDays, Globe, HardDrive, Trash2, Database, Terminal } from 'lucide-react';

interface VaultModuleProps {
  activeYear: number;
  localArchives: ArchiveMeta[];
  isLoadingArchives: boolean;
  refreshArchives: () => void;
  onDeleteArchive: (year: number) => void;
}

export const VaultModule: React.FC<VaultModuleProps> = ({ 
  activeYear, localArchives, isLoadingArchives, refreshArchives, onDeleteArchive 
}) => {
  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[3.5rem] p-8 md:p-12 shadow-sm space-y-10 md:space-y-12">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-8 md:pb-10">
            <div className="flex items-center gap-6 md:gap-8">
                <div className="p-4 md:p-5 bg-blue-600 text-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-blue-600/20 flex items-center justify-center shrink-0">
                  <HardDrive size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Local Persistence</h3>
                  <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2 md:mt-3">On-device hardware vault Instance</p>
                </div>
            </div>
            <button 
                onClick={refreshArchives} 
                className="w-12 h-12 md:w-16 md:h-16 inline-flex items-center justify-center bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-500 rounded-[1.25rem] md:rounded-[1.5rem] transition-all active:scale-95 shadow-inner" 
                title="Audit Vault State"
            >
              <RefreshCw size={20} className={`md:w-6 md:h-6 ${isLoadingArchives ? "animate-spin" : ""}`} strokeWidth={3} />
            </button>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-hidden rounded-[3.5rem] border-2 border-slate-950 dark:border-slate-800 shadow-2xl">
            <table className="w-full text-left">
                <thead className="bg-slate-950 dark:bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <tr>
                        <th className="px-10 py-8">Financial Chapter</th>
                        <th className="px-10 py-8">Hardware Port</th>
                        <th className="px-10 py-8">Logic Ingested</th>
                        <th className="px-10 py-8 text-right">System Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/20">
                    {localArchives.map(archive => {
                        const isActive = archive.year === activeYear;
                        const isGlobal = archive.year === 0;
                        return (
                          <tr key={archive.year} className={`hover:bg-blue-500/[0.03] dark:hover:bg-blue-500/[0.05] group transition-colors tabular-nums ${isActive ? 'bg-blue-500/[0.02]' : ''}`}>
                              <td className="px-10 py-10">
                                  <div className="flex items-center gap-6">
                                      <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${isActive ? 'text-blue-500 border-blue-500/30' : 'text-slate-400'}`}>
                                        {isGlobal ? <Globe size={24} /> : <CalendarDays size={24} />} 
                                      </div>
                                      <div className="flex flex-col gap-1.5">
                                          <span className="font-black text-slate-900 dark:text-white text-base tracking-widest uppercase">{isGlobal ? "Global Registry" : `FY ${archive.year}`}</span>
                                          {isActive && <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><Terminal size={10} /> Active Logic Core</span>}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-10 py-10">
                                  <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 ${isActive ? 'text-blue-600' : isGlobal ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                      <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                                      IndexedDB Store
                                  </div>
                              </td>
                              <td className="px-10 py-10">
                                  <div className="flex flex-col">
                                      <span className="font-mono text-sm text-slate-900 dark:text-white font-black tracking-tight ghost-blur">{archive.records.toLocaleString()} OBJECTS</span>
                                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">Ingested Stream</span>
                                  </div>
                              </td>
                              <td className="px-10 py-10 text-right">
                                  {!isActive && (
                                    <button 
                                        onClick={() => onDeleteArchive(archive.year)}
                                        className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-90 opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100 dark:border-slate-700 inline-flex items-center justify-center"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                  )}
                              </td>
                          </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Mobile Grid View */}
        <div className="lg:hidden space-y-6">
            {localArchives.map(archive => {
                const isActive = archive.year === activeYear;
                const isGlobal = archive.year === 0;
                return (
                    <div key={archive.year} className={`p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group ${isActive ? 'bg-blue-600/5 border-blue-500/30' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border flex items-center justify-center ${isActive ? 'text-blue-500 border-blue-500/20' : 'text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                    {isGlobal ? <Globe size={20} /> : <CalendarDays size={20} />}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                        {isGlobal ? "Global Registry" : `FY ${archive.year}`}
                                    </h4>
                                    {isActive && <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter flex items-center gap-2 animate-pulse"><Terminal size={8} /> Active Core</span>}
                                </div>
                            </div>
                            {!isActive && (
                                <button onClick={() => onDeleteArchive(archive.year)} className="p-3 bg-rose-500/10 text-rose-50 rounded-xl active:scale-90 transition-all border border-rose-500/10 inline-flex items-center justify-center">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Persistence</p>
                                <div className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase flex items-center gap-2">
                                    <Database size={10} className="text-emerald-500" /> IDB Store
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Node Weight</p>
                                <p className="text-xs font-mono font-black text-slate-900 dark:text-white ghost-blur">
                                    {archive.records.toLocaleString()} <span className="opacity-50">OBJ</span>
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {localArchives.length === 0 && (
            <div className="px-10 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.5em] opacity-30 italic">No Historical Data Ports Detected</div>
        )}
    </div>
  );
};