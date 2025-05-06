// Gas limit constants for BattleNads contract interactions
export const GAS_LIMITS = {
  move: BigInt(1_500_000),
  action: BigInt(950_000),
  sessionKey: BigInt(1_200_000),
  chat: BigInt(1_000_000)
};
// Average block time in seconds (for cooldown estimation)
export const AVG_BLOCK_TIME = 2; 
export const AVG_BLOCK_TIME_MS = AVG_BLOCK_TIME * 1000; 