import React from 'react';
import { useMortgageCalculator } from '../hooks/useMortgageCalculator';
import { MortgageChart } from './mortgage/MortgageChart';
import { MortgageControls } from './mortgage/MortgageControls';
import { MortgageMetrics } from './mortgage/MortgageMetrics';

export const MortgageModule: React.FC = () => {
    const { inputs, actions, data } = useMortgageCalculator();
    const { schedule, stats } = data;

    return (
        <div className="flex flex-col xl:flex-row gap-8 min-h-[800px] animate-in fade-in duration-700 tabular-nums">
            {/* 1. Results Column (Left) */}
            <main className="flex-1 space-y-8 min-w-0 order-1 xl:order-1">
                <MortgageMetrics stats={stats} isStressTestEnabled={inputs.isStressTestEnabled} />
                <MortgageChart schedule={schedule} inputs={inputs} />
            </main>

            {/* 2. Control Sidebar (Right) */}
            <aside className="xl:w-[400px] shrink-0 order-2 xl:order-2">
                <MortgageControls inputs={inputs} actions={actions} data={data} />
            </aside>
        </div>
    );
};