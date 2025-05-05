/**
 * Utility functions related to blockchain blocks.
 */

// Approximate time per block in milliseconds
const BLOCK_TIME_MS = 500;

/**
 * Estimates the timestamp of a target block based on a known reference block and its timestamp.
 *
 * @param lastBlock - The block number of the known reference point.
 * @param lastBlockTimestamp - The timestamp (ms since epoch) when the reference block was known/fetched.
 * @param lookupBlock - The block number for which to estimate the timestamp.
 * @returns The estimated timestamp (ms since epoch) for the lookupBlock.
 */
export const estimateBlockTimestamp = (
  lastBlock: bigint,
  lastBlockTimestamp: number,
  lookupBlock: bigint
): number => {
  // Calculate the difference in blocks
  const blockDifference = lastBlock - lookupBlock;

  // Calculate the time difference based on block time
  // Multiplying bigint directly might not be ideal, convert difference to number first.
  const timeDifferenceMs = Number(blockDifference) * BLOCK_TIME_MS;

  // Estimate the timestamp by adjusting the reference timestamp
  // If lookupBlock is older (positive difference), subtract timeDifferenceMs.
  // If lookupBlock is newer (negative difference), add timeDifferenceMs (subtracting a negative).
  const estimatedTimestamp = lastBlockTimestamp - timeDifferenceMs;

  return estimatedTimestamp;
}; 