import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdates } from '../useOptimisticUpdates';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-' + Math.random())
}));

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should add optimistic update', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id = result.current.addOptimisticUpdate('chat', { message: 'Hello' });
      expect(id).toBeTruthy();
    });

    expect(result.current.updates).toHaveLength(1);
    expect(result.current.updates[0].type).toBe('chat');
    expect(result.current.updates[0].data).toEqual({ message: 'Hello' });
  });

  it('should remove optimistic update', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    let updateId: string;
    act(() => {
      updateId = result.current.addOptimisticUpdate('chat', { message: 'Hello' });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      result.current.removeOptimisticUpdate(updateId!);
    });

    expect(result.current.updates).toHaveLength(0);
  });

  it('should handle timeout rollback strategy', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'Hello' }, {
        rollbackStrategy: 'timeout',
        timeoutDuration: 1000
      });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.updates).toHaveLength(0);
  });

  it('should handle explicit rollback', () => {
    const { result } = renderHook(() => useOptimisticUpdates());
    const onRollback = jest.fn();

    let updateId: string;
    act(() => {
      updateId = result.current.addOptimisticUpdate('ability', { ability: 1 }, {
        rollbackStrategy: 'explicit',
        onRollback
      });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      result.current.rollback(updateId!);
    });

    expect(result.current.updates).toHaveLength(0);
    expect(onRollback).toHaveBeenCalled();
  });

  it('should filter updates by type', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'Hello' });
      result.current.addOptimisticUpdate('ability', { ability: 1 });
      result.current.addOptimisticUpdate('chat', { message: 'World' });
    });

    const chatUpdates = result.current.getUpdatesByType('chat');
    expect(chatUpdates).toHaveLength(2);
    expect(chatUpdates[0].data).toEqual({ message: 'Hello' });
    expect(chatUpdates[1].data).toEqual({ message: 'World' });

    const abilityUpdates = result.current.getUpdatesByType('ability');
    expect(abilityUpdates).toHaveLength(1);
    expect(abilityUpdates[0].data).toEqual({ ability: 1 });
  });

  it('should rollback all updates by type', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'Hello' });
      result.current.addOptimisticUpdate('ability', { ability: 1 });
      result.current.addOptimisticUpdate('chat', { message: 'World' });
    });

    expect(result.current.updates).toHaveLength(3);

    act(() => {
      result.current.rollbackByType('chat');
    });

    expect(result.current.updates).toHaveLength(1);
    expect(result.current.updates[0].type).toBe('ability');
  });

  it('should handle deduplication', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id1 = result.current.addOptimisticUpdate('chat', { id: 'msg-1', text: 'Hello' }, {
        deduplicationKey: (data) => data.id
      });
      expect(id1).toBeTruthy();

      const id2 = result.current.addOptimisticUpdate('chat', { id: 'msg-1', text: 'Hello again' }, {
        deduplicationKey: (data) => data.id
      });
      expect(id2).toBe(''); // Should return empty string for duplicate
    });

    expect(result.current.updates).toHaveLength(1);
    expect(result.current.updates[0].data).toEqual({ id: 'msg-1', text: 'Hello' });
  });

  it('should clear all updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'Hello' });
      result.current.addOptimisticUpdate('ability', { ability: 1 });
      result.current.addOptimisticUpdate('event', { event: 'test' });
    });

    expect(result.current.updates).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.updates).toHaveLength(0);
  });

  it('should check if update exists', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    let updateId: string;
    act(() => {
      updateId = result.current.addOptimisticUpdate('chat', { message: 'Hello' });
    });

    expect(result.current.hasOptimisticUpdate(updateId!)).toBe(true);
    expect(result.current.hasOptimisticUpdate('non-existent')).toBe(false);

    act(() => {
      result.current.removeOptimisticUpdate(updateId!);
    });

    expect(result.current.hasOptimisticUpdate(updateId!)).toBe(false);
  });

  it('should clean up timeouts on unmount', () => {
    const { result, unmount } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'Hello' }, {
        rollbackStrategy: 'timeout',
        timeoutDuration: 5000
      });
    });

    expect(result.current.updates).toHaveLength(1);

    unmount();

    // Advance timers - update should not be removed since hook was unmounted
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  });
});