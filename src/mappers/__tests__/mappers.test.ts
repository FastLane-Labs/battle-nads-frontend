import mockPollData from './__fixtures__/pollFrontendData.json';

// Import the mappers
// Note: Update these import paths based on your actual implementation
import { contractToWorldSnapshot } from '../index';

// Mock the worldSnapshotToGameState function since we can't access it
jest.mock('../index', () => ({
  contractToWorldSnapshot: jest.requireActual('../index').contractToWorldSnapshot,
  worldSnapshotToGameState: jest.fn().mockImplementation((snapshot) => ({
    player: {
      id: snapshot.character?.id,
      equipment: {
        weapon: snapshot.character?.weapon,
        armor: snapshot.character?.armor,
      },
      healthPercentage: 85,
      isInCombat: false
    },
    area: {
      entities: []
    },
    inventory: {
      weapons: [],
      armors: []
    }
  }))
}));

describe('Data Mappers', () => {
  describe('contractToWorldSnapshot', () => {
    it('should process character data correctly', () => {
      // Use type assertion to bypass strict type checking for tests
      const result = contractToWorldSnapshot(mockPollData as any, '0xOwnerAddress');
      
      // Basic assertions that focus on functionality
      expect(result).toBeDefined();
      expect(result?.characterID).toBe(mockPollData.characterID);
      expect(result?.sessionKeyData?.key).toBe(mockPollData.sessionKeyData.key);
    });
  });
}); 