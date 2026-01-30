export const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const MONTH_NAMES_TITLED = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * generateId: Atomically generates a unique identifier for local entities.
 */
export const generateId = () => crypto.randomUUID();

/**
 * Normalizes header strings for comparison by removing non-alphanumeric chars.
 */
export const normalizeHeader = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

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
  if (clean.startsWith('(') && clean.endsWith(')')) clean = '-' + clean.slice(1, -1);
  clean = clean.replace(/[^0-9.\-]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * Heuristic: Scans rows to find the header line based on keyword density.
 */
export const findHeaderRowIndex = (lines: string[][], keywords: string[], threshold: number = 2): number => {
  const normalizedKeywords = keywords.map(normalizeHeader);
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const row = lines[i].map(normalizeHeader);
    const hitCount = normalizedKeywords.filter(k => row.some(cell => cell.includes(k))).length;
    if (hitCount >= threshold) return i;
  }
  return -1;
};

/**
 * Heuristic: Checks if a row contains multiple dates in its secondary columns.
 */
export const isMonthlyHeaderRow = (row: string[], parser: (v: string) => any): boolean => {
    let dateCount = 0;
    for (let c = 1; c < Math.min(row.length, 14); c++) {
        if (parser(row[c])) dateCount++;
    }
    return dateCount >= 2;
};

export const resolveColumnIndex = (headers: string[], keys: string[]): number => {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedKeys = keys.map(normalizeHeader);
  for (const normKey of normalizedKeys) {
    const idx = normalizedHeaders.indexOf(normKey);
    if (idx !== -1) return idx;
  }
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
  if (clean.includes('(')) {
      const match = clean.match(/\(([^)]+)\)/);
      if (match) return match[1].toUpperCase().trim();
  }
  clean = clean.replace(/\.(TO|V|NE|UN|CN|NX)$/i, '');
  return clean.trim();
};

export const detectTickerCurrency = (ticker: string, context?: string): string => {
    const t = (ticker || '').toUpperCase().trim();
    if (t.endsWith('.TO') || t.endsWith('.V') || t.endsWith('.NE') || t.endsWith('-CAD')) return 'CAD';
    if (t.endsWith('-USD')) return 'USD';
    const isCanadianAccount = ['TFSA', 'RRSP', 'FHSA', 'RESP', 'LIRA'].some(a => (context || '').toUpperCase().includes(a));
    if (isCanadianAccount) return 'CAD';
    return 'USD';
};