import React from 'react';
import { ViewState } from '../types';
import { useFinancialStore } from '../context/FinancialContext';
import { Dashboard } from './Dashboard';
import { AssetsList } from './AssetsList';
import { InvestmentsList } from './InvestmentsList';
import { TradesList } from './TradesList';
import { IncomeView } from './IncomeView';
import { SpendView } from './SpendView';
import { AnalyticsView } from './AnalyticsView';
import { InformationView } from './InformationView';
import { CockpitView } from './cockpit/CockpitView';
import { ToolsView } from './tools/ToolsView';
import { DataIngest } from './DataIngest';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';

/**
 * ViewDispatcher
 * Acts as the internal router for the application.
 */
export const ViewDispatcher: React.FC = () => {
  const { currentView, setIsTourActive } = useFinancialStore();

  const renderActiveView = () => {
    switch (currentView) {
        case ViewState.DASHBOARD: return <Dashboard />;
        case ViewState.ASSETS: return <AssetsList />;
        case ViewState.INVESTMENTS: return <InvestmentsList />;
        case ViewState.TRADES: return <TradesList />;
        case ViewState.INCOME: return <IncomeView />;
        case ViewState.SPEND: return <SpendView />;
        case ViewState.ANALYTICS: return <AnalyticsView />;
        case ViewState.COCKPIT: return <CockpitView />;
        case ViewState.TOOLS: return <ToolsView />;
        case ViewState.INFORMATION: return <InformationView />;
        case ViewState.SETTINGS: return <DataIngest onTourStart={() => setIsTourActive(true)} />;
        case ViewState.PRIVACY: return <PrivacyPolicy />;
        case ViewState.TERMS: return <TermsOfService />;
        default: return <Dashboard />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 h-full">
        {renderActiveView()}
    </div>
  );
};