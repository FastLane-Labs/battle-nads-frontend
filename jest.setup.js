// jest.setup.js
import '@testing-library/jest-dom';
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
});

// Console error/warn mocks for cleaner test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // error: jest.fn(),
  // warn: jest.fn(),
  // log: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  })
);

// Mock crypto
global.crypto = {
  subtle: {
    digest: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

// Mock @privy-io/react-auth
jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn().mockReturnValue({
    authenticated: true,
    ready: true,
    user: { id: 'test-user-id' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
  useWallets: jest.fn().mockReturnValue({
    wallets: [],
    ready: true,
  }),
  useSendTransaction: jest.fn().mockReturnValue({
    sendTransaction: jest.fn(),
    error: null,
    isPending: false,
  }),
})); 