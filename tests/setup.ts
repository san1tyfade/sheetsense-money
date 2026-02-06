import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { server } from './mocks/server';

// MSW Lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Global shim for Crypto
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random(),
    subtle: {
      digest: async () => new Uint8Array(32).buffer
    }
  },
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
