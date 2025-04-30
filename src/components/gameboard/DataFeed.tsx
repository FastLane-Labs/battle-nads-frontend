import React, { useMemo, useRef, useEffect, memo } from 'react';
import { Box, VStack, Flex, Text, Spinner } from '@chakra-ui/react';

import { useBattleNads } from '@/hooks/game/useBattleNads';
import { useChat } from '@/hooks/game/useChat';          // NEW
import { domain } from '@/types';

import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

/* ---------- internal helpers ---------- */

interface UiLog {
  logType: domain.LogType;
  source: string;
  message: string;
  characterID?: string;
  characterName?: string;
  x?: number;
  y?: number;
  depth?: number;
  extraData?: unknown;
  timestamp?: number;
}

function mapDomainEventMessageToUiLog(msg: domain.EventMessage): UiLog {
  return {
    logType: msg.type,
    message: msg.message,
    timestamp: msg.timestamp,
    source: 'GameEvent',
  };
}

/* ---------- component ---------- */

interface DataFeedProps {
  characterId: string;
  owner?: string;                    // unchanged – still controls which snapshot branch we read
}

const DataFeed = memo(function DataFeed({ characterId, owner }: DataFeedProps) {
  /* --------------- game/event data --------------- */
  const { gameState, isLoading, error } = useBattleNads(owner ?? null);
  const mappedEventLogs: UiLog[] = useMemo(
    () => (gameState?.eventLogs || []).map(mapDomainEventMessageToUiLog),
    [gameState?.eventLogs],
  );

  /* --------------- chat data --------------- */
  const { chatLogs, sendChatMessage, isSending, error: chatError } = useChat();  // NEW

  /* --------------- refs / diagnostic --------------- */
  const instanceId = useRef(`DataFeed-${Math.random().toString(36).slice(2, 9)}`);
  const renderRef = useRef(0);
  renderRef.current += 1;

  /* --------------- early exits --------------- */
  if (!characterId) return <Box p={4}>No character selected</Box>;

  if (isLoading && !gameState)
    return (
      <Box h="100%" w="100%" display="flex" justifyContent="center" alignItems="center">
        <Spinner />
        <Text ml={2}>Loading game feed…</Text>
      </Box>
    );

  if (error || chatError)
    return (
      <Box h="100%" w="100%" p={4} bg="red.900" color="white">
        <Text>
          Error loading game feed: {error ?? chatError}
        </Text>
      </Box>
    );

  /* --------------- render --------------- */
  return (
    <Box h="100%" w="100%" overflow="hidden">
      <Flex direction="column" h="100%">
        {/* Events */}
        <Box flex="1" minH="40%" maxH="50%" mb={2} overflow="hidden">
          <EventFeed events={mappedEventLogs} />
        </Box>

        {/* Chat */}
        <Box flex="1" minH="50%" overflow="hidden">
          <ChatInterface
            characterId={characterId}
            messages={chatLogs}
            onSendMessage={sendChatMessage}
          />
        </Box>
      </Flex>
    </Box>
  );
},
/* avoid useless re-renders – only care if id/owner changes */
(prev, next) => prev.characterId === next.characterId && prev.owner === next.owner);

export default DataFeed; 