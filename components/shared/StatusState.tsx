
import React from 'react';
import { Loader2, AlertCircle, PackageOpen } from 'lucide-react';

interface StatusStateProps {
    isLoading?: boolean;
    isEmpty?: boolean;
    error?: string | null;
    loadingMessage?: string;
    emptyMessage?: string;
    emptyTitle?: string;
    children?: React.ReactNode;
    variant?: 'default' | 'card' | 'minimal';
    className?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export const StatusState: React.FC<StatusStateProps> = ({
    isLoading = false,
    isEmpty = false,
    error = null,
    loadingMessage = "Loading data...",
    emptyMessage = "No data available in this view.",
    emptyTitle = "No Data Found",
    children,
    variant = 'default',
    className = "",
    icon,
    action
}) => {

    const baseClasses = "flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500";
    const cardClasses = variant === 'card' ? "bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm" : "";
    const minHeight = variant === 'minimal' ? "" : "min-h-[200px]";

    if (isLoading) {
        return (
            <div className={`${baseClasses} ${cardClasses} ${minHeight} ${className}`}>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">{loadingMessage}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${baseClasses} ${cardClasses} ${minHeight} ${className}`}>
                <div className="p-3 bg-red-500/10 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Error Loading Data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{error}</p>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className={`${baseClasses} ${cardClasses} ${minHeight} ${className}`}>
                {icon || (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                        <PackageOpen className="w-8 h-8 text-slate-400" />
                    </div>
                )}
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-2">{emptyTitle}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">{emptyMessage}</p>

                {action && (
                    <div className="mt-2">
                        {action}
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
};
