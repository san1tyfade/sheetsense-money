
import React from 'react';
import { Layers } from 'lucide-react';

interface TabPanelProps {
    id: string; // "assets-view"
    options: { id: string, label: string, icon?: React.ReactNode }[];
    selectedId: string;
    onChange: (id: string) => void;
    variant?: 'pill' | 'underline';
    size?: 'sm' | 'md';
}

export const TabPanel: React.FC<TabPanelProps> = ({
    id,
    options,
    selectedId,
    onChange,
    variant = 'pill',
    size = 'md'
}) => {

    // Abstracting the specific shared look:
    // "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-4..."
    // "flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto..."

    // This component attempts to standardize the *horizontal* pill selectors found in
    // Ledger Views, Asset Views, etc. The vertical one in PortfolioAnalytics is quite unique.

    return (
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-x-auto no-scrollbar">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`
                        px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2
                        ${selectedId === opt.id
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'}
                    `}
                >
                    {opt.icon}
                    {opt.label}
                </button>
            ))}
        </div>
    );
};
