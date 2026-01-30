
import React, { ReactNode } from 'react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { StandardTooltip } from '../analytics/AnalyticsPrimitives';

interface SharedChartProps {
    children: ReactNode;
    height?: number | string;
    width?: number | string;
    yTickFormatter?: (value: any) => string;
    xTickFormatter?: (value: any) => string;
    hideXAxis?: boolean;
    hideYAxis?: boolean;
    yDomain?: any;
}

export const SharedChart: React.FC<SharedChartProps> = ({
    children,
    height = "100%",
    width = "100%",
    yTickFormatter = (v) => `${v}`,
    xTickFormatter,
    hideXAxis = false,
    hideYAxis = false,
    yDomain
}) => {
    const theme = useChartTheme(true);

    return (
        <ResponsiveContainer width={width} height={height}>
            {/* We clone the child chart (e.g. AreaChart) to inject standard axis/grid children if needed,
                but Recharts composition is tricky. Better to provide a Wrapper that sets up the container 
                and lets the parent define the Chart type, OR provide standard Axis components.
                
                Strategy: This component will serve as a standard configuration provider for axes/grid. 
                However, Recharts components (LineChart, AreaChart) must be the direct parent of Axis/Grid.
                
                REVISED STRATEGY: Since Recharts requires specific parent-child relationships, 
                we will instead export pre-configured standard components or just use this as a container 
                if we pass the Chart element as a child.
            */}
            <React.Fragment>
                {/* 
                  Actually, the most effective pattern for Recharts deduplication is to create 
                  wrapper components for the *Chart* types themselves if we want to enforce standard axes,
                  OR just use this container for sizing and theme context.
                  
                  Let's try a Composition Pattern where we pass the Chart Element as 'children' 
                  and this wrapper clones it to add standard Axes if they are missing? 
                  No, that's brittle.
                  
                  Better: This component returns a properly sized container. 
                  We will also export standard Axis configurations as helpers.
              */}
                {children}
            </React.Fragment>
        </ResponsiveContainer>
    );
};

// Standard Axis Configuration to remove boilerplate
export const StandardGrid = () => {
    const theme = useChartTheme(true);
    return <CartesianGrid vertical={false} strokeDasharray="4 4" stroke={theme.gridColor} opacity={0.3} />;
};

export const StandardXAxis = ({ dataKey, formatter, hide = false, type = 'category', domain }: { dataKey?: string, formatter?: (v: any) => string, hide?: boolean, type?: 'number' | 'category', domain?: any }) => {
    const theme = useChartTheme(true);
    return (
        <XAxis
            dataKey={dataKey}
            hide={hide}
            type={type}
            domain={domain}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 900, fill: theme.axisColor }}
            tickFormatter={formatter}
        />
    );
};

export const StandardYAxis = ({ formatter, width = 50, domain, type = 'number', dataKey }: { formatter?: (v: any) => string, width?: number, domain?: any, type?: 'number' | 'category', dataKey?: string }) => {
    const theme = useChartTheme(true);
    return (
        <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 900, fill: theme.axisColor }}
            tickFormatter={formatter}
            width={width}
            domain={domain}
            type={type}
            dataKey={dataKey}
        />
    );
};
