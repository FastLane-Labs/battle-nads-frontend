/**
 * Safe number conversion utilities to prevent overflow errors
 * Handles large BigInt values that exceed JavaScript's safe integer range
 */

import { ethers } from 'ethers';

// JavaScript's safe integer range
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

// Maximum reasonable wei value (1 billion ETH)
const MAX_REASONABLE_WEI = BigInt('1000000000000000000000000000');

/**
 * Safely converts a BigInt to number with overflow protection
 * @param value - BigInt value to convert
 * @param fallback - Fallback value if conversion fails
 * @returns Safe number or fallback
 */
export function safeToNumber(value: bigint | number | null | undefined, fallback: number = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return isFinite(value) ? value : fallback;
  }

  try {
    const bigintValue = BigInt(value);
    
    if (bigintValue > MAX_SAFE_BIGINT || bigintValue < MIN_SAFE_BIGINT) {
      console.warn(`BigInt value ${bigintValue} exceeds safe integer range, using fallback`);
      return fallback;
    }
    
    return Number(bigintValue);
  } catch (error) {
    console.error('Error converting to number:', error, 'Value:', value);
    return fallback;
  }
}

/**
 * Safely formats a value as Ether with overflow protection
 * @param value - Value to format (BigInt, string, or number)
 * @param fallback - Fallback string if conversion fails
 * @returns Formatted Ether string or fallback
 */
export function safeFormatEther(value: bigint | string | number | null | undefined, fallback: string = '0'): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    let bigintValue: bigint;
    
    if (typeof value === 'string') {
      bigintValue = BigInt(value);
    } else if (typeof value === 'number') {
      if (!isFinite(value) || value < 0) {
        console.warn(`Invalid number value: ${value}`);
        return fallback;
      }
      bigintValue = BigInt(Math.floor(value));
    } else {
      bigintValue = value;
    }
    
    // Check for extremely large values that might indicate corrupted data
    if (bigintValue > MAX_REASONABLE_WEI) {
      console.warn(`Value ${bigintValue} is extremely large, may be corrupted data`);
      return 'Value too large to display';
    }

    // Check for negative values
    if (bigintValue < 0) {
      console.warn(`Negative value ${bigintValue} cannot be formatted as Ether`);
      return fallback;
    }

    return ethers.formatEther(bigintValue);
  } catch (error) {
    console.error('Error formatting Ether value:', error, 'Value:', value);
    return fallback;
  }
}

/**
 * Safely formats a value with specified units and overflow protection
 * @param value - Value to format (BigInt, string, or number)
 * @param units - Number of decimal places or unit name
 * @param fallback - Fallback string if conversion fails
 * @returns Formatted string or fallback
 */
export function safeFormatUnits(
  value: bigint | string | number | null | undefined, 
  units: string | number = 18, 
  fallback: string = '0'
): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    let bigintValue: bigint;
    
    if (typeof value === 'string') {
      bigintValue = BigInt(value);
    } else if (typeof value === 'number') {
      if (!isFinite(value) || value < 0) {
        console.warn(`Invalid number value: ${value}`);
        return fallback;
      }
      bigintValue = BigInt(Math.floor(value));
    } else {
      bigintValue = value;
    }
    
    // Check for extremely large values
    if (bigintValue > MAX_REASONABLE_WEI) {
      console.warn(`Value ${bigintValue} is extremely large, may be corrupted data`);
      return 'Value too large to display';
    }

    // Check for negative values
    if (bigintValue < 0) {
      console.warn(`Negative value ${bigintValue} cannot be formatted`);
      return fallback;
    }

    return ethers.formatUnits(bigintValue, units);
  } catch (error) {
    console.error('Error formatting units value:', error, 'Value:', value, 'Units:', units);
    return fallback;
  }
}

/**
 * Safely parses a value to BigInt with validation
 * @param value - Value to parse
 * @param fallback - Fallback BigInt if parsing fails
 * @returns Parsed BigInt or fallback
 */
export function safeToBigInt(value: any, fallback: bigint = BigInt(0)): bigint {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    if (typeof value === 'bigint') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Handle empty strings
      if (value.trim() === '') {
        return fallback;
      }
      return BigInt(value);
    }
    
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        return fallback;
      }
      return BigInt(Math.floor(value));
    }
    
    // Try to convert other types to string first
    return BigInt(String(value));
  } catch (error) {
    console.error('Error converting to BigInt:', error, 'Value:', value);
    return fallback;
  }
} 