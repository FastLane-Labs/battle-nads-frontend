import { ThreatLevel, ThreatInfo } from '@/types/domain/character';

/**
 * Calculate threat level based on level difference between current player and other player
 * @param currentPlayerLevel - The current player's level (number or BigInt)
 * @param otherPlayerLevel - The other player's level (number or BigInt)
 * @returns ThreatInfo with threat level and level difference
 */
export function calculateThreatLevel(currentPlayerLevel: number | bigint, otherPlayerLevel: number | bigint): ThreatInfo {
  // Convert to numbers for calculation
  const currentLevel = typeof currentPlayerLevel === 'bigint' ? Number(currentPlayerLevel) : currentPlayerLevel;
  const otherLevel = typeof otherPlayerLevel === 'bigint' ? Number(otherPlayerLevel) : otherPlayerLevel;
  
  const levelDifference = otherLevel - currentLevel;
  
  let level: ThreatLevel;
  
  if (levelDifference <= -5) {
    level = 'low';      // 5+ levels below = low threat
  } else if (levelDifference >= -4 && levelDifference <= 2) {
    level = 'equal';    // 4 below to 2 above = equal threat
  } else if (levelDifference >= 3 && levelDifference <= 9) {
    level = 'high';     // 3-9 levels above = high threat
  } else {
    level = 'extreme';  // 10+ levels above = extreme threat
  }
  
  return {
    level,
    levelDifference: Math.abs(levelDifference)
  };
}

/**
 * Get color scheme for threat level
 * @param threatLevel - The threat level
 * @returns Object with various color properties for UI styling
 */
export function getThreatColors(threatLevel: ThreatLevel) {
  switch (threatLevel) {
    case 'low':
      return {
        text: 'text-green-300',
        border: 'border-green-500',
        bg: 'bg-green-900/30',
        chakraColor: 'green'
      };
    case 'equal':
      return {
        text: 'text-gray-300',
        border: 'border-gray-500',
        bg: 'bg-gray-900/30',
        chakraColor: 'gray'
      };
    case 'high':
      return {
        text: 'text-orange-300',
        border: 'border-orange-500',
        bg: 'bg-orange-900/30',
        chakraColor: 'orange'
      };
    case 'extreme':
      return {
        text: 'text-red-300',
        border: 'border-red-500',
        bg: 'bg-red-900/30',
        chakraColor: 'red'
      };
  }
}