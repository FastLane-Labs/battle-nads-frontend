import { contract, domain } from '../types';

/**
 * Returns flattened event logs from dataFeeds
 * @param dataFeeds Array of DataFeed objects
 * @returns Flattened array of event logs
 */
export const getFlattenedEventLogs = (dataFeeds: contract.DataFeed[] = []): contract.Log[] => {
  return dataFeeds.flatMap(feed => feed.logs ?? []);
};

/**
 * Returns flattened chat logs from dataFeeds
 * @param dataFeeds Array of DataFeed objects
 * @returns Flattened array of chat messages
 */
export const getFlattenedChatLogs = (dataFeeds: contract.DataFeed[] = []): string[] => {
  return dataFeeds.flatMap(feed => feed.chatLogs ?? []);
};

/**
 * Get latest block number from dataFeeds
 * @param dataFeeds Array of DataFeed objects
 * @returns Latest block number or 0n if no feeds available
 */
export const getLatestBlockFromFeeds = (dataFeeds: contract.DataFeed[] = []): bigint => {
  if (dataFeeds.length === 0) return 0n;
  
  return dataFeeds.reduce((latest, feed) => {
    const blockNumber = feed.blockNumber || 0n;
    return blockNumber > latest ? blockNumber : latest;
  }, 0n);
};

// [REMOVING - Logic moved to main mapper contractToDomain.ts]
/* 
 * Returns formatted chat messages from dataFeeds 
 * @param dataFeeds Array of DataFeed objects
 * @returns Array of formatted chat messages
 */
/* export const getChatMessagesFromFeeds = (dataFeeds: contract.DataFeed[] = []): domain.ChatMessage[] => {
  return getFlattenedChatLogs(dataFeeds).map(content => {
    // Try to parse the content to extract character name
    let characterName = "System";
    let message = content;

    if (typeof content === 'string' && content.includes(':')) {
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0) {
        const potentialSender = content.substring(0, colonIndex).trim();
        if (potentialSender) {
          characterName = potentialSender;
          message = content.substring(colonIndex + 1).trim();
        }
      }
    }

    return {
      characterName: characterName,
      message: message,
      timestamp: Date.now() // This timestamp is incorrect, needs block timestamp
    };
  });
}; */