import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Terminal, Zap, Hash } from 'lucide-react';
import { useFinancialStore } from '../../context/FinancialContext';
import { AppNotification } from '../../types';

export const NotificationHost: React.FC = () => {
  const { notifications, dismissNotification } = useFinancialStore();

  return (
    <div className="fixed top-4 left-4 right-4 md:top-auto md:bottom-6 md:right-6 md:left-auto z-[200] flex flex-col gap-2 md:gap-3 md:max-w-[400px] pointer-events-none">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onDismiss={() => dismissNotification(n.id)} />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{ notification: AppNotification, onDismiss: () => void }> = ({ 
    notification: n, onDismiss 
}) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = n.duration || 5000;
        const startTime = Date.now();
        
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                onDismiss();
            }
        }, 30);

        return () => clearInterval(interval);
    }, [n.duration, onDismiss]);

    const styles = {
        success: { 
            bg: 'bg-emerald-950/95', 
            border: 'border-emerald-500/50', 
            text: 'text-emerald-400', 
            bar: 'bg-emerald-500',
            icon: CheckCircle
        },
        error: { 
            bg: 'bg-rose-950/95', 
            border: 'border-rose-500/50', 
            text: 'text-rose-400', 
            bar: 'bg-rose-500',
            icon: AlertCircle
        },
        warning: { 
            bg: 'bg-amber-950/95', 
            border: 'border-amber-500/50', 
            text: 'text-amber-400', 
            bar: 'bg-amber-500',
            icon: Zap
        },
        info: { 
            bg: 'bg-slate-900/95', 
            border: 'border-blue-500/50', 
            text: 'text-blue-400', 
            bar: 'bg-blue-500',
            icon: Info
        }
    };

    const s = styles[n.type];
    const Icon = s.icon;

    return (
        <div 
            className={`pointer-events-auto flex flex-col overflow-hidden rounded-xl md:rounded-2xl border ${s.border} ${s.bg} backdrop-blur-md shadow-2xl animate-in slide-in-from-top-4 md:slide-in-from-right-10 duration-500`}
        >
            <div className="flex items-start gap-3 md:gap-4 p-3 md:p-5">
                <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl bg-white/5 ${s.text} shadow-inner shrink-0`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0 pr-2 md:pr-4">
                    <h5 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white leading-tight">{n.title}</h5>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-0.5 md:mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">{n.message}</p>
                </div>
                <button onClick={onDismiss} className="p-1 text-slate-500 hover:text-white transition-colors">
                    <X size={14} strokeWidth={3} />
                </button>
            </div>
            
            <div className="h-0.5 md:h-1 w-full bg-white/5 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-30 animate-pulse ${s.bar}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            <div className="px-5 py-2 flex items-center justify-between opacity-30">
                <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.4em] flex items-center gap-1">
                    <Terminal size={8} /> 
                    {n.code ? 'LOGICAL_FAULT' : 'SYSTEM_EVENT'}
                </span>
                {n.code && (
                  <span className="text-[7px] font-black uppercase text-slate-400 font-mono flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                    <Hash size={6} /> {n.code}
                  </span>
                )}
            </div>
        </div>
    );
};