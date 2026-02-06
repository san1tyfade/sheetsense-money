import { http, HttpResponse } from 'msw';

// Mock data representing a standard Sheetsense Spreadsheet
const MOCK_ASSETS_CSV = `Name,Category,Value,Currency,As Of
Checking Account,Cash,5000,CAD,2023-10-01
Savings,Cash,10000,CAD,2023-10-01
Bitcoin Portfolio,Crypto,0.5,BTC,2023-10-01`;

const MOCK_RATES = {
  amount: 1.0,
  base: 'CAD',
  date: '2023-10-01',
  rates: {
    USD: 0.74,
    EUR: 0.69
  }
};

export const handlers = [
  // Intercept Frankfurter FX API
  http.get('https://api.frankfurter.app/latest', () => {
    return HttpResponse.json(MOCK_RATES);
  }),

  // Intercept Google Sheets Data Fetch
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/:range', ({ params }) => {
    const range = decodeURIComponent(params.range as string);
    
    // Return different CSVs based on the requested tab
    if (range.includes('Assets')) {
      return HttpResponse.json({ values: MOCK_ASSETS_CSV.split('\n').map(line => line.split(',')) });
    }

    return HttpResponse.json({ values: [] });
  }),

  // Intercept Google Drive Metadata (for Discovery)
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:sheetId', () => {
    return HttpResponse.json({
      sheets: [
        { properties: { title: 'Assets' } },
        { properties: { title: 'Income' } },
        { properties: { title: 'Trades' } }
      ]
    });
  })
];
