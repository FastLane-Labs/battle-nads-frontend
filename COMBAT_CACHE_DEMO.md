# Combat Message Caching Demo

This demonstrates how the LRU cache works for combat message enrichment.

## How It Works

### Before (Without Cache)
```
Render 1: enrichLog() called for all 100 events = 100 enrichments
Render 2: enrichLog() called for all 100 events = 100 enrichments  
Render 3: enrichLog() called for all 100 events = 100 enrichments
Total: 300 enrichments for 3 renders
```

### After (With LRU Cache)
```
Render 1: enrichLog() called for all 100 events = 100 enrichments → cached
Render 2: All 100 events retrieved from cache = 0 enrichments
Render 3: All 100 events retrieved from cache = 0 enrichments  
Total: 100 enrichments for 3 renders (66% reduction!)
```

## Cache Key Strategy

Each enriched message is cached with a unique key:
```typescript
const cacheKey = `${logIndex}-${blocknumber}-${contextHash}`;
// Example: "42-1000-1-sword-5-PlayerName"
```

Context changes create new cache entries:
- Player weapon change: `sword` → `axe` (new cache entry)
- Area change: `area-5` → `area-6` (new cache entry) 
- Player name change: `John` → `Alice` (new cache entry)

## Deterministic Verb Selection

Monster verbs are selected deterministically using `logIndex`:
```typescript
// This will ALWAYS return the same verb for the same monster + logIndex
const verb = MONSTER_ATTACKS[monsterIndex][logIndex % verbCount];
```

Since the cache key includes `logIndex`, the same monster attack will always have the same verb, even across sessions!

## Performance Benefits

1. **Reduced CPU Usage**: No repeated enrichment calculations
2. **Stable UI**: No text flickering from re-enrichment  
3. **Memory Efficient**: LRU eviction prevents unbounded growth
4. **Context Aware**: Automatically handles player context changes

## Memory Management

- **Max Size**: 1000 entries (configurable)
- **Eviction**: Least Recently Used entries removed first
- **Typical Entry Size**: ~200 bytes per cached message
- **Total Memory**: ~200KB at max capacity

## Testing

The cache includes utilities for debugging:
```typescript
import { combatFeedCache } from '@/hooks/game/useCombatFeed';

console.log('Cache size:', combatFeedCache.size());
combatFeedCache.clear(); // Clear all cached entries
```