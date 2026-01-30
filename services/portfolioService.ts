import { Investment, Trade } from '../types';
import { normalizeTicker, detectTickerCurrency } from './deterministicUtils';

/**
 * Reconciles static Investment data from Sheets with dynamic Trade data.
 * Logic: Final Quantity = (Sum of Sheet Quantities) + (Net Trade Volume)
 */
export const reconcileInvestments = (investments: Investment[], trades: Trade[]): Investment[] => {
    // 1. Map net trade activity by ticker
    const tradeHoldings = new Map<string, number>();
    trades.forEach(t => {
        const qty = Math.abs(t.quantity || 0);
        if (qty === 0) return;
        const ticker = normalizeTicker(t.ticker);
        const type = (t.type || 'BUY').toUpperCase().trim();
        tradeHoldings.set(ticker, (tradeHoldings.get(ticker) || 0) + (type === 'BUY' ? qty : -qty));
    });

    const result: Investment[] = [];
    const invByTicker = new Map<string, Investment[]>();
    
    // Group spreadsheet investments by ticker
    investments.forEach(inv => {
       const t = normalizeTicker(inv.ticker);
       if (!invByTicker.has(t)) invByTicker.set(t, []);
       invByTicker.get(t)?.push(inv);
    });

    // 2. Process tickers found in the spreadsheet
    invByTicker.forEach((invs, ticker) => {
        const netTradeQty = tradeHoldings.get(ticker) || 0;
        const totalSheetQty = invs.reduce((sum, i) => sum + i.quantity, 0);

        if (totalSheetQty === 0) {
            // If sheet has a placeholder with 0 qty, add all trades to the first entry
            invs.forEach((inv, idx) => {
                result.push({ ...inv, quantity: idx === 0 ? netTradeQty : 0 });
            });
        } else {
            // Distribute trades proportionally across accounts holding this ticker
            invs.forEach((inv) => {
                const ratio = inv.quantity / totalSheetQty;
                result.push({ ...inv, quantity: inv.quantity + (netTradeQty * ratio) });
            });
        }
        // Remove from trade map so we know which are "New/Derived" tickers
        tradeHoldings.delete(ticker);
    });

    // 3. Process tickers ONLY found in Trades (New positions not yet in spreadsheet)
    tradeHoldings.forEach((netQty, ticker) => {
        if (Math.abs(netQty) < 0.000001) return; // Ignore fully closed new positions
        
        result.push({
            id: `derived-${ticker}`,
            ticker,
            name: ticker,
            quantity: netQty,
            avgPrice: 0,
            currentPrice: 0, // Will be resolved by live price engine
            accountName: 'Trade Derived',
            assetClass: 'Other',
            nativeCurrency: detectTickerCurrency(ticker)
        });
    });

    return result;
};