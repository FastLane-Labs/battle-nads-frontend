import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CharacterInfo from '../CharacterInfo';
import { domain } from '@/types'; // Assuming types are exported from domain
import { useEquipment } from '@/hooks/game/useEquipment'; // Import the hook
import { useBattleNads } from '@/hooks/game/useBattleNads'; // Import the hook

// Mock the useBattleNads hook using Jest
jest.mock('@/hooks/game/useBattleNads', () => ({
  useBattleNads: jest.fn(),
}));

// Mock the useEquipment hook using Jest
jest.mock('@/hooks/game/useEquipment', () => ({
  useEquipment: jest.fn(),
}));

// Helper function to setup the mock implementation for useEquipment
const setupMockUseEquipment = (character: domain.Character) => {
  (useEquipment as jest.Mock).mockReturnValue({
    currentWeapon: character.weapon,
    currentArmor: character.armor,
    equipableWeapons: [],
    equipableArmors: [],
    equipWeapon: jest.fn(),
    isEquippingWeapon: false,
    weaponError: null,
    equipArmor: jest.fn(),
    isEquippingArmor: false,
    armorError: null,
    getWeaponName: jest.fn().mockResolvedValue('Mocked Weapon Name'),
    getArmorName: jest.fn().mockResolvedValue('Mocked Armor Name'),
    isInCombat: character.isInCombat,
  });
};

// Restore inline Mock Data
const mockCharacter: domain.Character = {
  id: 'char1',
  index: 1,
  name: 'Hero',
  class: domain.CharacterClass.Warrior,
  level: 5,
  health: 85,
  maxHealth: 100,
  buffs: [],
  debuffs: [],
  stats: { strength: 10, vitality: 8, dexterity: 5, quickness: 6, sturdiness: 7, luck: 4, experience: 550, unspentAttributePoints: 0 },
  weapon: { id: 1, name: 'Sword', baseDamage: 10, bonusDamage: 2, accuracy: 90, speed: 10 },
  armor: { id: 1, name: 'Leather Armor', armorFactor: 5, armorQuality: 5, flexibility: 8, weight: 10 },
  position: { x: 1, y: 1, depth: 1 },
  owner: '0x123',
  activeTask: '0x0',
  ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 },
  inventory: { weaponBitmap: 0, armorBitmap: 0, balance: 1000000000000000000, weaponIDs: [], armorIDs: [], weaponNames: [], armorNames: [] },
  movementOptions: { canMoveNorth: true, canMoveSouth: true, canMoveEast: true, canMoveWest: true, canMoveUp: false, canMoveDown: false },
  isInCombat: false,
  isDead: false,
};

// Mock Data
const mockSingleCombatant: domain.CharacterLite[] = [
  { id: 'combatant1', index: 2, name: 'Goblin', class: domain.CharacterClass.Basic, level: 3, health: 30, maxHealth: 30, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Club', armorName: 'Loincloth', isDead: false },
];

const mockMultipleCombatants: domain.CharacterLite[] = [
  { id: 'combatant1', index: 2, name: 'Goblin', class: domain.CharacterClass.Basic, level: 3, health: 30, maxHealth: 30, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Club', armorName: 'Loincloth', isDead: false },
  { id: 'combatant2', index: 3, name: 'Skeleton', class: domain.CharacterClass.Basic, level: 4, health: 40, maxHealth: 40, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Rusty Sword', armorName: 'None', isDead: false },
];

// Helper function to render with providers and mock setup
const renderWithProvider = (component: React.ReactElement, mockGameState: Partial<ReturnType<typeof useBattleNads>> = {}, mockEquipmentState: Partial<ReturnType<typeof useEquipment>> = {}) => {
  // Default mocks
  const defaultGameState: ReturnType<typeof useBattleNads> = {
    gameState: null,
    addOptimisticChatMessage: jest.fn(),
    rawSessionKeyData: undefined,
    rawEndBlock: 0n,
    rawBalanceShortfall: 0n,
    isLoading: false,
    isSnapshotLoading: false,
    isHistoryLoading: false,
    error: null,
    // Provide default empty arrays for equipment to prevent crashes
    rawEquipableWeaponIDs: [],
    rawEquipableWeaponNames: [],
    rawEquipableArmorIDs: [],
    rawEquipableArmorNames: [],
    ...mockGameState,
  };

  const defaultEquipmentState: ReturnType<typeof useEquipment> = {
    currentWeapon: null,
    currentArmor: null,
    equipableWeapons: [],
    equipableArmors: [],
    equipWeapon: jest.fn(),
    isEquippingWeapon: false,
    weaponError: null,
    equipArmor: jest.fn(),
    isEquippingArmor: false,
    armorError: null,
    getWeaponName: jest.fn().mockResolvedValue('Mocked Weapon Name'),
    getArmorName: jest.fn().mockResolvedValue('Mocked Armor Name'),
    isInCombat: false,
  };

  // Create a new QueryClient instance for each test to ensure isolation
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ turns retries off
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>{component}</ChakraProvider>
    </QueryClientProvider>
  );
};

describe('CharacterInfo Component', () => {
  // Setup the mock before each test
  beforeEach(() => {
    setupMockUseEquipment(mockCharacter);
  });

  it('should render character details correctly', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Character name and level are now displayed in GameView header, not CharacterInfo
    // So we test what's actually in CharacterInfo: stats, equipment, experience, gold
    
    // Check for stats section
    expect(screen.getByText('Stats')).toBeInTheDocument();
    
    // Check for stats more specifically - find the STR label first, then its parent, then the value within
    const strLabel = screen.getByText('STR');
    const strContainer = strLabel.closest('.flex');
    expect(strContainer).toHaveTextContent(String(Number(mockCharacter.stats.strength)));
    
    // Check for Equipment section
    expect(screen.getByText('Equipment')).toBeInTheDocument();
    
    // Verify equipment buttons are present
    const buttons = screen.getAllByRole('button');
    // At least one button should have a div with Weapon aria-label
    expect(buttons.some(button => {
      const div = button.querySelector('div[aria-label="Weapon"]');
      return div !== null;
    })).toBe(true);
    
    // At least one button should have a div with Armor aria-label
    expect(buttons.some(button => {
      const div = button.querySelector('div[aria-label="Armor"]');
      return div !== null;
    })).toBe(true);
    
    // Check for Experience section
    expect(screen.getByText('Experience')).toBeInTheDocument();
    
    // Check for experience values
    expect(screen.getByText((content, element) => {
      return content.includes(`${Number(mockCharacter.stats.experience)}`) && 
             content.includes('/');
    })).toBeInTheDocument();
    
    // Check for Gold section
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('should not display combat indicator when combatants array is empty', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Combat indicators are now handled in GameView, not CharacterInfo
    expect(screen.queryByText(/Fighting:/)).not.toBeInTheDocument();
  });

  // Removed combat indicator tests since they're now handled in GameView component
  // The combat indicator logic has been moved to GameView's character header and actions tab
}); 