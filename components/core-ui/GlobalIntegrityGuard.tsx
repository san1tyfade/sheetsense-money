import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Clipboard, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { IEP } from '../../services/infrastructure/ErrorHandler';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * GlobalIntegrityGuard (Phase 4 IEP)
 * A high-level Error Boundary that catches uncaught runtime exceptions 
 * and provides a diagnostic payload for recovery.
 */
// Fix: Directly extend Component and import it from react to ensure inherited members like setState and props are resolved correctly
export class GlobalIntegrityGuard extends Component<Props, State> {
  // Standard state initialization for class components
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SYS-CRITICAL] Uncaught exception captured by Integrity Guard:", error, errorInfo);
    // Fix: Correctly using this.setState inherited from Component
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    window.location.reload();
  };

  private copyPayload = () => {
    const payload = {
      code: IEP.SYS.RUNTIME_FAULT,
      timestamp: new Date().toISOString(),
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent
    };
    
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => alert("Diagnostic payload copied to clipboard. Provide this to the code assistant."))
      .catch(() => alert("Failed to copy payload. See console for details."));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 sm:p-12 font-sans selection:bg-rose-500/30">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-[3.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
            {/* Visual Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-colors duration-1000 group-hover:bg-rose-500/10"></div>
            
            <div className="relative z-10 space-y-10">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-6 bg-rose-500/10 text-rose-50 rounded-[2.5rem] border border-rose-500/20 shadow-inner group-hover:scale-105 transition-transform duration-700 animate-pulse">
                        <ShieldAlert size={64} strokeWidth={1.5} />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">
                            System Recovery <br/>
                            <span className="text-rose-500">Protocol Initiated</span>
                        </h2>
                        <p className="text-sm md:text-base text-slate-400 font-bold leading-relaxed max-w-md mx-auto uppercase tracking-wide opacity-80">
                            A critical hardware mismatch or logic fault has bypassed primary security layers. 
                        </p>
                    </div>
                </div>

                <div className="bg-slate-950/80 rounded-3xl p-8 border border-slate-800/50 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <Terminal size={16} className="text-slate-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Fault Identifier</span>
                        </div>
                        <code className="text-xs font-black font-mono text-rose-400 bg-rose-500/10 px-3 py-1 rounded">
                            [{IEP.SYS.RUNTIME_FAULT}]
                        </code>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">Logical Signal</p>
                        <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-800/50 break-all leading-relaxed">
                            {this.state.error?.message || "Unknown Runtime Discontinuity"}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={this.copyPayload}
                        className="flex items-center justify-center gap-3 py-5 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl"
                    >
                        <Clipboard size={18} />
                        Copy Payload
                    </button>
                    <button 
                        onClick={this.handleReset}
                        className="flex items-center justify-center gap-3 py-5 px-8 bg-white text-slate-950 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:bg-rose-50 active:scale-[0.98] shadow-2xl shadow-rose-500/20"
                    >
                        <RefreshCw size={18} strokeWidth={3} />
                        Re-initialize
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-800/50 opacity-40">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-[1px] bg-slate-700" />
                        <Cpu size={14} className="text-slate-500" />
                        <div className="w-8 h-[1px] bg-slate-700" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-600">Sovereign_Integrity_Vault_v2.7</p>
                </div>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Correctly using this.props inherited from Component
    return this.props.children;
  }
}
