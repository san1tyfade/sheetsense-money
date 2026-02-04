import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { server } from './mocks/server';

// MSW Lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

import { webcrypto } from 'node:crypto';

// Global shim for Crypto using Node's native WebCrypto
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto
});

// Mock for Window.location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    host: 'localhost',
    pathname: '/',
    search: '',
    reload: vi.fn(),
  },
  writable: true,
});

// Mock for GSI (Google Identity Services)
(window as any).google = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(() => ({
        requestAccessToken: vi.fn()
      }))
    }
  }
};
