import { Contract, Signer, Provider, TransactionResponse } from 'ethers';
import SHMONAD_ABI from '../abis/ShMonadEntrypoint.json';
import { SHMON_GAS_LIMITS } from '../../config/shmon';

/**
 * ShMonad Contract Adapter
 * 
 * Handles interactions with the ShMON (shared MONAD) contract for automatic
 * balance top-up functionality. ShMON is a token that represents bonded/unbonded
 * MONAD tokens used for gas replenishment.
 * 
 * Key concepts:
 * - Bonded balance: ShMON tokens committed for gas payments
 * - Unbonded balance: Liquid ShMON tokens available for conversion
 * - Top-up mechanism: Automatically converts unbonded to bonded when low
 * 
 * @see src/config/shmon.ts for configuration constants
 */
export class ShMonadAdapter {
  private readonly contract: Contract;
  private readonly provider: Provider;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new Contract(address, SHMONAD_ABI, providerOrSigner);
    
    // Extract provider from signer if needed
    if ('provider' in providerOrSigner && providerOrSigner.provider) {
      this.provider = providerOrSigner.provider;
    } else {
      this.provider = providerOrSigner as Provider;
    }
  }

  /**
   * Sets the minimum bonded balance and automatic top-up parameters
   * @param policyId - The policy ID for the bonding configuration
   * @param minBonded - Minimum bonded balance to maintain
   * @param maxTopUpPerPeriod - Maximum amount that can be topped up per period
   * @param topUpPeriodDuration - Duration of each top-up period
   */
  async setMinBondedBalance(
    policyId: BigInt, 
    minBonded: BigInt, 
    maxTopUpPerPeriod: BigInt, 
    topUpPeriodDuration: BigInt
  ): Promise<TransactionResponse> {
    return this.contract.setMinBondedBalance(
      policyId, 
      minBonded, 
      maxTopUpPerPeriod, 
      topUpPeriodDuration, 
      { gasLimit: SHMON_GAS_LIMITS.SET_MIN_BONDED_BALANCE }
    );
  }

  /**
   * Gets the ShMON balance (unbonded) for an account
   * @param account - The account address to check
   * @returns The unbonded ShMON balance
   */
  async balanceOf(account: string): Promise<bigint> {
    return this.contract.balanceOf(account, { gasLimit: SHMON_GAS_LIMITS.BALANCE_OF });
  }
}
