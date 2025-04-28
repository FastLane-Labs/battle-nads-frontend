import { TransactionResponse } from 'ethers';
import { BattleNadsAdapter } from '../adapters/BattleNadsAdapter';
import * as CT from '../../types/contracts/BattleNadsEntrypoint';
import { 
  SessionWalletMissingError, 
  WalletMissingError, 
  InvalidMovementError,
  ContractCallError,
  ContractTransactionError 
} from '../../errors';

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
   * Gets a complete UI snapshot for the game
   */
  async getUiSnapshot(owner: string, startBlock: bigint): Promise<CT.PollFrontendDataReturn> {
    try {
      return await this.readAdapter.pollFrontendData(owner, startBlock);
    } catch (error) {
      throw new ContractCallError(`Failed to get UI snapshot: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the current session key for a character
   */
  async getSessionKey(characterId: string): Promise<CT.SessionKeyData> {
    try {
      return await this.readAdapter.getSessionKey(characterId);
    } catch (error) {
      throw new ContractCallError(`Failed to get session key: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the session key is expired
   */
  async isSessionKeyExpired(characterId: string): Promise<boolean> {
    try {
      return await this.readAdapter.isSessionKeyExpired(characterId);
    } catch (error) {
      throw new ContractCallError(`Failed to check session key expiration: ${(error as Error).message}`);
    }
  }

  // CHARACTER MANAGEMENT

  /**
   * Creates a new character
   * Requires owner wallet
   */
  async createCharacter(
    characterClass: CT.CharacterClass,
    name: string
  ): Promise<TransactionResponse> {
    try {
      return await this.ensureOwnerAdapter().createCharacter(characterClass, name);
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to create character: ${(error as Error).message}`);
    }
  }

  /**
   * Updates the session key for a character
   * Requires owner wallet
   */
  async updateSessionKey(
    characterId: string,
    sessionKey: string,
    expirationBlocks: number = 100000
  ): Promise<TransactionResponse> {
    try {
      return await this.ensureOwnerAdapter().updateSessionKey(characterId, sessionKey, expirationBlocks);
    } catch (error) {
      if (error instanceof WalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to update session key: ${(error as Error).message}`);
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

  // MOVEMENT

  /**
   * Moves the character in the specified direction
   * Requires session wallet
   */
  async moveCharacter(characterId: string, direction: CT.Direction): Promise<TransactionResponse> {
    try {
      const adapter = this.ensureSessionAdapter();
      
      switch (direction) {
        case CT.Direction.NORTH:
          return await adapter.moveNorth(characterId);
        case CT.Direction.SOUTH:
          return await adapter.moveSouth(characterId);
        case CT.Direction.EAST:
          return await adapter.moveEast(characterId);
        case CT.Direction.WEST:
          return await adapter.moveWest(characterId);
        case CT.Direction.UP:
          return await adapter.moveUp(characterId);
        case CT.Direction.DOWN:
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
   * Requires session wallet
   */
  async useAbility(
    characterId: string,
    ability: CT.Ability,
    targetIndex: number
  ): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().useAbility(characterId, ability, targetIndex);
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
   * Sends a chat message
   * Requires session wallet
   */
  async chat(characterId: string, message: string): Promise<TransactionResponse> {
    try {
      return await this.ensureSessionAdapter().zoneChat(characterId, message);
    } catch (error) {
      if (error instanceof SessionWalletMissingError) {
        throw error;
      }
      throw new ContractTransactionError(`Failed to send chat message: ${(error as Error).message}`);
    }
  }
} 