import { ethers } from 'ethers';
import { BattleNad } from './types';

// ABI for the BattleNadsEntrypoint contract
// This is a simplified ABI focused on the functions we need
const BattleNadsABI = [
  // View functions
  "function getBattleNad(bytes32 characterID) public view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner) character)",
  "function getBattleNadsInArea(uint8 depth, uint8 x, uint8 y) public view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner)[] characters)",
  "function estimateBuyInAmountInMON() external view returns (uint256 minAmount)",
  "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)",

  // Action functions
  "function createCharacter(string memory name, uint256 strength, uint256 vitality, uint256 dexterity, uint256 quickness, uint256 sturdiness, uint256 luck, address sessionKey, uint256 sessionKeyDeadline) external payable returns (bytes32 characterID)",
  "function moveNorth(bytes32 characterID) external",
  "function moveSouth(bytes32 characterID) external",
  "function moveEast(bytes32 characterID) external",
  "function moveWest(bytes32 characterID) external",
  "function moveUp(bytes32 characterID) external",
  "function moveDown(bytes32 characterID) external",
  "function attack(bytes32 characterID, uint256 targetIndex) external",
  "function equipWeapon(bytes32 characterID, uint8 weaponID) external",
  "function equipArmor(bytes32 characterID, uint8 armorID) external",
  "function allocatePoints(bytes32 characterID, uint256 newStrength, uint256 newVitality, uint256 newDexterity, uint256 newQuickness, uint256 newSturdiness, uint256 newLuck) external",
  "function updateSessionKey(address sessionKey, uint256 sessionKeyDeadline) external payable returns (address previousKey, uint256 balanceOnPreviousKey)",
  "function replenishGasBalance() external payable",
];

// Contract address (replace with the actual contract address when deployed)
export const CONTRACT_ADDRESS = '0xDA7C3498Ec071d736565EcC9595F103E1DC56d42';

export class BattleNadsContract {
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    if (signer) {
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, BattleNadsABI, signer);
    } else {
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, BattleNadsABI, provider);
    }
  }

  // View functions
  async getBattleNad(characterId: string): Promise<BattleNad> {
    return this.contract.getBattleNad(characterId);
  }

  async getBattleNadsInArea(depth: number, x: number, y: number): Promise<BattleNad[]> {
    return this.contract.getBattleNadsInArea(depth, x, y);
  }

  async estimateBuyInAmount(): Promise<string> {
    const amount = await this.contract.estimateBuyInAmountInMON();
    return amount.toString();
  }

  async shortfallToRecommendedBalance(characterId: string): Promise<string> {
    const amount = await this.contract.shortfallToRecommendedBalanceInMON(characterId);
    return amount.toString();
  }

  // Action functions
  async createCharacter(
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    sessionKey: string,
    sessionKeyDeadline: number,
    value: string
  ): Promise<string> {
    const tx = await this.contract.createCharacter(
      name,
      strength,
      vitality,
      dexterity,
      quickness,
      sturdiness,
      luck,
      sessionKey,
      sessionKeyDeadline,
      { value: ethers.parseEther(value) }
    );
    const receipt = await tx.wait();
    
    // Extract character ID from event logs (this is a simplified approach)
    // In a real implementation, you'd parse the event logs to get the characterID
    return receipt.transactionHash;
  }

  async moveNorth(characterId: string): Promise<void> {
    const tx = await this.contract.moveNorth(characterId);
    await tx.wait();
  }

  async moveSouth(characterId: string): Promise<void> {
    const tx = await this.contract.moveSouth(characterId);
    await tx.wait();
  }

  async moveEast(characterId: string): Promise<void> {
    const tx = await this.contract.moveEast(characterId);
    await tx.wait();
  }

  async moveWest(characterId: string): Promise<void> {
    const tx = await this.contract.moveWest(characterId);
    await tx.wait();
  }

  async moveUp(characterId: string): Promise<void> {
    const tx = await this.contract.moveUp(characterId);
    await tx.wait();
  }

  async moveDown(characterId: string): Promise<void> {
    const tx = await this.contract.moveDown(characterId);
    await tx.wait();
  }

  async attack(characterId: string, targetIndex: number): Promise<void> {
    const tx = await this.contract.attack(characterId, targetIndex);
    await tx.wait();
  }

  async equipWeapon(characterId: string, weaponId: number): Promise<void> {
    const tx = await this.contract.equipWeapon(characterId, weaponId);
    await tx.wait();
  }

  async equipArmor(characterId: string, armorId: number): Promise<void> {
    const tx = await this.contract.equipArmor(characterId, armorId);
    await tx.wait();
  }

  async allocatePoints(
    characterId: string, 
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ): Promise<void> {
    const tx = await this.contract.allocatePoints(
      characterId,
      strength,
      vitality,
      dexterity,
      quickness,
      sturdiness,
      luck
    );
    await tx.wait();
  }

  async updateSessionKey(
    sessionKey: string,
    sessionKeyDeadline: number,
    value: string
  ): Promise<{ previousKey: string, balanceOnPreviousKey: string }> {
    const tx = await this.contract.updateSessionKey(
      sessionKey,
      sessionKeyDeadline,
      { value: ethers.parseEther(value) }
    );
    const receipt = await tx.wait();
    
    // In a real implementation, you'd parse the event logs to get the return values
    return { 
      previousKey: '0x0',
      balanceOnPreviousKey: '0' 
    };
  }

  async replenishGasBalance(value: string): Promise<void> {
    const tx = await this.contract.replenishGasBalance({ value: ethers.parseEther(value) });
    await tx.wait();
  }
} 