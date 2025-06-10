import { TransactionResponse } from 'ethers';
import { BattleNadsAdapter } from '../adapters/BattleNadsAdapter';
import { contract, domain } from '../../types';
import { 
  SessionWalletMissingError, 
  WalletMissingError, 
  InvalidMovementError,
  ContractCallError,
  ContractTransactionError 
} from '../../errors';
import { sessionKeyMachine } from '../../machines/gameStateMachine';

interface BattleNadsClientOptions {
  read: BattleNadsAdapter;
  owner: BattleNadsAdapter | null;
  session: BattleNadsAdapter | null;
}

/**
 * Domain facade for BattleNads game
 * Handles delegation to the appropriate adapter based on operation type
 */
export class BattleNadsClient {
  private readonly readAdapter: BattleNadsAdapter;
  private readonly ownerAdapter: BattleNadsAdapter | null;
  private readonly sessionAdapter: BattleNadsAdapter | null;

  constructor(options: BattleNadsClientOptions) {
    this.readAdapter = options.read;
    this.ownerAdapter = options.owner;
    this.sessionAdapter = options.session;
  }

  // UTILITY METHODS

  /**
   * Checks if the session adapter is available
   */
  private ensureSessionAdapter(): BattleNadsAdapter {
    if (!this.sessionAdapter) {
      throw new SessionWalletMissingError('Session wallet not connected. Connect your session wallet to perform this action.');
    }
    return this.sessionAdapter;
  }

  /**
   * Checks if the owner adapter is available
   */
  private ensureOwnerAdapter(): BattleNadsAdapter {
    if (!this.ownerAdapter) {
      throw new WalletMissingError('Owner wallet not connected. Connect your wallet to perform this action.');
    }
    return this.ownerAdapter;
  }

  // DATA QUERIES

  /**
   * Gets the latest block number from the read adapter
   */
  async getLatestBlockNumber(): Promise<bigint> {
    try {
      return await this.readAdapter.getLatestBlockNumber();
    } catch (error) {
      throw new ContractCallError(`Failed to get latest block number: ${(error as Error).message}`);
    }
  }

  /**
   * Gets a complete UI snapshot for the game
   */
  async getUiSnapshot(owner: string, startBlock: bigint): Promise<contract.PollFrontendDataReturn> {
    try {
      return await this.readAdapter.pollFrontendData(owner, startBlock);
    } catch (error) {
      throw new ContractCallError(`Failed to get UI snapshot: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the current session key for an owner address
   */
  async getCurrentSessionKeyData(owner: string): Promise<contract.SessionKeyData> {
    try {
      return await this.readAdapter.getCurrentSessionKeyData(owner);
    } catch (error) {
      throw new ContractCallError(`Failed to get session key data: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the session key is expired based on getCurrentSessionKeyData
   * This is a helper method since the contract doesn't provide this directly
   */
  async isSessionKeyExpired(owner: string): Promise<boolean> {
    try {
      const sessionKeyData = await this.getCurrentSessionKeyData(owner);
      const currentBlock = await this.readAdapter.getLatestBlockNumber();
      return !sessionKeyData.key || sessionKeyData.expiration <= currentBlock;
    } catch (error) {
      throw new ContractCallError(`Failed to check session key expiration: ${(error as Error).message}`);
    }
  }

  /**
   * Validates the session key using domain validation logic
   * Returns a complete validation result instead of just expired status
   */
  async validateSessionKey(owner: string): Promise<domain.SessionKeyValidation> {
    try {
      // Get the session key data from the contract
      const contractSessionKey = await this.readAdapter.getCurrentSessionKeyData(owner);
      
      // Convert contract session key data to domain session key data
      const domainSessionKey: domain.SessionKeyData = {
        key: contractSessionKey.key,
        expiry: String(contractSessionKey.expiration), // Convert bigint to string
        owner: owner,
        // Convert contract values (if they exist) or use default string '0'
        balance: String(contractSessionKey.balance ?? '0'), 
        targetBalance: String(contractSessionKey.targetBalance ?? '0'),
        ownerCommittedAmount: String(contractSessionKey.ownerCommittedAmount ?? '0'),
        ownerCommittedShares: String(contractSessionKey.ownerCommittedShares ?? '0')
      };
      
      // Get current block number instead of timestamp for correct validation
      const currentBlock = await this.readAdapter.getLatestBlockNumber();
      
      // Use the session key validation logic from the state machine
      return sessionKeyMachine.validate(domainSessionKey, owner, Number(currentBlock));
    } catch (error) {
      throw new ContractCallError(`Failed to validate session key: ${(error as Error).message}`);
    }
  }

  /**
   * Gets event logs and chat messages for a specific block range
   */
  async getDataFeed(owner: string, startBlock: bigint, endBlock: bigint): Promise<contract.DataFeed[]> {
    try {
      return await this.readAdapter.getDataFeed(owner, startBlock, endBlock);
    } catch (error) {
      throw new ContractCallError(`Failed to get data feed: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the character ID associated with an owner address
   */
  async getPlayerCharacterID(owner: string): Promise<string> {
    try {
      return await this.readAdapter.getPlayerCharacterID(owner);
    } catch (error) {
      throw new ContractCallError(`Failed to get player character ID: ${(error as Error).message}`);
    }
  }

  /**
   * Gets full detailed data for a character
   */
  async getBattleNad(characterId: string): Promise<contract.Character> {
    try {
      return await this.readAdapter.getBattleNad(characterId);
    } catch (error) {
      throw new ContractCallError(`Failed to get character data: ${(error as Error).message}`);
    }
  }

  /**
   * Gets lightweight data for a character
   */
  async getBattleNadLite(characterId: string): Promise<contract.CharacterLite> {
    try {
      return await this.readAdapter.getBattleNadLite(characterId);
    } catch (error) {
      throw new ContractCallError(`Failed to get character data: ${(error as Error).message}`);
    }
  }

  /**
   * Calculates the additional MON needed to meet recommended balance
   */
  async shortfallToRecommendedBalanceInMON(characterId: string): Promise<bigint> {
    try {
      return await this.readAdapter.shortfallToRecommendedBalanceInMON(characterId);
    } catch (error) {
      throw new ContractCallError(`Failed to calculate balance shortfall: ${(error as Error).message}`);
    }
  }

  /**
   * Estimates the total MON required for creating a character
   */
  async estimateBuyInAmountInMON(): Promise<bigint> {
    try {
      return await this.readAdapter.estimateBuyInAmountInMON();
    } catch (error) {
      throw new ContractCallError(`Failed to estimate buy-in amount: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the display name for a weapon ID
   */
  async getWeaponName(weaponId: number): Promise<string> {
    try {
      return await this.readAdapter.getWeaponName(weaponId);
    } catch (error) {
      throw new ContractCallError(`Failed to get weapon name: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the display name for an armor ID
   */
  async getArmorName(armorId: number): Promise<string> {
    try {
      return await this.readAdapter.getArmorName(armorId);
    } catch (error) {
      throw new ContractCallError(`Failed to get armor name: ${(error as Error).message}`);
    }
  }

  /**
   * Gets full weapon data by weapon ID
   */
  async getWeapon(weaponId: number): Promise<contract.Weapon> {
    try {
      return await this.readAdapter.getWeapon(weaponId);
    } catch (error) {
      throw new ContractCallError(`Failed to get weapon data: ${(error as Error).message}`);
    }
  }

  /**
   * Gets full armor data by armor ID
   */
  async getArmor(armorId: number): Promise<contract.Armor> {
    try {
      return await this.readAdapter.getArmor(armorId);
    } catch (error) {
      throw new ContractCallError(`Failed to get armor data: ${(error as Error).message}`);
    }
  }

  // CHARACTER MANAGEMENT

  /**
   * Creates a new character
   * Requires owner wallet
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
    try {
      return await this.ensureOwnerAdapter().createCharacter(
        name, 
        strength, 
        vitality, 
        dexterity, 
        quickness, 
        sturdiness, 
        luck, 
        sessionKey, 
        sessionKeyDeadline,
        value
      );
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to create character: ${(error as Error).message}`);
    }
  }

  /**
   * Updates the session key
   * Requires owner wallet
   */
  async updateSessionKey(
    sessionKeyAddress: string,
    expiration: bigint,
    value: bigint
  ): Promise<TransactionResponse> {
    try {
      return await this.ensureOwnerAdapter().updateSessionKey(sessionKeyAddress, expiration, value);
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to update session key: ${(error as Error).message}`);
    }
  }

  /**
   * Adds funds to session key and bonds remaining as shMON
   * Requires owner wallet
   */
  async replenishGasBalance(value: bigint = BigInt(0)): Promise<TransactionResponse> {
    try {
      return await this.ensureOwnerAdapter().replenishGasBalance(value);
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to replenish gas balance: ${(error as Error).message}`);
    }
  }

  /**
   * Deactivates a session key
   * Requires owner wallet
   */
  async deactivateSessionKey(
    sessionKeyAddress: string,
    value: bigint = BigInt(0)
  ): Promise<TransactionResponse> {
    try {
      return await this.ensureOwnerAdapter().deactivateSessionKey(sessionKeyAddress, value);
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to deactivate session key: ${(error as Error).message}`);
    }
  }

  /**
   * Allocates attribute points
   * Requires session wallet
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
    try {
      return await this.ensureSessionAdapter().allocatePoints(
        characterId,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to allocate points: ${(error as Error).message}`);
    }
  }

  /**
   * Permanently deletes a character
   * Requires session wallet
   */
  async ascend(characterId: string): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().ascend(characterId);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to delete character: ${(error as Error).message}`);
    }
  }

  // MOVEMENT

  /**
   * Moves the character in a specific direction
   * Requires session or owner wallet
   */
  async moveCharacter(characterId: string, direction: domain.Direction): Promise<TransactionResponse> {
    try {
      const adapter = this.sessionAdapter || this.ensureOwnerAdapter();
      
      switch (direction) {
        case domain.Direction.North:
          return await adapter.moveNorth(characterId);
        case domain.Direction.South:
          return await adapter.moveSouth(characterId);
        case domain.Direction.East:
          return await adapter.moveEast(characterId);
        case domain.Direction.West:
          return await adapter.moveWest(characterId);
        case domain.Direction.Up:
          return await adapter.moveUp(characterId);
        case domain.Direction.Down:
          return await adapter.moveDown(characterId);
        default:
          throw new InvalidMovementError(`Invalid direction: ${direction}`);
      }
    } catch (error) {
      if (error instanceof SessionWalletMissingError || error instanceof InvalidMovementError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to move character: ${(error as Error).message}`);
    }
  }

  // COMBAT

  /**
   * Attacks a target
   * Requires session wallet
   */
  async attack(characterId: string, targetIndex: number): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().attack(characterId, targetIndex);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to attack target: ${(error as Error).message}`);
    }
  }

  /**
   * Uses an ability
   * Requires session or owner wallet
   */
  async useAbility(
    characterId: string,
    ability: domain.Ability,
    targetIndex: number
  ): Promise<TransactionResponse> {
    try {
      const adapter = this.sessionAdapter || this.ensureOwnerAdapter();
      return await adapter.useAbility(characterId, ability, targetIndex);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to use ability: ${(error as Error).message}`);
    }
  }

  // EQUIPMENT

  /**
   * Equips a weapon
   * Requires session wallet
   */
  async equipWeapon(characterId: string, weaponId: number): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().equipWeapon(characterId, weaponId);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to equip weapon: ${(error as Error).message}`);
    }
  }

  /**
   * Equips armor
   * Requires session wallet
   */
  async equipArmor(characterId: string, armorId: number): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().equipArmor(characterId, armorId);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to equip armor: ${(error as Error).message}`);
    }
  }

  // SOCIAL

  /**
   * Sends a chat message using the embedded wallet through the zoneChat method
   * Requires embedded wallet (session adapter)
   */
  async chat(characterId: string, message: string): Promise<TransactionResponse> {
    try {
      console.log(`[BattleNadsClient] Sending chat message for character ${characterId}: "${message}"`);
      console.log(`[BattleNadsClient] Using embedded wallet (session adapter) to call zoneChat`);
      
      // Ensure we have a session adapter (embedded wallet)
      if (!this.sessionAdapter) {
        throw new SessionWalletMissingError('Embedded wallet not connected. Connect your embedded wallet to send chat messages.');
      }
      
      // Call zoneChat without explicit gas limits to allow the embedded wallet to handle it
      const result = await this.sessionAdapter.zoneChat(characterId, message);
      console.log(`[BattleNadsClient] Successfully sent chat message, tx hash: ${result.hash}`);
      return result;
    } catch (error) {
      console.error(`[BattleNadsClient] Error sending chat message:`, error);
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to send chat message: ${(error as Error).message}`);
    }
  }
} 