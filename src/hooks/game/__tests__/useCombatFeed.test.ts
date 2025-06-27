import { renderHook } from '@testing-library/react';
import { useCombatFeed, combatFeedCache } from '../useCombatFeed';
import { LogType, CharacterClass } from '@/types/domain/enums';
import type { EventMessage } from '@/types/domain/dataFeed';

describe('useCombatFeed', () => {
  beforeEach(() => {
    // Clear cache before each test
    combatFeedCache.clear();
  });
  const mockEvents: EventMessage[] = [
    {
      logIndex: 1,
      blocknumber: 1000n,
      timestamp: Date.now(),
      type: LogType.Combat,
      attacker: {
        id: 'player-1',
        name: 'John',
        index: 1,
      },
      defender: {
        id: 'monster-1',
        name: 'Slime',
        index: 2,
      },
      areaId: 5n,
      isPlayerInitiated: true,
      details: {
        hit: true,
        critical: true,
        damageDone: 150,
      },
      displayMessage: 'John hits Slime for 150 damage.',
    },
    {
      logIndex: 2,
      blocknumber: 1001n,
      timestamp: Date.now() + 1000,
      type: LogType.EnteredArea,
      attacker: {
        id: 'player-2',
        name: 'Alice',
        index: 3,
      },
      areaId: 10n,
      isPlayerInitiated: false,
      details: {},
      displayMessage: 'Alice entered the area.',
    },
  ];

  it('should enrich logs correctly with player context', () => {
    const { result } = renderHook(() => useCombatFeed(mockEvents, 1));

    expect(result.current).toHaveLength(2);
    
    // First event should show "Alice" since playerIndex = 1 and attacker.index = 1
    expect(result.current[0].text).toContain('John');
    expect(result.current[0].text).toContain('critically strike');
    expect(result.current[0].text).toContain('**CRITICAL HIT!**');
    
    // Second event should show other player's name
    expect(result.current[1].text).toContain('Alice entered the area');
  });

  it('should enrich logs without player context', () => {
    const { result } = renderHook(() => useCombatFeed(mockEvents));

    expect(result.current).toHaveLength(2);
    
    // Without playerIndex, should show character names
    expect(result.current[0].text).not.toContain('You');
    expect(result.current[0].text).toContain('John');
    expect(result.current[1].text).toContain('Alice');
  });

  it('should handle empty logs array', () => {
    const { result } = renderHook(() => useCombatFeed([], 1));

    expect(result.current).toHaveLength(0);
  });

  it('should memoize results properly', () => {
    const { result, rerender } = renderHook(
      ({ logs, playerIndex }) => useCombatFeed(logs, playerIndex),
      {
        initialProps: { logs: mockEvents, playerIndex: 1 },
      }
    );

    const firstResult = result.current;

    // Re-render with same props
    rerender({ logs: mockEvents, playerIndex: 1 });
    
    // Should return same reference (memoized)
    expect(result.current).toBe(firstResult);
  });

  it('should update when logs change', () => {
    const { result, rerender } = renderHook(
      ({ logs, playerIndex }) => useCombatFeed(logs, playerIndex),
      {
        initialProps: { logs: mockEvents, playerIndex: 1 },
      }
    );

    const firstResult = result.current;

    const newEvents = [...mockEvents, {
      logIndex: 3,
      blocknumber: 1002n,
      timestamp: Date.now() + 2000,
      type: LogType.Chat,
      attacker: {
        id: 'player-1',
        name: 'John',
        index: 1,
      },
      areaId: 5n,
      isPlayerInitiated: true,
      details: {},
      displayMessage: 'Hello world!',
    }];

    // Re-render with new logs
    rerender({ logs: newEvents, playerIndex: 1 });
    
    // Should return new result
    expect(result.current).not.toBe(firstResult);
    expect(result.current).toHaveLength(3);
  });

  it('should update when playerIndex changes', () => {
    const { result, rerender } = renderHook(
      ({ logs, playerIndex }) => useCombatFeed(logs, playerIndex),
      {
        initialProps: { logs: mockEvents, playerIndex: 1 },
      }
    );

    const firstResult = result.current;

    // Re-render with different playerIndex
    rerender({ logs: mockEvents, playerIndex: 3 });
    
    // Should return new result
    expect(result.current).not.toBe(firstResult);
    
    // Now Alice (index 3) should be "Alice" 
    expect(result.current[1].text).toContain('Alice entered the area');
  });

  describe('caching behavior', () => {
    it('should cache enriched messages and reuse them', () => {
      // Initial cache should be empty
      expect(combatFeedCache.size()).toBe(0);

      // First render should populate cache
      const { result, rerender } = renderHook(() => useCombatFeed(mockEvents, 1));
      
      expect(result.current).toHaveLength(2);
      expect(combatFeedCache.size()).toBe(2); // Both events cached

      // Re-render with same props should use cache
      rerender();
      
      expect(result.current).toHaveLength(2);
      expect(combatFeedCache.size()).toBe(2); // No new cache entries
    });

    it('should create new cache entries for different contexts', () => {
      // Render with one context
      const { result: result1 } = renderHook(() => useCombatFeed(mockEvents, 1, 'sword'));
      
      expect(result1.current).toHaveLength(2);
      expect(combatFeedCache.size()).toBe(2);

      // Render with different weapon context
      const { result: result2 } = renderHook(() => useCombatFeed(mockEvents, 1, 'axe'));
      
      expect(result2.current).toHaveLength(2);
      expect(combatFeedCache.size()).toBe(4); // 2 new cache entries for different weapon context
    });

    it('should handle deterministic monster verbs consistently', () => {
      const monsterEvent: EventMessage = {
        logIndex: 5,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: {
          id: 'monster-1',
          name: 'Slime',
          index: 1, // Monster index 1
        },
        defender: {
          id: 'player-1',
          name: 'You',
          index: 2,
        },
        areaId: 5n,
        isPlayerInitiated: false,
        details: {
          hit: true,
          damageDone: 10,
        },
        displayMessage: 'Slime hits you for 10 damage.',
      };

      // First render
      const { result: result1 } = renderHook(() => useCombatFeed([monsterEvent], 2, undefined, undefined, 'TestPlayer'));
      const firstText = result1.current[0].text;

      // Second render should produce identical text due to caching
      const { result: result2 } = renderHook(() => useCombatFeed([monsterEvent], 2, undefined, undefined, 'TestPlayer'));
      const secondText = result2.current[0].text;

      expect(firstText).toBe(secondText);
      expect(firstText).toContain('Slime'); // Should show monster name
      
      // Cache should have 1 entry
      expect(combatFeedCache.size()).toBe(1);
    });

    it('should clear cache when requested', () => {
      // Populate cache
      renderHook(() => useCombatFeed(mockEvents, 1));
      expect(combatFeedCache.size()).toBe(2);

      // Clear cache
      combatFeedCache.clear();
      expect(combatFeedCache.size()).toBe(0);
    });
  });
});