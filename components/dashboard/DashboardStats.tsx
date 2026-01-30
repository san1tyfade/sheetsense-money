import React, { memo } from 'react';
import { InstitutionalStatCard, StatVariant } from '../core-ui/InstitutionalStatCard';

interface StatsCardProps {
    title: string;
    value: number;
    icon: any;
    color: 'blue' | 'emerald' | 'purple';
    isLoading: boolean;
    change?: number | null;
    isHistorical: boolean;
}

export const StatsCard = memo((props: StatsCardProps) => {
    return (
        <InstitutionalStatCard 
            {...props} 
            variant={props.color as StatVariant}
        />
    );
});