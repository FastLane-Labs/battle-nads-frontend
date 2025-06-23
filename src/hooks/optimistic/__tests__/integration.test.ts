import { renderHook, act } from '@testing-library/react';
import { useOptimisticChat } from '../useOptimisticChat';
import { OptimisticUpdatesProvider } from '@/providers/OptimisticUpdatesProvider';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <OptimisticUpdatesProvider>{children}</OptimisticUpdatesProvider>
);

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

  it('should handle multiple users and partial confirmations', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    
    const user1 = { id: 'user1', name: 'User1', index: 1 };
    const user2 = { id: 'user2', name: 'User2', index: 2 };

    // Send messages from both users
    act(() => {
      result.current.addOptimisticChatMessage('Message from user1', user1, BigInt(100));
      result.current.addOptimisticChatMessage('Message from user2', user2, BigInt(101));
      result.current.addOptimisticChatMessage('Another from user1', user1, BigInt(102));
    });

    expect(result.current.optimisticChatMessages).toHaveLength(3);

    // Confirm only one message
    act(() => {
      const confirmedMessage = {
        message: 'Message from user1',
        sender: user1,
        blocknumber: BigInt(105),
        timestamp: Date.now(),
        logIndex: 0,
        isOptimistic: false
      };
      
      result.current.removeConfirmedOptimisticMessages([confirmedMessage]);
    });

    // Should have 2 remaining optimistic messages
    expect(result.current.optimisticChatMessages).toHaveLength(2);
    
    const remainingMessages = result.current.optimisticChatMessages.map(m => m.message);
    expect(remainingMessages).toContain('Message from user2');
    expect(remainingMessages).toContain('Another from user1');
    expect(remainingMessages).not.toContain('Message from user1');
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