import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdates } from '../useOptimisticUpdates';

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should add optimistic updates without deduplication', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id = result.current.addOptimisticUpdate('chat', { message: 'test-basic' });
      expect(id).toBeTruthy();
      expect(result.current.updates).toHaveLength(1);
      expect(result.current.updates[0].data).toEqual({ message: 'test-basic' });
    });
  });

  it('should remove optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());
    let updateId: string;

    act(() => {
      updateId = result.current.addOptimisticUpdate('chat', { message: 'test-remove' });
      expect(result.current.updates).toHaveLength(1);
    });

    act(() => {
      result.current.removeOptimisticUpdate(updateId);
      expect(result.current.updates).toHaveLength(0);
    });
  });

  it('should handle timeout rollback strategy', () => {
    const onRollback = jest.fn();
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'test-timeout' }, {
        rollbackStrategy: 'timeout',
        timeoutDuration: 1000,
        onRollback
      });
      expect(result.current.updates).toHaveLength(1);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.updates).toHaveLength(0);
    expect(onRollback).toHaveBeenCalled();
  });

  it('should get updates by type', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'chat1' });
      result.current.addOptimisticUpdate('ability', { name: 'fireball' });
      result.current.addOptimisticUpdate('chat', { message: 'chat2' });
    });

    const chatUpdates = result.current.getUpdatesByType('chat');
    const abilityUpdates = result.current.getUpdatesByType('ability');

    expect(chatUpdates).toHaveLength(2);
    expect(abilityUpdates).toHaveLength(1);
  });

  it('should clear all updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'test1' });
      result.current.addOptimisticUpdate('ability', { name: 'fireball' });
      expect(result.current.updates).toHaveLength(2);
    });

    act(() => {
      result.current.clearAll();
      expect(result.current.updates).toHaveLength(0);
    });
  });
});