import { Contract, Signer, Provider, TransactionResponse } from 'ethers';
import ENTRY_ABI from '../abis/BattleNadsEntrypoint.json';
import { GAS_LIMITS } from '../../config/gas';
import { contract, domain } from '../../types';

/**
 * Adapter that wraps the BattleNadsEntrypoint contract
 * Provides typed functions for all contract interactions
 */
export class BattleNadsAdapter {
  private readonly contract: Contract;
  private readonly provider: Provider;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new Contract(address, ENTRY_ABI, providerOrSigner);
    
    // Extract provider from signer if needed
    if ('provider' in providerOrSigner && providerOrSigner.provider) {
      this.provider = providerOrSigner.provider;
    } else {
      this.provider = providerOrSigner as Provider;
    }
  }

  // UTILITY OPERATIONS
  
  /**
   * Gets the latest block number from the provider
   */
  async getLatestBlockNumber(): Promise<bigint> {
    const blockNumber = await this.provider.getBlockNumber();
    return BigInt(blockNumber);
  }

  // READ OPERATIONS

  /**
   * Polls for frontend data from the contract
   */
  async pollFrontendData(owner: string, startBlock: bigint): Promise<contract.PollFrontendDataReturn> {
    const rawData = await this.contract.pollForFrontendData(owner, startBlock);
    
    
    
    return rawData;
  }

  /**
   * Gets the session key data for an owner
   */
  async getCurrentSessionKeyData(owner: string): Promise<contract.SessionKeyData> {
    const data = await this.contract.getCurrentSessionKeyData(owner);
    return data;
  }

  /**
   * Checks if a session key is expired
   */
  async isSessionKeyExpired(characterId: string): Promise<boolean> {
    return this.contract.isSessionKeyExpired(characterId);
  }

  /**
   * Gets event and chat logs for a specific block range
   */
  async getDataFeed(owner: string, startBlock: bigint, endBlock: bigint): Promise<contract.DataFeed[]> {
    return this.contract.getDataFeed(owner, startBlock, endBlock);
  }

  /**
   * Gets the character ID associated with an owner address
   */
  async getPlayerCharacterID(owner: string): Promise<string> {
    return this.contract.getPlayerCharacterID(owner);
  }

  /**
   * Gets full detailed data for a character
   */
  async getBattleNad(characterId: string): Promise<contract.Character> {
    return this.contract.getBattleNad(characterId);
  }

  /**
   * Gets lightweight data for a character
   */
  async getBattleNadLite(characterId: string): Promise<contract.CharacterLite> {
    return this.contract.getBattleNadLite(characterId);
  }

  /**
   * Calculates the additional MON needed to meet recommended balance
   */
  async shortfallToRecommendedBalanceInMON(characterId: string): Promise<bigint> {
    return this.contract.shortfallToRecommendedBalanceInMON(characterId);
  }

  /**
   * Estimates the total MON required for creating a character
   */
  async estimateBuyInAmountInMON(): Promise<bigint> {
    return this.contract.estimateBuyInAmountInMON();
  }

  /**
   * Gets the display name for a weapon ID
   */
  async getWeaponName(weaponId: number): Promise<string> {
    return this.contract.getWeaponName(weaponId);
  }

  /**
   * Gets the display name for an armor ID
   */
  async getArmorName(armorId: number): Promise<string> {
    return this.contract.getArmorName(armorId);
  }

  /**
   * Gets full weapon data by weapon ID
   */
  async getWeapon(weaponId: number): Promise<contract.Weapon> {
    return this.contract.getWeapon(weaponId);
  }

  /**
   * Gets full armor data by armor ID
   */
  async getArmor(armorId: number): Promise<contract.Armor> {
    return this.contract.getArmor(armorId);
  }

  // MOVEMENT OPERATIONS

  /**
   * Moves the character north
   */
  async moveNorth(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveNorth(characterId, { gasLimit: GAS_LIMITS.move });
  }

  /**
   * Moves the character south
   */
  async moveSouth(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveSouth(characterId, { gasLimit: GAS_LIMITS.move });
  }

  /**
   * Moves the character east
   */
  async moveEast(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveEast(characterId, { gasLimit: GAS_LIMITS.move });
  }

  /**
   * Moves the character west
   */
  async moveWest(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveWest(characterId, { gasLimit: GAS_LIMITS.move });
  }

  /**
   * Moves the character up
   */
  async moveUp(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveUp(characterId, { gasLimit: GAS_LIMITS.move });
  }

  /**
   * Moves the character down
   */
  async moveDown(characterId: string): Promise<TransactionResponse> {
    return this.contract.moveDown(characterId, { gasLimit: GAS_LIMITS.move });
  }

  // COMBAT OPERATIONS

  /**
   * Attacks a target
   */
  async attack(characterId: string, targetIndex: number): Promise<TransactionResponse> {
    return this.contract.attack(characterId, targetIndex, { gasLimit: GAS_LIMITS.action });
  }

  /**
   * Uses an ability
   */
  async useAbility(characterId: string, ability: domain.Ability, targetIndex: number): Promise<TransactionResponse> {
    // Map global ability enum to class-specific ability index (1 or 2)
    const abilityIndex = getClassSpecificAbilityIndex(ability);
    return this.contract.useAbility(characterId, targetIndex, abilityIndex, { gasLimit: GAS_LIMITS.action });
  }

  // EQUIPMENT OPERATIONS

  /**
   * Equips a weapon
   */
  async equipWeapon(characterId: string, weaponId: number): Promise<TransactionResponse> {
    return this.contract.equipWeapon(characterId, weaponId, { gasLimit: GAS_LIMITS.action });
  }

  /**
   * Equips armor
   */
  async equipArmor(characterId: string, armorId: number): Promise<TransactionResponse> {
    return this.contract.equipArmor(characterId, armorId, { gasLimit: GAS_LIMITS.action });
  }

  // CHARACTER OPERATIONS

  /**
   * Creates a new character using name, stats, and optional session key info.
   */
  async createCharacter(
    name: string,
    strength: bigint,
    vitality: bigint,
    dexterity: bigint,
    quickness: bigint,
    sturdiness: bigint,
    luck: bigint,
    sessionKey: string,
    sessionKeyDeadline: bigint,
    value: bigint
  ): Promise<TransactionResponse> {
    return this.contract.createCharacter(
      name, 
      strength, 
      vitality, 
      dexterity, 
      quickness, 
      sturdiness, 
      luck, 
      sessionKey, 
      sessionKeyDeadline, 
      { 
        gasLimit: 1200000,
        value: value
      }
    );
  }

  /**
   * Allocates attribute points
   */
  async allocatePoints(
    characterId: string,
    strength: bigint,
    vitality: bigint,
    dexterity: bigint,
    quickness: bigint,
    sturdiness: bigint,
    luck: bigint
  ): Promise<TransactionResponse> {
    return this.contract.allocatePoints(
      characterId,
      strength,
      vitality,
      dexterity,
      quickness,
      sturdiness,
      luck,
      { gasLimit: GAS_LIMITS.action }
    );
  }

  /**
   * Permanently deletes a character
   */
  async ascend(characterId: string): Promise<TransactionResponse> {
    return this.contract.ascend(characterId, { gasLimit: GAS_LIMITS.action });
  }

  // SESSION KEY OPERATIONS

  /**
   * Updates the session key for a user's account
   */
  async updateSessionKey(
    sessionKeyAddress: string,
    expiration: bigint,
    value: bigint
  ): Promise<TransactionResponse> {
    return this.contract.updateSessionKey(
      sessionKeyAddress,
      expiration,
      { 
        gasLimit: GAS_LIMITS.sessionKey, 
        value: value
      }
    );
  }

  /**
   * Adds funds to session key and bonds remaining as shMON
   */
  async replenishGasBalance(value: bigint = BigInt(0)): Promise<TransactionResponse> {
    return this.contract.replenishGasBalance({ 
      gasLimit: GAS_LIMITS.sessionKey,
      value 
    });
  }

  /**
   * Deactivates a session key
   */
  async deactivateSessionKey(
    sessionKeyAddress: string,
    value: bigint = BigInt(0)
  ): Promise<TransactionResponse> {
    return this.contract.deactivateSessionKey(
      sessionKeyAddress,
      { 
        gasLimit: GAS_LIMITS.sessionKey,
        value
      }
    );
  }

  // SOCIAL OPERATIONS

  /**
   * Sends a chat message using the zoneChat contract method
   * Does not set explicit gas limit to allow embedded wallet to handle it
   */
  async zoneChat(characterId: string, message: string): Promise<TransactionResponse> {
    console.log(`[BattleNadsAdapter] Calling zoneChat contract method for character ${characterId} with message: "${message}"`);
    
    try {
      // Don't include explicit gas limit - let embedded wallet optimize this
      const tx = await this.contract.zoneChat(characterId, message);
      console.log(`[BattleNadsAdapter] zoneChat transaction sent. Hash: ${tx.hash}`);
      return tx;
    } catch (error) {
      console.error(`[BattleNadsAdapter] Error executing zoneChat:`, error);
      throw error;
    }
  }
}

/**
 * Maps global ability enum to class-specific ability index (1 or 2)
 * Each character class only supports ability indices 1 and 2
 * 
 * Contract expects:
 * - Bard: 1=SingSong, 2=DoDance
 * - Warrior: 1=ShieldWall, 2=ShieldBash  
 * - Rogue: 1=EvasiveManeuvers, 2=ApplyPoison
 * - Monk: 1=Pray, 2=Smite
 * - Sorcerer: 1=ChargeUp, 2=Fireball
 */
function getClassSpecificAbilityIndex(ability: domain.Ability): number {
  switch (ability) {
    // Bard abilities (class 4)
    case domain.Ability.SingSong:
      return 1;
    case domain.Ability.DoDance:
      return 2;
    
    // Warrior abilities (class 5)
    case domain.Ability.ShieldWall:
      return 1;
    case domain.Ability.ShieldBash:
      return 2;
    
    // Rogue abilities (class 6)
    case domain.Ability.EvasiveManeuvers:
      return 1;
    case domain.Ability.ApplyPoison:
      return 2;
    
    // Monk abilities (class 7)
    case domain.Ability.Pray:
      return 1;
    case domain.Ability.Smite:
      return 2;
    
    // Sorcerer abilities (class 8)
    case domain.Ability.ChargeUp:
      return 1;
    case domain.Ability.Fireball:
      return 2;
    
    case domain.Ability.None:
    default:
      throw new Error(`Invalid or unsupported ability: ${domain.Ability[ability] || ability}. Only class-specific abilities (indices 1-2) are supported.`);
  }
}


 