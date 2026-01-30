
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { server } from './mocks/server';
import crypto from 'node:crypto';

// MSW Lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Crypto Polyfill for JSDOM
 * Standard subtle crypto is missing in the JSDOM environment used by Vitest.
 * We map the modern Node.js webcrypto implementation to the global object.
 */
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = crypto.webcrypto;
}

if (!globalThis.crypto.subtle && crypto.webcrypto.subtle) {
  // @ts-ignore
  globalThis.crypto.subtle = crypto.webcrypto.subtle;
}

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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
