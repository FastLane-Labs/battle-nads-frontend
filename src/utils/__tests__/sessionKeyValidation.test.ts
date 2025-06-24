import { validateSessionKeyData } from '../sessionKeyValidation';
import { SessionKeyState } from '@/types/domain/session';

describe('validateSessionKeyData', () => {
  const mockOwnerAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const currentBlock = 1000;

  it('should return MISSING when session key data is undefined', () => {
    const result = validateSessionKeyData(undefined, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.MISSING);
    expect(result.message).toBe('No session key found');
    expect(result.data).toBeUndefined();
  });

  it('should return MISSING when session key data has no key', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiration: '1500'
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.MISSING);
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
      expiration: '1500'
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.MISMATCHED);
    expect(result.message).toBe('Session key owner mismatch');
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
      expiration: '1500'
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress.toLowerCase(), currentBlock);
    
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
      expiration: '500' // Expired (500 < 1000)
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
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
      expiration: '1000' // Expires exactly at current block
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
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
      expiration: '1500' // Valid (1500 > 1000)
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.message).toBeUndefined();
    expect(result.data).toBe(sessionKeyData);
  });

  it('should handle session key data without expiration', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiration: undefined as any // No expiration
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.data).toBe(sessionKeyData);
  });

  it('should handle numeric expiration values', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiration: 1500 as any // Numeric expiration
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.VALID);
    expect(result.data).toBe(sessionKeyData);
  });

  it('should convert string expiration to number for comparison', () => {
    const sessionKeyData = {
      owner: mockOwnerAddress,
      key: '0xsessionkey1234567890abcdef1234567890abcd',
      balance: '1000',
      targetBalance: '2000',
      ownerCommittedAmount: '500',
      ownerCommittedShares: '10',
      expiration: '999' // String that converts to number less than currentBlock
    };

    const result = validateSessionKeyData(sessionKeyData, mockOwnerAddress, currentBlock);
    
    expect(result.state).toBe(SessionKeyState.EXPIRED);
    expect(result.message).toBe('Session key expired');
  });
});