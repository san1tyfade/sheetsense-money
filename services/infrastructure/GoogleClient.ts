import { getAccessToken } from '../authService';
import { AppError, IEP } from './ErrorHandler';

export interface GoogleRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text' | 'blob';
}

/**
 * Unified Google Infrastructure Client
 * Centralizes authentication state and provides robust API communication.
 */
class GoogleClient {
  private static instance: GoogleClient;
  private sheetsBaseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  private constructor() { }

  public static getInstance(): GoogleClient {
    if (!GoogleClient.instance) {
      GoogleClient.instance = new GoogleClient();
    }
    return GoogleClient.instance;
  }

  /**
   * Constructs a standard range string: 'TabName'!A1:ZZ
   */
  public formatRange(tabName: string, cell: string = 'A1:ZZ'): string {
    return `'${tabName}'!${cell}`;
  }

  /**
   * Safe fetch with automatic token handling and standardized error mapping.
   */
  public async request(url: string, options: GoogleRequestOptions = {}) {
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
    if (responseType === 'text') return res.text();
    if (responseType === 'blob') return res.blob();
    return res.json();
  }

  /**
   * Helper for Spreadsheet range reads.
   */
  public async getRange(sheetId: string, range: string) {
    const r = encodeURIComponent(range);
    const url = `${this.sheetsBaseUrl}/${sheetId}/values/${r}?valueRenderOption=FORMATTED_VALUE`;
    return this.request(url);
  }

  /**
   * Helper for Appending rows.
   */
  public async appendRange(sheetId: string, tabName: string, values: any[][]) {
    const range = encodeURIComponent(`'${tabName}'!A:Z`);
    const url = `${this.sheetsBaseUrl}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    return this.request(url, { method: 'POST', body: { values } });
  }

  /**
   * Helper for Updating specific range.
   */
  public async updateRange(sheetId: string, range: string, values: any[][]) {
    const r = encodeURIComponent(range);
    const url = `${this.sheetsBaseUrl}/${sheetId}/values/${r}?valueInputOption=USER_ENTERED`;
    return this.request(url, { method: 'PUT', body: { values } });
  }

  /**
    * Helper for Batch Value Updates.
    */
  public async batchUpdateValues(sheetId: string, data: { range: string, values: any[][] }[]) {
    const url = `${this.sheetsBaseUrl}/${sheetId}/values:batchUpdate`;
    return this.request(url, { method: 'POST', body: { valueInputOption: 'USER_ENTERED', data } });
  }

  /**
   * Helper for Spreadsheet Structural Batch Updates.
   */
  public async batchUpdate(sheetId: string, requests: any[]) {
    const url = `${this.sheetsBaseUrl}/${sheetId}:batchUpdate`;
    return this.request(url, { method: 'POST', body: { requests } });
  }

  /**
   * Helper for Fetching Metadata.
   */
  public async getMetadata(sheetId: string, fields?: string) {
    const fieldParam = fields ? `?fields=${fields}` : '';
    const url = `${this.sheetsBaseUrl}/${sheetId}${fieldParam}`;
    return this.request(url);
  }
}

export const googleClient = GoogleClient.getInstance();