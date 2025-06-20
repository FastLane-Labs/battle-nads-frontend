// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you when using Next.js)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@machines/(.*)$': '<rootDir>/src/machines/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    
    // Map jose to its CJS build - solution from jose maintainer
    "^jose$": "<rootDir>/node_modules/jose/dist/node/cjs/index.js",
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1.js"
  },
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    // Use babel-jest to transpile tests with the next/babel preset
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // By default, node_modules are ignored—whitelist ESM packages that need transpiling
  transformIgnorePatterns: [
    '/node_modules/(?!(@privy-io/react-auth|@privy-io/js-sdk-core|viem|ofetch|ethers)/)'
  ],
  // Add Node.js globals for ethers.js compatibility
  globals: {
    'process.env': {
      NODE_ENV: 'test'
    }
  },
  // Increase timeout for async tests
  testTimeout: 10000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 