import { validateSessionKey } from '../sessionKeyValidation';
import { SessionKeyState } from '@/types/domain/session';

describe('validateSessionKey', () => {
  const mockOwnerAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const currentBlock = 1000;

  it('should return INVALID when session key data is undefined', () => {
    const result = validateSessionKey(undefined, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.INVALID);
    expect(result.message).toBe('No session key found');
    expect(result.data).toBeUndefined();
  });

  it('should return INVALID when session key data has no key', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '1500'
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.INVALID);
    expect(result.message).toBe('No session key found');
  });

  it('should return MISMATCHED when session key owner does not match', () => {
    const sessionKeyData = {
      owner: '0xdifferentowner1234567890abcdef1234567890ab',
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '1500'
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.MISMATCHED);
    expect(result.message).toBe('Session key wallet mismatch');
    expect(result.data).toBe(sessionKeyData);
  });

  it('should be case-insensitive when comparing owner addresses', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress.toUpperCase(),
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '1500'
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress.toLowerCase(), currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.data).toBe(sessionKeyData);
  });

  it('should return EXPIRED when session key is expired', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '500' // Expired (500 < 1000)
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.EXPIRED);
    expect(result.message).toBe('Session key expired');
    expect(result.data).toBe(sessionKeyData);
  });

  it('should return EXPIRED when session key expires exactly at current block', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '1000' // Expires exactly at current block
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.EXPIRED);
    expect(result.message).toBe('Session key expired');
    expect(result.data).toBe(sessionKeyData);
  });

  it('should return VALID when all conditions are met', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '1500' // Valid (1500 > 1000)
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.message).toBeUndefined();
    expect(result.data).toBe(sessionKeyData);
  });

  it('should handle session key data without expiry', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: undefined as any // No expiry
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.data).toBe(sessionKeyData);
  });

  it('should handle numeric expiry values', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: 1500 as any // Numeric expiry
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.data).toBe(sessionKeyData);
  });

  it('should convert string expiry to number for comparison', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiry: '999' // String that converts to number less than currentBlock
    };

    const result = validateSessionKey(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.EXPIRED);
    expect(result.message).toBe('Session key expired');
  });
});