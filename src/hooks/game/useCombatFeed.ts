import { useMemo } from "react";
import type { EventMessage } from "@/types/domain/dataFeed";
import { enrichLog, type LogEntryRaw, type LogEntryRich } from "@/utils/log-builder";

// LRU cache for enriched messages
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing entry
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance for enriched combat messages
const enrichedCache = new LRUCache<string, LogEntryRich>(1000);

// Create a hash for the context parameters to use in cache key
function createContextHash(playerIndex?: number | null, playerWeaponName?: string, currentAreaId?: bigint, playerCharacterName?: string): string {
  return `${playerIndex ?? 'null'}-${playerWeaponName ?? 'none'}-${currentAreaId?.toString() ?? 'none'}-${playerCharacterName ?? 'none'}`;
}

export function useCombatFeed(rawLogs: EventMessage[], playerIndex?: number | null, playerWeaponName?: string, currentAreaId?: bigint, playerCharacterName?: string): LogEntryRich[] {
  return useMemo(() => {
    const contextHash = createContextHash(playerIndex, playerWeaponName, currentAreaId, playerCharacterName);
    
    return rawLogs.map((log) => {
      // Create unique cache key combining log identity and context
      const cacheKey = `${log.logIndex}-${log.blocknumber.toString()}-${contextHash}`;
      
      // Check cache first
      const cached = enrichedCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Enrich the log and cache the result
      const enriched = enrichLog(log as LogEntryRaw, playerIndex, playerWeaponName, currentAreaId, playerCharacterName);
      enrichedCache.set(cacheKey, enriched);
      
      return enriched;
    });
  }, [rawLogs, playerIndex, playerWeaponName, currentAreaId, playerCharacterName]);
}

// Export cache utilities for testing/debugging
export const combatFeedCache = {
  clear: () => enrichedCache.clear(),
  size: () => enrichedCache.size(),
};