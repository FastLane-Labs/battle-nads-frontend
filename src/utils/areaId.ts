/**
 * Area ID utility functions for spatial context
 * Creates area IDs compatible with Solidity implementation
 */

/**
 * Creates an area ID from depth, x, and y coordinates
 * Solidity: bytes32(uint256(depth) | (uint256(x) << 8) | (uint256(y) << 16))
 * 
 * @param depth - Depth level (0-255)
 * @param x - X coordinate (0-255) 
 * @param y - Y coordinate (0-255)
 * @returns BigInt representing the area ID
 */
export function createAreaID(depth: number, x: number, y: number): bigint {
  // Use BigInt for exact Solidity compatibility
  const depthBig = BigInt(depth);
  const xBig = BigInt(x) << 8n;
  const yBig = BigInt(y) << 16n;

  return depthBig | xBig | yBig;
}

/**
 * Parses an area ID back to coordinates
 * @param areaId - Area ID bigint
 * @returns Object with depth, x, y coordinates
 */
export function parseAreaID(areaId: bigint): { depth: number; x: number; y: number } {
  const depth = Number(areaId & 0xFFn);
  const x = Number((areaId >> 8n) & 0xFFn);
  const y = Number((areaId >> 16n) & 0xFFn);
  
  return { depth, x, y };
}

/**
 * Validates if a value is a valid area ID
 * @param areaId - Area ID to validate
 * @returns true if valid area ID
 */
export function isValidAreaID(areaId: bigint): boolean {
  return typeof areaId === 'bigint' && areaId >= 0n;
}