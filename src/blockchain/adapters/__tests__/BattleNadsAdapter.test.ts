import { BattleNadsAdapter } from '../BattleNadsAdapter';
import { JsonRpcProvider, Signer, Contract, TransactionResponse } from 'ethers';
import { contract as ContractTypes } from '../../../types'; // Corrected relative path
import { GAS_LIMITS } from '../../../config/gas'; // Import GAS_LIMITS

// Mock ethers Contract methods globally for this suite
const mockContractMethods = {
  pollForFrontendData: jest.fn(),
  getCurrentSessionKeyData: jest.fn(),
  replenishGasBalance: jest.fn(),
  moveNorth: jest.fn(),
  moveSouth: jest.fn(),
  // Add other methods used by the adapter as needed
};
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    Contract: jest.fn().mockImplementation(() => mockContractMethods), // Return our mock methods
    JsonRpcProvider: jest.fn().mockImplementation(() => ({ // Keep provider mock minimal if needed
      getBlockNumber: jest.fn().mockResolvedValue(12345) // Example provider method
    })),
    // Signer mock might not be needed if only testing provider path
  };
});

describe('BattleNadsAdapter', () => {
  let mockProvider: jest.Mocked<JsonRpcProvider>;
  let adapter: BattleNadsAdapter;
  const CONTRACT_ADDRESS = '0xContractAddress';
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks(); 
    Object.values(mockContractMethods).forEach(mockFn => mockFn.mockReset());

    mockProvider = new JsonRpcProvider('') as jest.Mocked<JsonRpcProvider>;
    adapter = new BattleNadsAdapter(CONTRACT_ADDRESS, mockProvider);
    
    // Default mock resolutions (can be overridden in tests)
    mockContractMethods.pollForFrontendData.mockResolvedValue({}); 
    mockContractMethods.getCurrentSessionKeyData.mockResolvedValue({ key: '0x', expiration: 0n });
    mockContractMethods.replenishGasBalance.mockResolvedValue({} as TransactionResponse);
    mockContractMethods.moveNorth.mockResolvedValue({} as TransactionResponse);
    mockContractMethods.moveSouth.mockResolvedValue({} as TransactionResponse);
  });
  
  // Removed afterEach clearAllMocks as it's done in beforeEach
  
  describe('pollFrontendData', () => { // Renamed from getUiSnapshot
    it('calls contract.pollForFrontendData with correct parameters', async () => {
      const owner = '0xOwnerAddress';
      const startBlock = 100n; // Use bigint
      
      await adapter.pollFrontendData(owner, startBlock);
      
      expect(mockContractMethods.pollForFrontendData).toHaveBeenCalledWith(
        owner,
        startBlock
      );
    });
    
    // This test becomes less relevant as transformation is assumed inside the contract call/ethers
    // Keep if adapter *did* transformation, but it doesn't seem to.
    // If PollFrontendDataReturn type uses bigint, ethers v6 handles it.
    /*
    it('returns data with correct types', async () => {
      mockContractMethods.pollForFrontendData.mockResolvedValueOnce({
        characterID: '0x123',
        balanceShortfall: 1000000000000000000n, // Assuming return type uses bigint
        unallocatedAttributePoints: 5n,
        character: { stats: { health: 85 } }, // Check actual type structure
        endBlock: 150n
      } as ContractTypes.PollFrontendDataReturn);
      
      const result = await adapter.pollFrontendData('0xOwner', 0n);
      
      expect(result.balanceShortfall).toBe(1000000000000000000n);
      expect(result.unallocatedAttributePoints).toBe(5n);
      expect(result.endBlock).toBe(150n);
    });
    */

    it('handles null characterID', async () => {
      mockContractMethods.pollForFrontendData.mockResolvedValueOnce({
        characterID: null, // Assuming type allows null
        // Include other required fields from PollFrontendDataReturn
        balanceShortfall: 0n, 
        unallocatedAttributePoints: 0n,
        character: null, // Assuming character can be null
        endBlock: 0n,
        // Add other required fields
      } /* as ContractTypes.PollFrontendDataReturn */); // Cast might be needed depending on mock details
      
      const result = await adapter.pollFrontendData('0xOwner', 0n);
      
      expect(result.characterID).toBeNull();
    });
  });
  
  describe('getCurrentSessionKeyData', () => {
    it('calls contract.getCurrentSessionKeyData with correct parameters', async () => {
      const owner = '0xOwnerAddress';
      
      await adapter.getCurrentSessionKeyData(owner);
      
      expect(mockContractMethods.getCurrentSessionKeyData).toHaveBeenCalledWith(owner);
    });
    
    it('returns correct data structure', async () => {
      const mockReturn: ContractTypes.SessionKeyData = {
        owner: '0xOwner',
        key: '0xSessionKey',
        balance: 1000n,
        targetBalance: 2000n,
        ownerCommittedAmount: 500n,
        ownerCommittedShares: 100n,
        expiration: 9999999n,
      };
      mockContractMethods.getCurrentSessionKeyData.mockResolvedValueOnce(mockReturn);
      
      const result = await adapter.getCurrentSessionKeyData('0xOwner');
      
      expect(result).toEqual(mockReturn);
      expect(typeof result.expiration).toBe('bigint');
      expect(result.expiration).toBe(9999999n);
      // Remove assertion for result.balance
    });
  });
  
  describe('replenishGasBalance', () => {
    it('calls contract.replenishGasBalance with correct parameters', async () => {
      const value = 1000000000000000000n; // 1 ETH
      
      await adapter.replenishGasBalance(value); // Pass value directly
      
      // Expect the contract method to be called with the options object
      expect(mockContractMethods.replenishGasBalance).toHaveBeenCalledWith({
        gasLimit: GAS_LIMITS.sessionKey, // Expect specific gas limit
        value: value 
      });
    });
  });
  
  describe('Movement', () => { // Group movement tests
    it('calls correct contract method for movement directions', async () => {
      const characterId = '0x123';
      
      await adapter.moveNorth(characterId);
      expect(mockContractMethods.moveNorth).toHaveBeenCalledWith(
        characterId,
        { gasLimit: GAS_LIMITS.move } // Expect specific gas limit
      );
      
      await adapter.moveSouth(characterId);
      expect(mockContractMethods.moveSouth).toHaveBeenCalledWith(
        characterId,
        { gasLimit: GAS_LIMITS.move } // Expect specific gas limit
      );
      
      // Add tests for other directions (moveEast, moveWest, etc.) if desired
    });
    
    // Remove test for invalid direction as moveCharacter doesn't exist
  });
}); 