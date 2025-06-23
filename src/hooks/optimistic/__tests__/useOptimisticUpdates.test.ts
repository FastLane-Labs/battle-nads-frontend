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

  it('should add optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id = result.current.addOptimisticUpdate('chat', { message: 'test' });
      expect(id).toBeTruthy();
      expect(result.current.updates).toHaveLength(1);
      expect(result.current.updates[0].data).toEqual({ message: 'test' });
    });
  });

  it('should remove optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id = result.current.addOptimisticUpdate('chat', { message: 'test' });
      result.current.removeOptimisticUpdate(id);
      expect(result.current.updates).toHaveLength(0);
    });
  });

  it('should handle timeout rollback strategy', () => {
    const onRollback = jest.fn();
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'test' }, {
        rollbackStrategy: 'timeout',
        timeoutDuration: 1000,
        onRollback
      });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.updates).toHaveLength(0);
    expect(onRollback).toHaveBeenCalled();
  });

  it('should handle explicit rollback strategy', () => {
    const onRollback = jest.fn();
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const id = result.current.addOptimisticUpdate('chat', { message: 'test' }, {
        rollbackStrategy: 'explicit',
        onRollback
      });
      
      // Should not auto-rollback
      jest.advanceTimersByTime(30000);
      expect(result.current.updates).toHaveLength(1);
      
      // Manual rollback
      result.current.rollback(id);
    });

    expect(result.current.updates).toHaveLength(0);
    expect(onRollback).toHaveBeenCalled();
  });

  it('should deduplicate updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      const deduplicationKey = (data: any) => data.message;
      
      result.current.addOptimisticUpdate('chat', { message: 'test' }, { deduplicationKey });
      result.current.addOptimisticUpdate('chat', { message: 'test' }, { deduplicationKey });
      
      expect(result.current.updates).toHaveLength(1);
    });
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

  it('should remove confirmed updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'test', sender: 'user1' });
      result.current.addOptimisticUpdate('chat', { message: 'other', sender: 'user2' });
    });

    expect(result.current.updates).toHaveLength(2);

    act(() => {
      const confirmedMessages = [{ message: 'test', sender: 'user1' }];
      result.current.removeConfirmedUpdates(
        'chat',
        confirmedMessages,
        (optimistic, confirmed) => optimistic.message === confirmed.message && optimistic.sender === confirmed.sender
      );
    });

    expect(result.current.updates).toHaveLength(1);
    expect((result.current.updates[0].data as any).message).toBe('other');
  });

  it('should clear all updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'test1' });
      result.current.addOptimisticUpdate('ability', { name: 'fireball' });
      result.current.clearAll();
    });

    expect(result.current.updates).toHaveLength(0);
  });
});