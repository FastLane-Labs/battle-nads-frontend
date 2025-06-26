import { renderHook } from '@testing-library/react';
import { useCombatFeed } from '../useCombatFeed';
import { LogType, CharacterClass } from '@/types/domain/enums';
import type { EventMessage } from '@/types/domain/dataFeed';

describe('useCombatFeed', () => {
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
    
    // First event should show "You" since playerIndex = 1 and attacker.index = 1
    expect(result.current[0].text).toContain('You');
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
    
    // Now Alice (index 3) should be "You" 
    expect(result.current[1].text).toContain('You entered the area');
  });
});