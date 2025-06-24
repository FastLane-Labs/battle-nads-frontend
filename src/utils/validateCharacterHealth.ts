/**
 * Character health validation utilities
 * Consolidates health validation logic scattered across the codebase
 */

export interface HealthValidationResult {
  isValid: boolean;
  normalizedHealth: number;
  normalizedMaxHealth: number;
  shouldBeDead: boolean;
  actuallyDead: boolean;
  warnings: string[];
}

/**
 * Validates and normalizes character health values
 * Consolidates health validation logic from mappers and UI components
 * 
 * @param health - Current health value (number, BigInt, null, or undefined)
 * @param maxHealth - Maximum health value (number, BigInt, null, or undefined)
 * @param isDead - Contract-reported death state
 * @param characterId - Character ID for warning context (optional)
 * @returns Validation result with normalized values and flags
 */
export function validateCharacterHealth(
  health: number | bigint | null | undefined,
  maxHealth: number | bigint | null | undefined,
  isDead: boolean = false,
  characterId?: string
): HealthValidationResult {
  const warnings: string[] = [];
  
  // Normalize inputs to numbers, defaulting invalid values
  const normalizedHealth = Math.max(0, Number(health) || 0);
  const normalizedMaxHealth = Math.max(1, Number(maxHealth) || 100);
  
  // Clamp health to valid range
  const clampedHealth = Math.min(normalizedHealth, normalizedMaxHealth);
  
  // Determine death states
  const shouldBeDead = clampedHealth <= 0 || normalizedMaxHealth <= 0;
  const actuallyDead = isDead || shouldBeDead;
  
  // Generate warnings for inconsistent states
  if (shouldBeDead && !isDead) {
    warnings.push(`Character ${characterId || 'unknown'} should be dead (health: ${clampedHealth}, maxHealth: ${normalizedMaxHealth}) but isDead is false`);
  }
  
  if (normalizedHealth > normalizedMaxHealth) {
    warnings.push(`Character ${characterId || 'unknown'} health ${normalizedHealth} exceeds maxHealth ${normalizedMaxHealth}`);
  }
  
  if (normalizedHealth !== clampedHealth) {
    warnings.push(`Character ${characterId || 'unknown'} health clamped from ${normalizedHealth} to ${clampedHealth}`);
  }
  
  return {
    isValid: warnings.length === 0,
    normalizedHealth: clampedHealth,
    normalizedMaxHealth,
    shouldBeDead,
    actuallyDead,
    warnings
  };
}

/**
 * Quick health percentage calculation with validation
 * @param health - Current health (number, BigInt, null, or undefined)
 * @param maxHealth - Maximum health (number, BigInt, null, or undefined)
 * @returns Health percentage (0-1) or 0 if invalid
 */
export function getHealthPercentage(
  health: number | bigint | null | undefined,
  maxHealth: number | bigint | null | undefined
): number {
  const validation = validateCharacterHealth(health, maxHealth);
  return validation.normalizedMaxHealth > 0 
    ? validation.normalizedHealth / validation.normalizedMaxHealth 
    : 0;
}

/**
 * Clamps health to valid range without full validation
 * @param health - Health value to clamp (number, BigInt, null, or undefined)
 * @param maxHealth - Maximum allowed health (number, BigInt, null, or undefined)
 * @returns Clamped health value
 */
export function clampHealth(
  health: number | bigint | null | undefined,
  maxHealth: number | bigint | null | undefined
): number {
  const safeHealth = Math.max(0, Number(health) || 0);
  const safeMaxHealth = Math.max(1, Number(maxHealth) || 100);
  return Math.min(safeHealth, safeMaxHealth);
}