// Gas limit constants for BattleNads contract interactions
export const GAS_LIMITS = {
  move: BigInt(950_000),
  action: BigInt(775_000),
  sessionKey: BigInt(950_000),
  chat: BigInt(500_000)
};
// Average block time in seconds (for cooldown estimation)
export const AVG_BLOCK_TIME = 0.5; 
export const AVG_BLOCK_TIME_MS = AVG_BLOCK_TIME * 1000; 