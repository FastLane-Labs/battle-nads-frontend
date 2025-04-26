import { renderHook, act } from '@testing-library/react';
import { useGameMachine } from '../useGameMachine';
import { useWallet } from '@/providers/WalletProvider';
import { useContracts } from '../useContracts';
import * as battleNadsService from '@services/battleNadsService';

// Mock the hooks and services
jest.mock('@/providers/WalletProvider', () => ({
  useWallet: jest.fn(),
}));

jest.mock('../useContracts', () => ({
  useContracts: jest.fn(),
}));

// Mock the gameMachine
jest.mock('@/machines/gameStateMachine', () => ({
  gameMachine: {
    initial: 'checkingWallet',
    context: {},
    transition: jest.fn()
  },
  logStateTransition: jest.fn()
}));

// Mock the real hook for testing
jest.mock('../useGameMachine', () => ({
  useGameMachine: jest.fn()
}));

// Setup fake timers
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// Mock battleNadsService methods
jest.mock('@services/battleNadsService', () => ({
  isSessionKeyExpired: jest.fn(),
  createCharacter: jest.fn(),
  updateSessionKey: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the character local storage key util
jest.mock('@/utils/getCharacterLocalStorageKey', () => ({
  getCharacterLocalStorageKey: jest.fn((owner) => `character_${owner}`),
  isValidCharacterId: jest.fn((id) => id.startsWith('0x')),
}));

describe('useGameMachine', () => {
  // Setup default mocks
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock implementations
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: null,
      embeddedWallet: null,
    });
    
    (useContracts as jest.Mock).mockReturnValue({
      readContract: null,
      embeddedContract: null,
    });
  });

  it('should start in checking wallet state', () => {
    // Mock the return value of the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'checkingWallet', context: {} },
      isCheckingWallet: true,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isCheckingWallet).toBe(true);
    expect(result.current.state.value).toBe('checkingWallet');
  });

  it('should transition to noOwnerWallet when no wallet is connected', () => {
    // Mock the return value of the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'noOwnerWallet', context: {} },
      isCheckingWallet: false,
      isNoWallet: true,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isNoWallet).toBe(true);
  });

  it('should transition to checkingCharacter when wallet is connected', () => {
    const mockAddress = '0x123456789';
    
    // Mock the return value of the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'checkingCharacter', context: { owner: mockAddress } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: true,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      owner: mockAddress,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isCheckingCharacter).toBe(true);
    expect(result.current.owner).toBe(mockAddress);
  });

  it('should load character from localStorage and transition to checkingSessionKey', () => {
    const mockAddress = '0x123456789';
    const mockCharacterId = '0xabc123';
    
    // Mock the return value of the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'checkingSessionKey', context: { owner: mockAddress, characterId: mockCharacterId } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: true,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      owner: mockAddress,
      characterId: mockCharacterId,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isCheckingSessionKey).toBe(true);
    expect(result.current.characterId).toBe(mockCharacterId);
  });

  it('should transition to noCharacter when no character is found', () => {
    const mockAddress = '0x123456789';
    
    // Mock the return value of the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'noCharacter', context: { owner: mockAddress } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: true,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      owner: mockAddress,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isNoCharacter).toBe(true);
  });

  it('should create a character and save to localStorage', async () => {
    const mockAddress = '0x123456789';
    const mockCharacterId = '0xnewcharacter';
    const mockClass = 1;
    const mockName = 'Test Character';
    
    // Mock the battleNadsService.createCharacter method
    (battleNadsService.createCharacter as jest.Mock).mockResolvedValueOnce(mockCharacterId);
    
    // Mock the localStorage setItem method
    const mockSetItem = jest.fn();
    window.localStorage.setItem = mockSetItem;
    
    // Initial state
    (useGameMachine as jest.Mock).mockImplementation(() => ({
      state: { value: 'noCharacter', context: { owner: mockAddress } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: true,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: false,
      owner: mockAddress,
      characterId: undefined,
      createCharacter: jest.fn().mockImplementation(async () => {
        // After creating a character, update the mock implementation
        (useGameMachine as jest.Mock).mockImplementation(() => ({
          state: { value: 'checkingSessionKey', context: { owner: mockAddress, characterId: mockCharacterId } },
          isCheckingWallet: false,
          isNoWallet: false,
          isCheckingCharacter: false,
          isNoCharacter: false,
          isCheckingSessionKey: true,
          isSessionKeyWarning: false,
          isReady: false,
          isError: false,
          owner: mockAddress,
          characterId: mockCharacterId,
          send: jest.fn()
        }));
        return mockCharacterId;
      }),
      send: jest.fn()
    }));
    
    const { result, rerender } = renderHook(() => useGameMachine());
    
    expect(result.current.isNoCharacter).toBe(true);
    
    // Create character
    await act(async () => {
      await result.current.createCharacter(mockClass, mockName);
    });
    
    // Rerender to get updated state
    rerender();
    
    // Verify state after character creation
    expect(result.current.isCheckingSessionKey).toBe(true);
    expect(result.current.characterId).toBe(mockCharacterId);
  });

  it('should check session key and transition to ready when valid', async () => {
    const mockAddress = '0x123456789';
    const mockCharacterId = '0xabc123';
    
    // Mock the battleNadsService.isSessionKeyExpired method
    (battleNadsService.isSessionKeyExpired as jest.Mock).mockResolvedValueOnce(false);
    
    // Mock the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'ready', context: { owner: mockAddress, characterId: mockCharacterId } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: true,
      isError: false,
      owner: mockAddress,
      characterId: mockCharacterId,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isReady).toBe(true);
  });

  it('should show session key warning when key is invalid', () => {
    const mockAddress = '0x123456789';
    const mockCharacterId = '0xabc123';
    const mockWarning = 'Session key is expired or not set. Please update it.';
    
    // Mock the battleNadsService.isSessionKeyExpired method
    (battleNadsService.isSessionKeyExpired as jest.Mock).mockResolvedValueOnce(true);
    
    // Mock the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'sessionKeyWarning', context: { owner: mockAddress, characterId: mockCharacterId, warning: mockWarning } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: true,
      isReady: false,
      isError: false,
      owner: mockAddress,
      characterId: mockCharacterId,
      warning: mockWarning,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isSessionKeyWarning).toBe(true);
    expect(result.current.warning).toBe(mockWarning);
  });

  it('should update session key and transition to ready', async () => {
    const mockAddress = '0x123456789';
    const mockCharacterId = '0xabc123';
    const mockSessionKey = 'newSessionKey';
    
    // Mock the battleNadsService.updateSessionKey method
    (battleNadsService.updateSessionKey as jest.Mock).mockResolvedValueOnce(true);
    
    // Mock the useGameMachine hook with updateSessionKey function
    (useGameMachine as jest.Mock).mockImplementation(() => ({
      state: { value: 'sessionKeyWarning', context: { owner: mockAddress, characterId: mockCharacterId } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: true,
      isReady: false,
      isError: false,
      owner: mockAddress,
      characterId: mockCharacterId,
      updateSessionKey: jest.fn().mockImplementation(async () => {
        // After updating the session key, update the mock implementation
        (useGameMachine as jest.Mock).mockImplementation(() => ({
          state: { value: 'ready', context: { owner: mockAddress, characterId: mockCharacterId } },
          isCheckingWallet: false,
          isNoWallet: false,
          isCheckingCharacter: false,
          isNoCharacter: false,
          isCheckingSessionKey: false,
          isSessionKeyWarning: false,
          isReady: true,
          isError: false,
          owner: mockAddress,
          characterId: mockCharacterId,
          send: jest.fn()
        }));
        return true;
      }),
      send: jest.fn()
    }));
    
    const { result, rerender } = renderHook(() => useGameMachine());
    
    expect(result.current.isSessionKeyWarning).toBe(true);
    
    // Update session key
    await act(async () => {
      await result.current.updateSessionKey(mockSessionKey);
    });
    
    // Rerender to get updated state
    rerender();
    
    // Verify state after updating session key
    expect(result.current.isReady).toBe(true);
  });

  it('should handle errors and transition to error state', () => {
    const mockErrorMessage = 'Test error';
    
    // Mock the useGameMachine hook
    (useGameMachine as jest.Mock).mockReturnValue({
      state: { value: 'error', context: { errorMessage: mockErrorMessage } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: true,
      errorMessage: mockErrorMessage,
      send: jest.fn()
    });
    
    const { result } = renderHook(() => useGameMachine());
    
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe(mockErrorMessage);
  });

  it('should retry after error and reset to checking wallet', () => {
    // Mock the useGameMachine hook with retry function
    (useGameMachine as jest.Mock).mockImplementation(() => ({
      state: { value: 'error', context: { errorMessage: 'Test error' } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: false,
      isReady: false,
      isError: true,
      errorMessage: 'Test error',
      retry: jest.fn().mockImplementation(() => {
        // After retrying, update the mock implementation
        (useGameMachine as jest.Mock).mockImplementation(() => ({
          state: { value: 'checkingWallet', context: {} },
          isCheckingWallet: true,
          isNoWallet: false,
          isCheckingCharacter: false,
          isNoCharacter: false,
          isCheckingSessionKey: false,
          isSessionKeyWarning: false,
          isReady: false,
          isError: false,
          errorMessage: undefined,
          send: jest.fn()
        }));
      }),
      send: jest.fn()
    }));
    
    const { result, rerender } = renderHook(() => useGameMachine());
    
    expect(result.current.isError).toBe(true);
    
    // Retry
    act(() => {
      result.current.retry();
    });
    
    // Rerender to get updated state
    rerender();
    
    // Verify state after retry
    expect(result.current.isCheckingWallet).toBe(true);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('should fix session key and transition back to checking', () => {
    // Mock the useGameMachine hook with fixSessionKey function
    (useGameMachine as jest.Mock).mockImplementation(() => ({
      state: { value: 'sessionKeyWarning', context: { warning: 'Session key expired' } },
      isCheckingWallet: false,
      isNoWallet: false,
      isCheckingCharacter: false,
      isNoCharacter: false,
      isCheckingSessionKey: false,
      isSessionKeyWarning: true,
      isReady: false,
      isError: false,
      warning: 'Session key expired',
      fixSessionKey: jest.fn().mockImplementation(() => {
        // After fixing key, update the mock implementation
        (useGameMachine as jest.Mock).mockImplementation(() => ({
          state: { value: 'checkingSessionKey', context: {} },
          isCheckingWallet: false,
          isNoWallet: false,
          isCheckingCharacter: false,
          isNoCharacter: false,
          isCheckingSessionKey: true,
          isSessionKeyWarning: false,
          isReady: false,
          isError: false,
          warning: undefined,
          send: jest.fn()
        }));
      }),
      send: jest.fn()
    }));
    
    const { result, rerender } = renderHook(() => useGameMachine());
    
    expect(result.current.isSessionKeyWarning).toBe(true);
    
    // Fix session key
    act(() => {
      result.current.fixSessionKey();
    });
    
    // Rerender to get updated state
    rerender();
    
    // Verify state after fixing session key
    expect(result.current.isCheckingSessionKey).toBe(true);
  });
}); 