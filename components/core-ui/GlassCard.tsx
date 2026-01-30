import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
}

/**
 * Standard Glass Primitive for Sheetsense UI.
 * Encapsulates backdrop-blur, borders, and group hover effects.
 */
export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, className = "", onClick, role, tabIndex 
}) => {
  return (
    <div 
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl rounded-[2.5rem] transition-all duration-500 group shadow-sm hover:shadow-2xl overflow-hidden ${className} ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
      {children}
    </div>
  );
};