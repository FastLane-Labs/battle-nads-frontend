/**
 * Tests for contract change detection functionality
 */

import { 
  hasContractChanged, 
  updateStoredContractAddress,
  clearPreviousContractData,
  handleContractChange 
} from '../contractChangeDetection';

// Mock the environment config
jest.mock('../../config/env', () => ({
  ENTRYPOINT_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678'
}));

// Mock the database
jest.mock('../../lib/db', () => ({
  db: {
    dataBlocks: {
      clear: jest.fn().mockResolvedValue(5)
    },
    characters: {
      clear: jest.fn().mockResolvedValue(2)
    }
  }
}));

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Helper to clean up localStorage between tests
const cleanupLocalStorage = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('battleNads:')) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
};

describe('contractChangeDetection', () => {
  beforeEach(() => {
    cleanupLocalStorage();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupLocalStorage();
  });

  describe('hasContractChanged', () => {
    it('should return false when no previous contract is stored (first run)', () => {
      const result = hasContractChanged();
      expect(result).toBe(false);
    });

    it('should return false when stored contract matches current contract', () => {
      localStorage.setItem('battleNads:currentContract', '0x1234567890abcdef1234567890abcdef12345678');
      const result = hasContractChanged();
      expect(result).toBe(false);
    });

    it('should return true when stored contract differs from current contract', () => {
      localStorage.setItem('battleNads:currentContract', '0xdifferentcontractaddress12345678');
      const result = hasContractChanged();
      expect(result).toBe(true);
    });

    it('should handle case differences correctly', () => {
      localStorage.setItem('battleNads:currentContract', '0x1234567890ABCDEF1234567890ABCDEF12345678');
      const result = hasContractChanged();
      expect(result).toBe(false);
    });
  });

  describe('updateStoredContractAddress', () => {
    it('should store the current contract address in localStorage', () => {
      updateStoredContractAddress();
      const stored = localStorage.getItem('battleNads:currentContract');
      expect(stored).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('clearPreviousContractData', () => {
    it('should clear character data from localStorage and IndexedDB data', async () => {
      // Setup some test data
      localStorage.setItem('battleNads:character:0xcontract:0xuser1', 'char1');
      localStorage.setItem('battleNads:character:0xcontract:0xuser2', 'char2');
      localStorage.setItem('someOtherKey', 'shouldRemain');

      // Verify setup
      expect(localStorage.getItem('battleNads:character:0xcontract:0xuser1')).toBe('char1');

      await clearPreviousContractData();

      // Check that battleNads character keys were removed
      expect(localStorage.getItem('battleNads:character:0xcontract:0xuser1')).toBeNull();
      expect(localStorage.getItem('battleNads:character:0xcontract:0xuser2')).toBeNull();
      
      // Check that other keys remain
      expect(localStorage.getItem('someOtherKey')).toBe('shouldRemain');

      // Check that IndexedDB was cleared
      const { db } = require('../../lib/db');
      expect(db.dataBlocks.clear).toHaveBeenCalled();
      expect(db.characters.clear).toHaveBeenCalled();
    });
  });

  describe('handleContractChange', () => {
    it('should return false and update stored address when no change detected', async () => {
      localStorage.setItem('battleNads:currentContract', '0x1234567890abcdef1234567890abcdef12345678');
      
      const result = await handleContractChange();
      
      expect(result).toBe(false);
      expect(localStorage.getItem('battleNads:currentContract')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should return true and perform cleanup when change detected', async () => {
      localStorage.setItem('battleNads:currentContract', '0xoldcontract');
      localStorage.setItem('battleNads:character:0xoldcontract:0xuser1', 'char1');
      
      const result = await handleContractChange();
      
      expect(result).toBe(true);
      expect(localStorage.getItem('battleNads:character:0xoldcontract:0xuser1')).toBeNull();
      expect(localStorage.getItem('battleNads:currentContract')).toBe('0x1234567890abcdef1234567890abcdef12345678');
      
      const { db } = require('../../lib/db');
      expect(db.dataBlocks.clear).toHaveBeenCalled();
      expect(db.characters.clear).toHaveBeenCalled();
    });

    it('should handle first run correctly', async () => {
      const result = await handleContractChange();
      
      expect(result).toBe(false);
      expect(localStorage.getItem('battleNads:currentContract')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });
});