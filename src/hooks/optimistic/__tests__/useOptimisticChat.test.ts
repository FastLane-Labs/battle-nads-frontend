import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticChat } from '../useOptimisticChat';
import { OptimisticUpdatesProvider } from '@/providers/OptimisticUpdatesProvider';

const wrapper = ({ children }: { children: ReactNode }) => {
  return React.createElement(OptimisticUpdatesProvider, { children });
};

describe('useOptimisticChat', () => {
  it('should add optimistic chat messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    let messageId = '';

    act(() => {
      messageId = result.current.addOptimisticChatMessage(
        'Hello world test 1',
        { id: 'user1-test1', name: 'TestUser1', index: 1 },
        BigInt(100)
      );
    });
      
    expect(messageId).toBeTruthy();
    expect(result.current.optimisticChatMessages).toHaveLength(1);
    expect(result.current.optimisticChatMessages[0].message).toBe('Hello world test 1');
    expect(result.current.optimisticChatMessages[0].sender.name).toBe('TestUser1');
    expect(result.current.optimisticChatMessages[0].isOptimistic).toBe(true);
  });

  it('should prevent duplicate messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      const character = { id: 'user2-test2', name: 'TestUser2', index: 2 };
      
      result.current.addOptimisticChatMessage('Hello test 2', character, BigInt(100));
      result.current.addOptimisticChatMessage('Hello test 2', character, BigInt(101));
    });
      
    expect(result.current.optimisticChatMessages).toHaveLength(1);
  });

  it('should check if message is optimistic', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      result.current.addOptimisticChatMessage(
        'Test message 3',
        { id: 'user3-test3', name: 'TestUser3', index: 3 },
        BigInt(100)
      );
    });

    expect(result.current.isMessageOptimistic('Test message 3', 'user3-test3')).toBe(true);
    expect(result.current.isMessageOptimistic('Other message', 'user3-test3')).toBe(false);
    expect(result.current.isMessageOptimistic('Test message 3', 'user4')).toBe(false);
  });

  it('should handle multiple distinct messages', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });

    act(() => {
      // Add multiple distinct messages
      result.current.addOptimisticChatMessage(
        'Message 4a',
        { id: 'user4-test4a', name: 'TestUser4a', index: 4 },
        BigInt(100)
      );
      result.current.addOptimisticChatMessage(
        'Message 4b', 
        { id: 'user4-test4b', name: 'TestUser4b', index: 5 },
        BigInt(101)
      );
    });

    expect(result.current.optimisticChatMessages).toHaveLength(2);
    expect(result.current.optimisticChatMessages[0].message).toBe('Message 4a');
    expect(result.current.optimisticChatMessages[1].message).toBe('Message 4b');
  });

  it('should remove optimistic message by ID', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    let messageId = '';

    act(() => {
      messageId = result.current.addOptimisticChatMessage(
        'Test message 5',
        { id: 'user5-test5', name: 'TestUser5', index: 6 },
        BigInt(100)
      );
    });
      
    expect(result.current.optimisticChatMessages).toHaveLength(1);
      
    act(() => {
      result.current.removeOptimisticChatMessage(messageId);
    });
    
    expect(result.current.optimisticChatMessages).toHaveLength(0);
  });

  it('should handle message removal by ID', () => {
    const { result } = renderHook(() => useOptimisticChat(), { wrapper });
    let messageId1 = '';
    let messageId2 = '';

    act(() => {
      messageId1 = result.current.addOptimisticChatMessage(
        'Test message 6a',
        { id: 'user6-test6a', name: 'TestUser6a', index: 7 },
        BigInt(100)
      );
      messageId2 = result.current.addOptimisticChatMessage(
        'Test message 6b',
        { id: 'user6-test6b', name: 'TestUser6b', index: 8 },
        BigInt(101)
      );
    });
      
    expect(result.current.optimisticChatMessages).toHaveLength(2);
      
    act(() => {
      // Remove only the first message
      result.current.removeOptimisticChatMessage(messageId1);
    });
    
    expect(result.current.optimisticChatMessages).toHaveLength(1);
    expect(result.current.optimisticChatMessages[0].message).toBe('Test message 6b');
  });
});