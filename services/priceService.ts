
// Mapping of common tickers to CoinGecko API IDs
const COINGECKO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'BITCOIN': 'bitcoin',
  'ETH': 'ethereum',
  'ETHEREUM': 'ethereum',
  'SOL': 'solana',
  'SOLANA': 'solana',
  'ADA': 'cardano',
  'CARDANO': 'cardano',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'DOGECOIN': 'dogecoin',
  'DOT': 'polkadot',
  'POLKADOT': 'polkadot',
  'LTC': 'litecoin',
  'LITECOIN': 'litecoin',
  'AVAX': 'avalanche-2',
  'AVALANCHE': 'avalanche-2',
  'LINK': 'chainlink',
  'CHAINLINK': 'chainlink',
  'MATIC': 'matic-network',
  'POLYGON': 'matic-network',
  'USDT': 'tether',
  'TETHER': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XMR': 'monero',
  'ETC': 'ethereum-classic',
  'BCH': 'bitcoin-cash',
  'FIL': 'filecoin',
  'NEAR': 'near',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'VET': 'vechain',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AAVE': 'aave',
  'EOS': 'eos',
  'HBAR': 'hedera-hashgraph',
  'PEPE': 'pepe',
  'RNDR': 'render-token',
  'STX': 'blockstack',
  'GRT': 'the-graph',
  'MKR': 'maker',
  'OP': 'optimism',
  'ARB': 'arbitrum'
};

interface CacheEntry {
  price: number;
  timestamp: number;
}

// In-memory cache for live prices
const PRICE_CACHE: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

import { getAppDB } from './infrastructure/DatabaseProvider';

/**
 * INDEXED DB FOR PERSISTENT HISTORICAL BENCHMARKS
 */


/**
 * Fetches live prices for a list of tickers.
 * Returns native price (USD for US stocks/Crypto, CAD for Canadian stocks).
 */
export const fetchLivePrices = async (tickers: string[]): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  const now = Date.now();

  const uniqueRequested = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickersToFetch: string[] = [];

  uniqueRequested.forEach(ticker => {
    const cacheKey = `${ticker}_native`;
    const cached = PRICE_CACHE[cacheKey];
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      prices[ticker] = cached.price;
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return prices;

  const cryptoToFetch: string[] = [];
  const stocksToFetch: string[] = [];

  tickersToFetch.forEach(t => {
    if (COINGECKO_MAP[t]) cryptoToFetch.push(t);
    else if (t && t !== 'UNKNOWN' && !t.includes('DOLLAR')) stocksToFetch.push(t);
  });

  const promises = [];

  if (cryptoToFetch.length > 0) {
    promises.push((async () => {
      try {
        const idsToFetch = cryptoToFetch.map(t => COINGECKO_MAP[t]);
        const idsParam = idsToFetch.join(',');
        // Fetch crypto in USD as it's the standard for our valuation logic
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          cryptoToFetch.forEach(t => {
            const id = COINGECKO_MAP[t];
            if (data[id] && data[id].usd) {
              const price = data[id].usd;
              prices[t] = price;
              PRICE_CACHE[`${t}_native`] = { price, timestamp: now };
            }
          });
        }
      } catch (e) { console.warn("Crypto price fetch failed", e); }
    })());
  }

  if (stocksToFetch.length > 0) {
    promises.push((async () => {
      try {
        const symbols = stocksToFetch.join(',');
        const targetUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice&formatted=false&_rnd=${now}`;
        const proxyUrl = "https://api.allorigins.win/raw?url=";
        const res = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);

        if (res.ok) {
          const data = await res.json();
          const quotes = data.quoteResponse?.result || [];
          quotes.forEach((q: any) => {
            const symbol = q.symbol.toUpperCase();
            if (q.regularMarketPrice) {
              const price = q.regularMarketPrice;
              prices[symbol] = price;
              PRICE_CACHE[`${symbol}_native`] = { price, timestamp: now };
            }
          });
        }
      } catch (e) { console.warn("Stock price fetch failed", e); }
    })());
  }

  await Promise.all(promises);
  return prices;
};

/**
 * Fetches historical price series for a ticker with aggressive IndexedDB caching.
 */
export const fetchHistoricalPrices = async (ticker: string, startDate: string): Promise<{ date: string, price: number }[]> => {
  const db = await getAppDB();
  const cacheKey = `hist_${ticker}`;

  // 1. Check persistent cache
  const cachedData = await new Promise<any[]>((resolve) => {
    const tx = db.transaction('app_state', 'readonly');
    const store = tx.objectStore('app_state');
    const req = store.get(cacheKey);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const lastCachedDate = cachedData.length > 0 ? cachedData[cachedData.length - 1].date : '1970-01-01';

  // 2. If cache is fresh and covers the range, return it
  if (lastCachedDate === todayStr && cachedData[0]?.date <= startDate) {
    return cachedData.filter(d => d.date >= startDate);
  }

  // 3. Otherwise, fetch from Yahoo with optimal interval
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(Date.now() / 1000);

  const daysDiff = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  const interval = daysDiff > 120 ? '1wk' : '1d';

  const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=${interval}`;
  const proxyUrl = "https://api.allorigins.win/raw?url=";

  try {
    const res = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
    if (!res.ok) return cachedData.filter(d => d.date >= startDate);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return cachedData.filter(d => d.date >= startDate);

    const timestamps = result.timestamp || [];
    const prices = result.indicators?.quote?.[0]?.close || [];

    const newSeries = timestamps.map((ts: number, i: number) => {
      const d = new Date(ts * 1000);
      return {
        date: d.toISOString().split('T')[0],
        price: prices[i] || prices[i - 1] || 0
      };
    }).filter((p: any) => p.price > 0);

    // 4. Persist to cache
    const tx = db.transaction('app_state', 'readwrite');
    const store = tx.objectStore('app_state');
    store.put(newSeries, cacheKey);

    return newSeries;
  } catch (e) {
    console.warn("Historical fetch failed, using cache", e);
    return cachedData.filter(d => d.date >= startDate);
  }
};
