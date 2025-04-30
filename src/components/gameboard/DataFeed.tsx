import React, { useMemo, useRef, memo } from 'react';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';

import { useChat } from '@/hooks/game/useChat';
import { useEvents } from '@/hooks/game/useEvents';
import { domain } from '@/types';

import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

/* ---------- internal helpers ---------- */

interface UiLog {
  logType: domain.LogType;
  logTypeName: string;
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

function getLogTypeName(logType: domain.LogType): string {
  switch (logType) {
    case domain.LogType.Combat: return 'Combat';
    case domain.LogType.InstigatedCombat: return 'Combat Start';
    case domain.LogType.EnteredArea: return 'Movement to';
    case domain.LogType.LeftArea: return 'Movement from';
    case domain.LogType.Chat: return 'Chat';
    case domain.LogType.Ability: return 'Ability';
    case domain.LogType.Sepukku: return 'Death';
    case domain.LogType.Unknown:
    default: return 'System';
  }
}

function mapDomainEventMessageToUiLog(msg: domain.EventMessage): UiLog {
  // --- DEBUG LOGGING ---
  console.log("[DataFeed] Mapping Domain Event Message:", msg);
  // --- END DEBUG ---
  const logTypeName = getLogTypeName(msg.type);
  return {
    logType: msg.type,
    logTypeName,
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
  /* --------------- event data - now directly from dataFeeds --------------- */
  const { eventLogs: domainEventLogs, isLoading: isLoadingEvents, error: eventError } = useEvents();
  
  const mappedEventLogs: UiLog[] = useMemo(
    () => domainEventLogs.map(mapDomainEventMessageToUiLog),
    [domainEventLogs],
  );

  /* --------------- chat data - now directly from dataFeeds --------------- */
  const { chatLogs, sendChatMessage, isSending, error: chatError } = useChat();

  /* --------------- refs / diagnostic --------------- */
  const instanceId = useRef(`DataFeed-${Math.random().toString(36).slice(2, 9)}`);
  const renderRef = useRef(0);
  renderRef.current += 1;

  /* --------------- early exits --------------- */
  if (!characterId) return <Box p={4}>No character selected</Box>;

  if (isLoadingEvents && mappedEventLogs.length === 0)
    return (
      <Box h="100%" w="100%" display="flex" justifyContent="center" alignItems="center">
        <Spinner />
        <Text ml={2}>Loading game feed…</Text>
      </Box>
    );

  if (eventError || chatError)
    return (
      <Box h="100%" w="100%" p={4} bg="red.900" color="white">
        <Text>
          Error loading game feed: {eventError ?? chatError}
        </Text>
      </Box>
    );

  /* --------------- render --------------- */
  return (
    <Box h="100%" w="100%" overflow="hidden">
      <Flex direction="column" h="100%">
        {/* Events - directly from dataFeeds */}
        <Box flex="1" minH="40%" maxH="50%" mb={2} overflow="hidden">
          <EventFeed events={mappedEventLogs} />
        </Box>

        {/* Chat - directly from dataFeeds */}
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