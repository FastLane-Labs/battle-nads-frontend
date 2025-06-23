import { renderHook, act } from '@testing-library/react';
import { useOptimisticChat } from '../useOptimisticChat';
import { OptimisticUpdatesProvider } from '@/providers/OptimisticUpdatesProvider';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <OptimisticUpdatesProvider>{children}</OptimisticUpdatesProvider>
);

describe('useOptimisticChat', () => {
  it('should add optimistic chat messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      const id = result.current.addOptimisticChatMessage(
        'Hello world',
        { id: 'user1', name: 'TestUser', index: 1 },
        BigInt(100)
      );
      
      expect(id).toBeTruthy();
      expect(result.current.optimisticChatMessages).toHaveLength(1);
      expect(result.current.optimisticChatMessages[0].message).toBe('Hello world');
      expect(result.current.optimisticChatMessages[0].sender.name).toBe('TestUser');
      expect(result.current.optimisticChatMessages[0].isOptimistic).toBe(true);
    });
  });

  it('should prevent duplicate messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      const character = { id: 'user1', name: 'TestUser', index: 1 };
      
      result.current.addOptimisticChatMessage('Hello', character, BigInt(100));
      result.current.addOptimisticChatMessage('Hello', character, BigInt(101));
      
      expect(result.current.optimisticChatMessages).toHaveLength(1);
    });
  });

  it('should check if message is optimistic', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      result.current.addOptimisticChatMessage(
        'Test message',
        { id: 'user1', name: 'TestUser', index: 1 },
        BigInt(100)
      );
    });

    expect(result.current.isMessageOptimistic('Test message', 'user1')).toBe(true);
    expect(result.current.isMessageOptimistic('Other message', 'user1')).toBe(false);
    expect(result.current.isMessageOptimistic('Test message', 'user2')).toBe(false);
  });

  it('should remove confirmed optimistic messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      // Add optimistic messages
      result.current.addOptimisticChatMessage(
        'Message 1',
        { id: 'user1', name: 'TestUser', index: 1 },
        BigInt(100)
      );
      result.current.addOptimisticChatMessage(
        'Message 2', 
        { id: 'user2', name: 'OtherUser', index: 2 },
        BigInt(101)
      );
    });

    expect(result.current.optimisticChatMessages).toHaveLength(2);

    act(() => {
      // Simulate confirmed messages from blockchain
      const confirmedMessages = [
        {
          message: 'Message 1',
          sender: { id: 'user1', name: 'TestUser', index: 1 },
          blocknumber: BigInt(105),
          timestamp: Date.now(),
          logIndex: 0,
          isOptimistic: false
        }
      ];
      
      result.current.removeConfirmedOptimisticMessages(confirmedMessages);
    });

    // Should remove the confirmed message but keep the unconfirmed one
    expect(result.current.optimisticChatMessages).toHaveLength(1);
    expect(result.current.optimisticChatMessages[0].message).toBe('Message 2');
  });

  it('should remove optimistic message by ID', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      const id = result.current.addOptimisticChatMessage(
        'Test message',
        { id: 'user1', name: 'TestUser', index: 1 },
        BigInt(100)
      );
      
      expect(result.current.optimisticChatMessages).toHaveLength(1);
      
      result.current.removeOptimisticChatMessage(id);
      expect(result.current.optimisticChatMessages).toHaveLength(0);
    });
  });

  it('should handle rollback', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      const id = result.current.addOptimisticChatMessage(
        'Test message',
        { id: 'user1', name: 'TestUser', index: 1 },
        BigInt(100)
      );
      
      expect(result.current.optimisticChatMessages).toHaveLength(1);
      
      result.current.rollbackChatMessage(id);
      expect(result.current.optimisticChatMessages).toHaveLength(0);
    });
  });
});