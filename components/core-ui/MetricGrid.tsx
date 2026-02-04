
import React from 'react';

interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const MetricGrid: React.FC<MetricGridProps> = ({ 
  children, columns = 3, className = "" 
}) => {
  const colClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4'
  }[columns];

  return (
    <div className={`grid grid-cols-1 ${colClass} gap-6 md:gap-8 px-2 md:px-0 ${className}`}>
      {children}
    </div>
  );
};
