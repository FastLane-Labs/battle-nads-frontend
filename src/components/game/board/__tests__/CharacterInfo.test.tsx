import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CharacterInfo from '../CharacterInfo';
import { domain } from '@/types'; // Assuming types are exported from domain
import { useEquipment } from '@/hooks/game/useEquipment'; // Import the hook

// Mock the useEquipment hook
jest.mock('@/hooks/game/useEquipment', () => ({
  useEquipment: jest.fn(),
}));

// Helper function to setup the mock implementation for useEquipment
const setupMockUseEquipment = (character: domain.Character) => {
  (useEquipment as jest.Mock).mockReturnValue({
    currentWeapon: character.weapon,
    currentArmor: character.armor,
    weaponOptions: [], // Mocking empty options for simplicity in this test
    armorOptions: [],  // Mocking empty options for simplicity in this test
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

// Mock Data
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
  isInCombat: false,
  isDead: false,
};

const mockSingleCombatant: domain.CharacterLite[] = [
  { id: 'combatant1', index: 2, name: 'Goblin', class: domain.CharacterClass.Basic, level: 3, health: 30, maxHealth: 30, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Club', armorName: 'Loincloth', isDead: false },
];

const mockMultipleCombatants: domain.CharacterLite[] = [
  { id: 'combatant1', index: 2, name: 'Goblin', class: domain.CharacterClass.Basic, level: 3, health: 30, maxHealth: 30, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Club', armorName: 'Loincloth', isDead: false },
  { id: 'combatant2', index: 3, name: 'Skeleton', class: domain.CharacterClass.Basic, level: 4, health: 40, maxHealth: 40, buffs: [], debuffs: [], ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 }, weaponName: 'Rusty Sword', armorName: 'None', isDead: false },
];

// Helper to render with ChakraProvider
const renderWithProvider = (component: React.ReactElement) => {
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

    expect(screen.getByText(mockCharacter.name)).toBeInTheDocument();
    expect(screen.getByText(`Level ${mockCharacter.level}`)).toBeInTheDocument();
    expect(screen.getByText(`${mockCharacter.health} / ${mockCharacter.maxHealth}`)).toBeInTheDocument();
    expect(screen.getByText(String(mockCharacter.stats.strength))).toBeInTheDocument();
    expect(screen.getByText(mockCharacter.weapon.name)).toBeInTheDocument();
    expect(screen.getByText(mockCharacter.armor.name)).toBeInTheDocument();
    // ... add more checks for other stats/info if needed
  });

  it('should not display combat indicator when combatants array is empty', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    expect(screen.queryByText(/Fighting:/)).not.toBeInTheDocument();
  });

  it('should display combat indicator with single combatant name', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={mockSingleCombatant} />);

    // Use regex to ignore surrounding icons/whitespace
    const indicator = screen.getByText(/Fighting: Goblin/i);
    expect(indicator).toBeInTheDocument();
    // Check if it's inside a badge with the correct style
    expect(indicator.closest('span[class*="chakra-badge"]')).toHaveStyle('background-color: var(--chakra-colors-red-600)');
  });

  it('should display combat indicator with multiple combatants count', () => {
    // Re-setup mock if combatants affect equipment display logic (e.g., isInCombat)
    const combatCharacter = { ...mockCharacter, isInCombat: true };
    setupMockUseEquipment(combatCharacter); // Ensure isInCombat is true for this test

    renderWithProvider(<CharacterInfo character={combatCharacter} combatants={mockMultipleCombatants} />);

    // Use regex to ignore surrounding icons/whitespace
    const indicator = screen.getByText(/Fighting: Multiple Enemies \(2\)/i); // Escape parentheses
    expect(indicator).toBeInTheDocument();
    expect(indicator.closest('span[class*="chakra-badge"]')).toHaveStyle('background-color: var(--chakra-colors-red-600)');
  });
}); 