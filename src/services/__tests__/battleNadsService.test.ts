import { 
  pollFrontendData, 
  createCharacter, 
  moveCharacter
} from '../battleNadsService';
import { CharacterClass } from '@/types/gameTypes';

// Mock the contract interface
const mockContract = {
  pollForFrontendData: jest.fn(),
  createCharacter: jest.fn(),
  moveNorth: jest.fn(),
  moveSouth: jest.fn(),
  moveEast: jest.fn(),
  moveWest: jest.fn(),
  moveUp: jest.fn(),
  moveDown: jest.fn(),
};

describe('battleNadsService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Set default implementations
    mockContract.pollForFrontendData.mockResolvedValue({
      characterID: '0x123',
      character: { name: 'Test Character' },
      combatants: [],
      noncombatants: [],
    });
    
    mockContract.createCharacter.mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [{ 
          fragment: { name: 'CharacterCreated' },
          args: { characterID: '0x123' } 
        }],
      }),
    });
    
    mockContract.moveNorth.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
    mockContract.moveSouth.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
    mockContract.moveEast.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
    mockContract.moveWest.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
    mockContract.moveUp.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
    mockContract.moveDown.mockResolvedValue({
      wait: jest.fn().mockResolvedValue(true),
    });
  });
  
  describe('pollFrontendData', () => {
    it('should call the contract with the owner address', async () => {
      const owner = '0xowner';
      const params = { owner, startBlock: 0 };
      
      // When we don't provide an owner in the test, we'll use this default
      const result = await pollFrontendData(mockContract as any, params);
      
      expect(mockContract.pollForFrontendData).toHaveBeenCalledWith(owner, 0);
      expect(result).toEqual({
        characterID: '0x123',
        character: { name: 'Test Character' },
        combatants: [],
        noncombatants: [],
      });
    });
    
    it('should throw an error if owner is not provided', async () => {
      // We'll explicitly set owner to null in this test
      const params = { owner: null as any, startBlock: 0 };
      
      // Use a try/catch pattern to validate the error
      let error: Error | null = null;
      try {
        await pollFrontendData(mockContract as any, params);
      } catch (err) {
        error = err as Error;
      }
      
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Owner address is required');
      expect(mockContract.pollForFrontendData).not.toHaveBeenCalled();
    });
    
    it('should return data from the contract', async () => {
      const mockData = {
        characterID: '0x456',
        character: { name: 'Another Character' },
        combatants: [{ id: '1' }],
        noncombatants: [{ id: '2' }],
      };
      mockContract.pollForFrontendData.mockResolvedValue(mockData);
      
      const result = await pollFrontendData(mockContract as any, { owner: '0xowner', startBlock: 100 });
      
      expect(mockContract.pollForFrontendData).toHaveBeenCalledWith('0xowner', 100);
      expect(result).toEqual(mockData);
    });
  });
  
  describe('createCharacter', () => {
    it('should call the contract with character class and name', async () => {
      const result = await createCharacter(
        mockContract as any,
        CharacterClass.Warrior,
        'Test Character'
      );
      
      expect(mockContract.createCharacter).toHaveBeenCalledWith(
        CharacterClass.Warrior,
        'Test Character'
      );
      expect(result).toBe('0x123');
    });
    
    it('should handle case when no ID is returned', async () => {
      mockContract.createCharacter.mockResolvedValue({
        wait: jest.fn().mockResolvedValue({
          logs: [], // No logs, no ID
        }),
      });
      
      let error: Error | null = null;
      try {
        await createCharacter(
          mockContract as any,
          CharacterClass.Warrior,
          'Test Character'
        );
      } catch (err) {
        error = err as Error;
      }
      
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('no ID was returned');
    });
  });
  
  describe('moveCharacter', () => {
    it('should call moveNorth when direction is north', async () => {
      const result = await moveCharacter(mockContract as any, 'north');
      
      expect(mockContract.moveNorth).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should call moveSouth when direction is south', async () => {
      const result = await moveCharacter(mockContract as any, 'south');
      
      expect(mockContract.moveSouth).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should call moveEast when direction is east', async () => {
      const result = await moveCharacter(mockContract as any, 'east');
      
      expect(mockContract.moveEast).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should call moveWest when direction is west', async () => {
      const result = await moveCharacter(mockContract as any, 'west');
      
      expect(mockContract.moveWest).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should call moveUp when direction is up', async () => {
      const result = await moveCharacter(mockContract as any, 'up');
      
      expect(mockContract.moveUp).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should call moveDown when direction is down', async () => {
      const result = await moveCharacter(mockContract as any, 'down');
      
      expect(mockContract.moveDown).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
}); 