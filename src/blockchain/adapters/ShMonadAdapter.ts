import { Contract, Signer, Provider, TransactionResponse } from 'ethers';
import SHMONAD_ABI from '../abis/ShMonadEntrypoint.json';
import { GAS_LIMITS } from '../../config/gas';

/**
 * Adapter that wraps the ShMonad contract
 * Provides typed functions for just one of the contract interactions
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
   * Moves the character north
   */
  async setMinBondedBalance(policyId: BigInt, minBonded: BigInt, maxTopUpPerPeriod: BigInt, topUpPeriodDuration: BigInt): Promise<TransactionResponse> {
    return this.contract.setMinBondedBalance(policyId, minBonded, maxTopUpPerPeriod, topUpPeriodDuration , { gasLimit: GAS_LIMITS.move });
  }
}
