
import {
  LayoutDashboard, Wallet, TrendingUp, History, Settings, Info,
  Banknote, BarChart2, Gauge, Sparkles, Receipt, Activity, Layers,
  ShieldCheck, Scale
} from 'lucide-react';
import { ViewState } from '../types';

interface ViewDefinition {
  id: ViewState;
  label: string;
  icon: any;
  protected?: boolean;
  directorate: 'Capital' | 'Flow' | 'Logistics' | 'Legal';
  description: string;
}

export const VIEW_METADATA: Record<string, ViewDefinition> = {
  [ViewState.DASHBOARD]: {
    id: ViewState.DASHBOARD,
    label: 'Intelligence',
    icon: LayoutDashboard,
    directorate: 'Capital',
    description: 'Financial nerve center and atomic net worth tracking.'
  },
  [ViewState.ASSETS]: {
    id: ViewState.ASSETS,
    label: 'Inventory',
    icon: Wallet,
    directorate: 'Capital',
    description: 'Physical and digital asset registry.'
  },
  [ViewState.INVESTMENTS]: {
    id: ViewState.INVESTMENTS,
    label: 'Portfolio',
    icon: TrendingUp,
    directorate: 'Capital',
    description: 'Securities and holdings performance audit.'
  },
  [ViewState.TRADES]: {
    id: ViewState.TRADES,
    label: 'Events',
    icon: History,
    directorate: 'Capital',
    description: 'Historical transaction ledger and trade history.'
  },
  [ViewState.INCOME]: {
    id: ViewState.INCOME,
    label: 'Ledger',
    icon: Banknote,
    directorate: 'Flow',
    description: 'Primary income and cash flow distribution.'
  },
  [ViewState.SPEND]: {
    id: ViewState.SPEND,
    label: 'Spend',
    icon: Receipt,
    directorate: 'Flow',
    description: 'Neural statement processing and outflow audit.'
  },
  [ViewState.ANALYTICS]: {
    id: ViewState.ANALYTICS,
    label: 'Analytics',
    icon: BarChart2,
    directorate: 'Flow',
    description: 'Statistical inference and comparative trends.'
  },
  [ViewState.COCKPIT]: {
    id: ViewState.COCKPIT,
    label: 'Cockpit',
    icon: Gauge,
    directorate: 'Flow',
    description: 'Strategic wealth simulations and projection logic.'
  },
  [ViewState.TOOLS]: {
    id: ViewState.TOOLS,
    label: 'Tools',
    icon: Sparkles,
    protected: true,
    directorate: 'Logistics',
    description: 'Advanced utilities and scenario calculators.'
  },
  [ViewState.INFORMATION]: {
    id: ViewState.INFORMATION,
    label: 'Registry',
    icon: Info,
    directorate: 'Logistics',
    description: 'Institutional metadata and recurring commitments.'
  },
  [ViewState.SETTINGS]: {
    id: ViewState.SETTINGS,
    label: 'System',
    icon: Settings,
    directorate: 'Logistics',
    description: 'Infrastructure configuration and identity governance.'
  },
  [ViewState.PRIVACY]: {
    id: ViewState.PRIVACY,
    label: 'Privacy',
    icon: ShieldCheck,
    directorate: 'Legal',
    description: 'Security standards and local-first sovereignty.'
  },
  [ViewState.TERMS]: {
    id: ViewState.TERMS,
    label: 'Terms',
    icon: Scale,
    directorate: 'Legal',
    description: 'Service agreement and legal framework.'
  }
};

export const DIRECTORATES = [
  { id: 'Capital', icon: Activity },
  { id: 'Flow', icon: Layers },
  { id: 'Logistics', icon: Settings }
];
