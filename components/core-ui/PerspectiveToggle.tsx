
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { haptics } from '../../services/infrastructure/HapticService';

interface ToggleOption<T> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface PerspectiveToggleProps<T> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * PerspectiveToggle: The Unified Navigation Primitive
 * Encapsulates institutional styling with bold typography and blue highlights.
 */
export function PerspectiveToggle<T extends string>({
  options,
  value,
  onChange,
  className = ""
}: PerspectiveToggleProps<T>) {
  
  const handleSelect = (id: T) => {
    if (id === value) return;
    haptics.click('soft');
    onChange(id);
  };

  return (
    <nav className={`flex items-center gap-3 text-sm sm:text-base font-black tracking-tight overflow-x-auto no-scrollbar flex-nowrap ${className}`}>
      {options.map((opt, idx) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <React.Fragment key={opt.id}>
            <button
              onClick={() => handleSelect(opt.id)}
              className={`transition-all duration-300 hover:text-slate-900 dark:hover:text-white shrink-0 flex items-center gap-2 group/btn
                ${isActive 
                  ? 'text-slate-900 dark:text-white scale-105 underline decoration-blue-500 decoration-2 underline-offset-8' 
                  : 'text-slate-400'
                }`}
            >
              {Icon && <Icon size={isActive ? 18 : 16} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover/btn:scale-110 opacity-60'}`} />}
              <span className="uppercase">{opt.label}</span>
            </button>
            {idx < options.length - 1 && (
              <span className="text-slate-200 dark:text-slate-700 font-light text-lg shrink-0" aria-hidden="true">/</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
