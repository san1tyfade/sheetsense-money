
import React from 'react';

interface ManagedFieldProps {
  label: string;
  id?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  info?: string;
}

export const ManagedField: React.FC<ManagedFieldProps> = ({ label, id, error, children, className = "", info }) => {
  return (
    <div className={`space-y-2 group ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label htmlFor={id} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">
          {label}
        </label>
        {info && (
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">{info}</span>
        )}
      </div>
      <div className={`relative transition-all duration-300 ${error ? 'ring-2 ring-rose-500/20' : ''}`}>
        {children}
      </div>
      {error && (
        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1 animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};
