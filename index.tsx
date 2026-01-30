import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FinancialProvider } from './context/FinancialContext';
import { GlobalIntegrityGuard } from './components/core-ui/GlobalIntegrityGuard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalIntegrityGuard>
      <FinancialProvider>
        <App />
      </FinancialProvider>
    </GlobalIntegrityGuard>
  </React.StrictMode>
);
