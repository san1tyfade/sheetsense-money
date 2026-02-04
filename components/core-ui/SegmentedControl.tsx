
import React from 'react';

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export const SegmentedControl = <T extends string>({ 
  options, activeId, onChange, className = "" 
}: SegmentedControlProps<T>) => {
  return (
    <nav className={`flex items-center gap-3 text-sm sm:text-base font-black tracking-tight overflow-x-auto no-scrollbar pb-2 sm:pb-0 ${className}`}>
      {options.map((option, idx) => (
        <React.Fragment key={option.id}>
          <button 
            onClick={() => onChange(option.id)}
            className={`transition-all duration-300 hover:text-slate-900 dark:hover:text-white shrink-0 ${
              activeId === option.id 
                ? 'text-slate-900 dark:text-white scale-105 underline decoration-blue-500 decoration-2 underline-offset-8' 
                : 'text-slate-400'
            }`}
          >
            {option.label}
          </button>
          {idx < options.length - 1 && <span className="text-slate-200 dark:text-slate-700 font-light text-lg shrink-0">/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
};
