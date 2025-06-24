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
    let updateId: string = '';

    act(() => {
      updateId = result.current.addOptimisticUpdate('chat', { message: 'test-basic' });
    });

    // Check state after act completes
    expect(updateId).toBeTruthy();
    expect(result.current.updates).toHaveLength(1);
    expect(result.current.updates[0].data).toEqual({ message: 'test-basic' });
  });

  it('should remove optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());
    let updateId: string;

    act(() => {
      updateId = result.current.addOptimisticUpdate('chat', { message: 'test-remove' });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      result.current.removeOptimisticUpdate(updateId);
    });

    expect(result.current.updates).toHaveLength(0);
  });

  it('should handle deduplication', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      // Add first message with deduplication key
      result.current.addOptimisticUpdate('chat', { message: 'test-dedup' }, {
        deduplicationKey: (data) => `sender-123-${data.message}`
      });
      
      // Try to add the same message again - should be deduplicated
      result.current.addOptimisticUpdate('chat', { message: 'test-dedup' }, {
        deduplicationKey: (data) => `sender-123-${data.message}`
      });
    });

    // Should only have 1 update due to deduplication
    expect(result.current.updates).toHaveLength(1);
    expect(result.current.updates[0].data).toEqual({ message: 'test-dedup' });
  });

  it('should get updates by type', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.addOptimisticUpdate('chat', { message: 'chat1' });
      result.current.addOptimisticUpdate('ability', { name: 'fireball' });
      result.current.addOptimisticUpdate('chat', { message: 'chat2' });
    });

    expect(result.current.updates).toHaveLength(3);
    
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
    });

    expect(result.current.updates).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.updates).toHaveLength(0);
  });
});