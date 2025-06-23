import { renderHook, act } from '@testing-library/react';
import { useOptimisticChat } from '../useOptimisticChat';
import { OptimisticUpdatesProvider } from '@/providers/OptimisticUpdatesProvider';
import React, { ReactNode } from 'react';

// Create wrapper without JSX to avoid TypeScript issues
const wrapper = ({ children }: { children: ReactNode }) => {
  return React.createElement(OptimisticUpdatesProvider, { children });
};

describe('Optimistic Updates Integration', () => {
  it('should handle complete chat message lifecycle', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    
    const character = { id: 'user1', name: 'TestUser', index: 1 };
    const message = 'Hello from integration test!';

    // 1. Send optimistic message
    act(() => {
      result.current.addOptimisticChatMessage(message, character, BigInt(100));
    });

    expect(result.current.optimisticChatMessages).toHaveLength(1);
    expect(result.current.optimisticChatMessages[0].message).toBe(message);
    expect(result.current.optimisticChatMessages[0].isOptimistic).toBe(true);

    // 2. Check that message is marked as optimistic
    expect(result.current.isMessageOptimistic(message, character.id)).toBe(true);

    // 3. Simulate blockchain confirmation
    act(() => {
      const confirmedMessage = {
        message,
        sender: character,
        blocknumber: BigInt(105),
        timestamp: Date.now(),
        logIndex: 0,
        isOptimistic: false
      };
      
      result.current.removeConfirmedOptimisticMessages([confirmedMessage]);
    });

    // 4. Optimistic message should be removed
    expect(result.current.optimisticChatMessages).toHaveLength(0);
    expect(result.current.isMessageOptimistic(message, character.id)).toBe(false);
  });

  it('should handle deduplication across reloads', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    
    const character = { id: 'user1', name: 'TestUser', index: 1 };
    const message = 'Duplicate test message';

    // Add same message multiple times (simulating rapid clicks or retries)
    act(() => {
      result.current.addOptimisticChatMessage(message, character, BigInt(100));
      result.current.addOptimisticChatMessage(message, character, BigInt(101));
      result.current.addOptimisticChatMessage(message, character, BigInt(102));
    });

    // Should only have one instance due to deduplication
    expect(result.current.optimisticChatMessages).toHaveLength(1);
    expect(result.current.optimisticChatMessages[0].message).toBe(message);
  });
});