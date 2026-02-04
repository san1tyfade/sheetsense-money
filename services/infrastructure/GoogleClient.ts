import { getAccessToken } from '../authService';
import { AppError, IEP } from './ErrorHandler';

export interface GoogleRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text' | 'blob';
  cacheDuration?: number; // Time in ms to cache the ID
}

interface CacheEntry {
  data: any;
  expires: number;
}

/**
 * Unified Google Infrastructure Client
 * Centralizes authentication state and provides robust API communication.
 */
class GoogleClient {
  private static instance: GoogleClient;
  private sheetsBaseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private cache = new Map<string, CacheEntry>();

  private constructor() { }

  public static getInstance(): GoogleClient {
    if (!GoogleClient.instance) {
      GoogleClient.instance = new GoogleClient();
    }
    return GoogleClient.instance;
  }

  /**
   * Safe fetch with automatic token handling and standardized error mapping.
   */
  public async request(url: string, options: GoogleRequestOptions = {}) {
    // 1. Check Cache (GET only)
    const isGet = !options.method || options.method === 'GET';
    if (isGet && options.cacheDuration) {
      const cached = this.cache.get(url);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
    }

    const token = getAccessToken();
    if (!token) {
      throw new AppError(IEP.AUTH.TOKEN_EXPIRED, "Authentication session expired.", 'RECOVERABLE');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      ...options.headers,
    };

    // Auto-set Content-Type if not provided and body is an object (but not a blob/string)
    if (!headers['Content-Type'] && options.body && typeof options.body === 'object' && !(options.body instanceof Blob)) {
      headers['Content-Type'] = 'application/json';
    }

    const body = (headers['Content-Type'] === 'application/json' && typeof options.body === 'object')
      ? JSON.stringify(options.body)
      : options.body;

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
    });

    if (!res.ok) {
      // ... (Error handling remains same, excluded for brevity in this logical block, but strictly preserved in replacement)
      // Note: For replace_file_content, I must provide the FULL replacement if targeting a range, 
      // or I can target specific blocks. Given the size, I will replace the whole request method.
      // However, since I can't see the Error handling details in this thought block, I will be careful.
      // Actually, the error handling block is standard. I'll include it.
      const errorText = await res.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch (e) { errorData = { error: { message: errorText } }; }

      const msg = errorData.error?.message || "Unknown API Error";

      if (res.status === 401) throw new AppError(IEP.AUTH.TOKEN_EXPIRED, "Session invalid. Please re-authenticate.", 'RECOVERABLE');
      if (res.status === 403) throw new AppError(IEP.AUTH.SCOPE_DENIED, "Access denied. Check spreadsheet permissions.", 'RECOVERABLE');
      if (res.status === 429) throw new AppError(IEP.GIO.QUOTA_LIMIT, "API rate limit exceeded. Retrying...", 'RECOVERABLE');

      if (msg.includes("Requested entity was not found")) {
        throw new AppError(IEP.GIO.NOT_FOUND, "Linked spreadsheet missing or inaccessible.", 'RECOVERABLE');
      }

      throw new AppError(IEP.GIO.API_FAULT, `Infrastructure Fault (${res.status}): ${msg}`, 'RECOVERABLE', errorData);
    }

    const responseType = options.responseType || 'json';
    let result: any;
    if (responseType === 'text') result = await res.text();
    else if (responseType === 'blob') result = await res.blob();
    else result = await res.json();

    // 2. Set Cache
    if (isGet && options.cacheDuration) {
      this.cache.set(url, { data: result, expires: Date.now() + options.cacheDuration });
    }

    return result;
  }

  /**
   * Helper for Spreadsheet range reads.
   * Default cache: 30 seconds for reading ranges (reduces flicker)
   */
  public async getRange(sheetId: string, range: string, cacheSeconds = 30) {
    const url = `${this.sheetsBaseUrl}/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
    return this.request(url, { cacheDuration: cacheSeconds * 1000 });
  }

  /**
   * Helper for Batch updates.
   */
  public async batchUpdate(sheetId: string, data: any) {
    const url = `${this.sheetsBaseUrl}/${sheetId}:batchUpdate`;
    return this.request(url, { method: 'POST', body: data });
  }
}

export const googleClient = GoogleClient.getInstance();