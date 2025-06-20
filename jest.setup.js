// jest.setup.js
// This will extend Jest's expect functionality with Testing Library's custom matchers.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add Buffer polyfill for ethers.js
global.Buffer = Buffer;

// Mock IncomingMessage for ethers.js
global.IncomingMessage = class IncomingMessage {
  constructor() {
    this.headers = {};
    this.statusCode = 200;
  }
};

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
  
  get length() {
    return Object.keys(this.store).length;
  }
  
  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
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

// Enhanced fetch mock for ethers.js compatibility
global.fetch = jest.fn((url, options) => {
  // Handle ethers.js RPC calls
  if (typeof url === 'string' && (url.includes('rpc') || url.includes('json'))) {
    return Promise.resolve({
      json: () => Promise.resolve({
        jsonrpc: "2.0",
        result: "0x0",
        id: 1
      }),
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"jsonrpc":"2.0","result":"0x0","id":1}'),
      headers: new Map(),
      clone: () => ({
        json: () => Promise.resolve({
          jsonrpc: "2.0",
          result: "0x0",
          id: 1
        }),
        text: () => Promise.resolve('{"jsonrpc":"2.0","result":"0x0","id":1}'),
      })
    });
  }
  
  // Default fetch response
  return Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
    headers: new Map(),
    clone: () => ({
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  });
});

// Mock crypto
global.crypto = {
  subtle: {
    digest: jest.fn(),
  },
  getRandomValues: jest.fn((arr) => {
    // Fill with dummy values
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
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

// Mock ethers.js network requests
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: jest.fn().mockResolvedValue(12345),
      getBlock: jest.fn().mockResolvedValue({ number: 12345, timestamp: Date.now() }),
      call: jest.fn().mockResolvedValue('0x0'),
      send: jest.fn().mockResolvedValue('0x0'),
    })),
  };
}); 