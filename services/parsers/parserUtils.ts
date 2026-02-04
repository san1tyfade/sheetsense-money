export const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const MONTH_NAMES_TITLED = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Generates a unique identifier for parsed entities.
 */
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Normalizes strings by trimming and collapsing multiple spaces.
 */
export const normalizeText = (str: string): string => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Normalizes header strings for comparison by removing non-alphanumeric chars.
 */
export const normalizeHeader = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Standardized date objects to local ISO format (YYYY-MM-DD).
 */
export const formatDateToLocalISO = (dateObj: Date): string => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Splits a CSV line while respecting quoted strings containing commas.
 */
export const parseCSVLine = (line: string): string[] => {
  if (!line) return [];
  if (!line.includes('"')) return line.split(',').map(v => v.trim());
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  const len = line.length;
  for (let i = 0; i < len; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
};

/**
 * Canonical Numeric Sanitizer.
 */
export const parseNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  let clean = String(val).trim();
  if (!clean) return 0;
  
  if (clean.startsWith('(') && clean.endsWith(')')) {
      clean = '-' + clean.slice(1, -1);
  }
  
  clean = clean.replace(/[^0-9.\-]/g, '');
  
  const parts = clean.split('.');
  if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * Attempt to parse various date formats into YYYY-MM-DD.
 */
export const parseFlexibleDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 2) return null; 
    const cleanStr = dateStr.trim();
    if (cleanStr.toLowerCase().includes('yyyy-mm-dd')) return null;
    
    const isoMatch = cleanStr.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1]);
        const m = parseInt(isoMatch[2]);
        const d = parseInt(isoMatch[3]);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return formatDateToLocalISO(new Date(y, m - 1, d));
    }
    
    const monthYearMatch = cleanStr.match(/^([A-Za-z]{3})[\-\/](\d{2,4})$/);
    if (monthYearMatch) {
        const mStr = monthYearMatch[1].toLowerCase();
        const yStr = monthYearMatch[2];
        const mIdx = MONTH_NAMES.indexOf(mStr);
        if (mIdx !== -1) {
            const y = yStr.length === 2 ? 2000 + parseInt(yStr) : parseInt(yStr);
            return formatDateToLocalISO(new Date(y, mIdx, 1));
        }
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) return formatDateToLocalISO(d);
    return null;
};

/**
 * Two-pass Column Index Resolver.
 * Pass 1: Strict exact matching across all keywords.
 * Pass 2: Loose partial matching for longer keywords only.
 */
export const resolveColumnIndex = (headers: string[], keys: string[]): number => {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  const normalizedKeys = keys.map(k => normalizeHeader(k));

  // Pass 1: Exact matches
  for (const normKey of normalizedKeys) {
    const idx = normalizedHeaders.indexOf(normKey);
    if (idx !== -1) return idx;
  }

  // Pass 2: Partial matches (only for keys > 3 chars to avoid false positives like 'side')
  for (const normKey of normalizedKeys) {
    if (normKey.length < 4) continue;
    const idx = normalizedHeaders.findIndex(h => h.includes(normKey));
    if (idx !== -1) return idx;
  }

  return -1;
};

export const isSafeKey = (key: string) => {
    const forbidden = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'toLocaleString', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'];
    return !!key && !forbidden.includes(key.trim());
};

export const normalizeTicker = (ticker: string): string => {
  if (!ticker) return 'UNKNOWN';
  let clean = ticker.toUpperCase().trim();
  
  if (clean === 'BITCOIN') return 'BTC';
  if (clean === 'ETHEREUM') return 'ETH';
  if (clean === 'SOLANA') return 'SOL';
  if (clean === 'CARDANO') return 'ADA';
  
  if (clean.includes('(')) {
      const match = clean.match(/\(([^)]+)\)/);
      if (match) return match[1].toUpperCase().trim();
      clean = clean.replace(/\s*\(.*?\)\s*/g, '');
  }
  
  clean = clean.replace(/\.(TO|V|NE|UN|CN|NX)$/i, '');

  if (clean.length > 2 && (clean.includes('-') || clean.includes('/') || clean.includes(':'))) {
      const parts = clean.split(/[\-\/:]/);
      if (parts.length > 0 && parts[0].length > 1) {
          const first = parts[0].toUpperCase();
          const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'LTC', 'AVAX', 'LINK', 'MATIC', 'USDT', 'USDC'];
          if (cryptos.includes(first)) return first;
          clean = parts[0];
      }
  }
  
  return clean.trim();
};

export const detectTickerCurrency = (ticker: string, context?: string): string => {
    const t = (ticker || '').toUpperCase().trim();
    const tNorm = normalizeTicker(t);
    const ctx = (context || '').toUpperCase();

    // 1. Priority Suffixes
    if (t.endsWith('.TO') || t.endsWith('.V') || t.endsWith('.NE') || t.endsWith('.CN') || t.endsWith('-CAD')) return 'CAD';
    if (t.endsWith('-USD')) return 'USD';
    
    // 2. Crypto Assets (Priced in USD by default in global APIs)
    const cryptos = [
        'BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'LTC', 'AVAX', 'LINK', 
        'MATIC', 'USDT', 'USDC', 'BNB', 'SHIB', 'TRX', 'UNI', 'ATOM', 'XMR', 
        'ETC', 'BCH', 'FIL', 'NEAR', 'ALGO', 'ICP', 'VET', 'SAND', 'MANA', 'AAVE', 'EOS'
    ];
    if (cryptos.includes(tNorm)) return 'USD';

    // 3. Canadian Registered Account Context
    // If we are in TFSA/RRSP/FHSA, 99% of untagged tickers are CAD
    const isCanadianAccount = ['TFSA', 'RRSP', 'FHSA', 'RESP', 'LIRA', 'QUESTRADE', 'WEALTHSIMPLE'].some(a => ctx.includes(a));
    if (isCanadianAccount) return 'CAD';

    // 4. US-Specific Known Symbols (Aggressive match for US-only giants)
    const usGiants = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.B'];
    if (usGiants.includes(tNorm)) return 'USD';

    // 5. Fallback Heuristic
    // For Sheetsense Pro, we assume CAD unless it's a 1-4 letter ticker with no CA context
    if (t.length <= 4 && !t.includes('.')) {
        // If it's 2 letters (like TD, RY, CN) and we aren't sure, CAD is a safer default 
        // for Canadian users of this app. Only return USD for clearly non-CA contexts.
        if (t.length <= 2) return 'CAD'; 
        return 'USD';
    }

    return 'CAD'; 
};