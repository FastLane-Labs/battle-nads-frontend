import { Contract, Signer, Provider, TransactionResponse } from 'ethers';
import ENTRY_ABI from '../../abis/battleNads.json';
import { GAS_LIMITS } from '../../config/gas';
import { 
  DataFeed, 
  BattleNad, 
  BattleNadLite, 
  SessionKeyData,
  PollFrontendDataReturn,
  Direction,
  Ability,
  CharacterClass
} from '../../types';

/**
 * Adapter that wraps the BattleNadsEntrypoint contract
 * Provides typed functions for all contract interactions
 */
export class BattleNadsAdapter {
  private readonly contract: Contract;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new Contract(address, ENTRY_ABI, providerOrSigner);
  }

  // READ OPERATIONS

  /**
   * Polls for frontend data from the contract
   */
  async pollFrontendData(owner: string, startBlock: bigint): Promise<PollFrontendDataReturn> {
    return this.contract.pollForFrontendData(owner, startBlock);
  }

  /**
   * Gets the session key for a character
   */
  async getSessionKey(characterId: string): Promise<SessionKeyData> {
    return this.contract.getSessionKey(characterId);
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
  async getDataFeed(owner: string, startBlock: bigint, endBlock: bigint): Promise<DataFeed[]> {
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
  async getBattleNad(characterId: string): Promise<BattleNad> {
    return this.contract.getBattleNad(characterId);
  }

  /**
   * Gets lightweight data for a character
   */
  async getBattleNadLite(characterId: string): Promise<BattleNadLite> {
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
  async useAbility(characterId: string, ability: Ability, targetIndex: number): Promise<TransactionResponse> {
    return this.contract.useAbility(characterId, targetIndex, ability, { gasLimit: GAS_LIMITS.action });
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
   * Creates a new character
   */
  async createCharacter(
    characterClass: CharacterClass,
    name: string
  ): Promise<TransactionResponse> {
    return this.contract.createCharacter(characterClass, name, { gasLimit: GAS_LIMITS.action });
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
  async sepukku(characterId: string): Promise<TransactionResponse> {
    return this.contract.sepukku(characterId, { gasLimit: GAS_LIMITS.action });
  }

  // SESSION KEY OPERATIONS

  /**
   * Updates the session key for a character
   */
  async updateSessionKey(
    characterId: string,
    sessionKey: string,
    expirationBlocks: number = 100000
  ): Promise<TransactionResponse> {
    return this.contract.updateSessionKey(
      characterId,
      sessionKey,
      expirationBlocks,
      { gasLimit: GAS_LIMITS.sessionKey }
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
   * Sends a chat message
   */
  async zoneChat(characterId: string, message: string): Promise<TransactionResponse> {
    return this.contract.zoneChat(characterId, message, { gasLimit: GAS_LIMITS.action });
  }
} 
} 