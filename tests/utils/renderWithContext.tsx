import React from 'react';
import { render } from '@testing-library/react';
import { ProtocolProvider } from '../../context/ProtocolContext';
import { InterfaceProvider } from '../../context/InterfaceContext';
import { LedgerProvider } from '../../context/LedgerContext';

const DEFAULT_SETTINGS = {
  sheetConfig: {
    sheetId: 'test-sheet-id',
    clientId: 'test-client-id',
    tabNames: { 
      assets: 'Assets', investments: 'Investments', trades: 'Trades', 
      subscriptions: 'Subscriptions', accounts: 'Institutions', 
      logData: 'logdata', portfolioLog: 'portfoliolog', debt: 'debt', 
      income: 'Income', expenses: 'Expenses', journal: 'journal' 
    }
  }
};

/**
 * renderWithContext
 * Wraps the target component in the full Sheetsense context stack.
 * Allows passing initial state overrides via providers if needed.
 */
export function renderWithContext(ui: React.ReactElement) {
  return render(
    <ProtocolProvider defaultSettings={DEFAULT_SETTINGS}>
      <InterfaceProvider>
        <LedgerProvider>
          {ui}
        </LedgerProvider>
      </InterfaceProvider>
    </ProtocolProvider>
  );
}