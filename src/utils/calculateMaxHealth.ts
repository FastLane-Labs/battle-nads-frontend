import { 
  CharacterStats, 
} from '../types/domain'; // Corrected import path


/**
 * Calculates the maximum health of a character based on game mechanics.
 * This should match the formula used in the smart contract.
 */
export const calculateMaxHealth = (stats: CharacterStats | null | undefined): number => {
  if (!stats) return 100; // Default max health
  
  // Base health is 100
  const baseHealth = 100;
  
  // Vitality provides 5 health per point
  const vitalityBonus = Number(stats.vitality || 0) * 5;
  
  // Sturdiness provides 2 health per point
  const sturdinessBonus = Number(stats.sturdiness || 0) * 2;
  
  // Calculate max health based on these factors
  return baseHealth + vitalityBonus + sturdinessBonus;
};