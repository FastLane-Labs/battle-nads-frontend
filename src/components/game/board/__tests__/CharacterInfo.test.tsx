import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CharacterInfo from '../CharacterInfo';
import { domain } from '@/types'; // Assuming types are exported from domain
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState'; // Import the hook

// Mock the useSimplifiedGameState hook that CharacterInfo now uses
jest.mock('@/hooks/game/useSimplifiedGameState', () => ({
  useSimplifiedGameState: jest.fn(),
}));

// Mock the EquipmentPanel component since it's not the focus of this test
jest.mock('@/components/game/equipment/EquipmentPanel', () => ({
  EquipmentPanel: function MockEquipmentPanel() {
    return <div data-testid="equipment-panel">Equipment</div>;
  },
}));

// Mock Data - Character with some unallocated points for testing
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
  stats: { strength: 10, vitality: 8, dexterity: 5, quickness: 6, sturdiness: 7, luck: 4, experience: 1300, unspentAttributePoints: 0 },
  weapon: { id: 1, name: 'Sword', baseDamage: 10, bonusDamage: 2, accuracy: 90, speed: 10 },
  armor: { id: 1, name: 'Leather Armor', armorFactor: 5, armorQuality: 5, flexibility: 8, weight: 10 },
  position: { x: 1, y: 1, depth: 1 },
  areaId: 0x0000000000000000000000000000000000000000000000000000000000010101n,
  owner: '0x123',
  activeTask: '0x0',
  ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '0x0', targetBlock: 0 },
  inventory: { weaponBitmap: 0, armorBitmap: 0, balance: 1000000000000000000, weaponIDs: [], armorIDs: [], weaponNames: [], armorNames: [] },
  movementOptions: { canMoveNorth: true, canMoveSouth: true, canMoveEast: true, canMoveWest: true, canMoveUp: false, canMoveDown: false },
  isInCombat: false,
  isDead: false,
};

// Helper function to setup useSimplifiedGameState mock
const setupMockUseGameState = (unallocatedAttributePoints: number = 0, isInCombat: boolean = false) => {
  (useSimplifiedGameState as jest.Mock).mockReturnValue({
    worldSnapshot: {
      unallocatedAttributePoints,
      // Add other properties that might be needed
    },
    allocatePoints: jest.fn().mockResolvedValue({}),
    isAllocatingPoints: false,
    isInCombat,
    // Add other properties returned by useGameState that might be needed
    character: mockCharacter,
    combatants: [],
    isLoading: false,
    error: null,
  });
};

// Helper function to render with providers
const renderWithProvider = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
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
  beforeEach(() => {
    setupMockUseGameState();
  });

  it('should render character details correctly', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Check for stats section
    expect(screen.getByText('Stats')).toBeInTheDocument();
    
    // Check for character class display
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    
    // Check for stat values - find the STR label first, then its container, then the value
    const strLabel = screen.getByText('STR');
    const strContainer = strLabel.closest('.flex');
    expect(strContainer).toHaveTextContent(String(Number(mockCharacter.stats.strength)));
    
    // Check for other stats
    expect(screen.getByText('VIT')).toBeInTheDocument();
    expect(screen.getByText('DEX')).toBeInTheDocument();
    expect(screen.getByText('QCK')).toBeInTheDocument();
    expect(screen.getByText('STD')).toBeInTheDocument();
    expect(screen.getByText('LCK')).toBeInTheDocument();
    
    // Check for Equipment section (mocked)
    expect(screen.getByTestId('equipment-panel')).toBeInTheDocument();
    
    // Check for Level section (replaces Experience heading)
    expect(screen.getByText(`Level ${Number(mockCharacter.level)}`)).toBeInTheDocument();
    
    // Check for experience values - should show XP within current level / level range format
    // Level 5 character with 1300 total XP should show 150 / 625 (XP within level 5 / level 5 range)
    expect(screen.getByText((content, element) => {
      return content.includes('150') && content.includes('/') && content.includes('625');
    })).toBeInTheDocument();
    
    // Check for Gold section
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('should display stat allocation UI when unallocated points are available', () => {
    // Setup mock with unallocated points
    setupMockUseGameState(5);
    
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Should show the level up notification
    expect(screen.getByTestId('level-up-notification')).toBeInTheDocument();
    expect(screen.getByTestId('level-up-banner')).toBeInTheDocument();
    expect(screen.getByTestId('attribute-points-label')).toBeInTheDocument();
    
    // Should show the available points count
    expect(screen.getByTestId('attribute-points-count')).toHaveTextContent('5');
    
    // Should show increment/decrement buttons for each stat
    const incrementButtons = screen.getAllByRole('button', { name: '+' });
    const decrementButtons = screen.getAllByRole('button', { name: '-' });
    
    // 6 stats = 6 increment buttons and 6 decrement buttons
    expect(incrementButtons).toHaveLength(6);
    expect(decrementButtons).toHaveLength(6);
  });

  it('should not display stat allocation UI when no unallocated points are available', () => {
    // Setup mock with no unallocated points
    setupMockUseGameState(0);
    
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Should NOT show the level up notification
    expect(screen.queryByTestId('level-up-notification')).not.toBeInTheDocument();
    expect(screen.queryByTestId('level-up-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attribute-points-label')).not.toBeInTheDocument();
    
    // Should NOT show increment/decrement buttons
    expect(screen.queryByRole('button', { name: '+' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '-' })).not.toBeInTheDocument();
  });

  it('should not display combat indicator when combatants array is empty', () => {
    renderWithProvider(<CharacterInfo character={mockCharacter} combatants={[]} />);

    // Combat indicators are now handled in GameView, not CharacterInfo
    expect(screen.queryByText(/Fighting:/)).not.toBeInTheDocument();
  });
}); 