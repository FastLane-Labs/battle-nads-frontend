/**
 * Utility for handling BigInt serialization in JSON
 */

// Add BigInt serialization support to JSON.stringify
export const bigintSerializer = () => {
  // Store original stringify method
  const originalStringify = JSON.stringify;

  // Override JSON.stringify to handle BigInt
  JSON.stringify = function(value, replacer, space) {
    // Custom replacer to convert BigInt to string
    const bigintReplacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      // Use custom replacer if provided
      return typeof replacer === 'function' ? replacer(key, value) : value;
    };
    
    // Call original stringify with our custom replacer
    return originalStringify(value, bigintReplacer, space);
  };

  // Return a cleanup function
  return () => {
    // Restore original stringify method when no longer needed
    JSON.stringify = originalStringify;
  };
};

// Single-use function to safely stringify an object with BigInt
export const safeStringify = (value: any, replacer?: (key: string, value: any) => any, space?: string | number) => {
  // Custom replacer to convert BigInt to string
  const bigintReplacer = (key: string, val: any) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    // Use custom replacer if provided
    return replacer ? replacer(key, val) : val;
  };
  
  try {
    return JSON.stringify(value, bigintReplacer, space);
  } catch (error) {
    console.error('Error stringifying object:', error);
    return '{"error":"Failed to stringify object"}';
  }
};