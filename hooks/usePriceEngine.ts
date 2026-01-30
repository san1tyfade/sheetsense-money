import { useState, useEffect, useRef } from 'react';
import { fetchLivePrices } from '../services/priceService';

/**
 * Manages live price polling with built-in caching.
 * Fetches native prices (USD for US stocks/Crypto, CAD for Canadian stocks).
 */
export const usePriceEngine = (tickers: string[], pollIntervalMs: number = 60000) => {
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});
    const [isFetching, setIsFetching] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const prevTickersRef = useRef<string[]>([]);

    useEffect(() => {
        const tickerString = JSON.stringify([...tickers].sort());
        const prevTickerString = JSON.stringify(prevTickersRef.current);
        
        if (tickers.length === 0) return;
        
        const updatePrices = async () => {
            setIsFetching(true);
            try {
                // We no longer pass PRIMARY_CURRENCY to ensure we get the native quote
                const newPrices = await fetchLivePrices(tickers);
                setLivePrices(prev => ({ ...prev, ...newPrices }));
                setLastUpdated(new Date());
            } catch (e) {
                console.error("Price Engine: Update failed", e);
            } finally {
                setIsFetching(false);
            }
        };

        // Trigger on mount or ticker change
        if (tickerString !== prevTickerString) {
            updatePrices();
            prevTickersRef.current = [...tickers].sort();
        }

        const interval = setInterval(updatePrices, pollIntervalMs);
        return () => clearInterval(interval);
    }, [tickers, pollIntervalMs]);

    return { livePrices, isFetching, lastUpdated };
};