# Battle Nads - Complete Player Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Core Game Systems](#core-game-systems)
- [Economic System](#economic-system)
- [Character Creation & Progression](#character-creation--progression)
- [Combat System](#combat-system)
- [Movement & Exploration](#movement--exploration)
- [Equipment System](#equipment-system)
- [Death & Revival](#death--revival)
- [Session Keys & Gas Management](#session-keys--gas-management)
- [Task System](#task-system)
- [Social Features](#social-features)
- [Advanced Strategies](#advanced-strategies)
- [Troubleshooting](#troubleshooting)

## Getting Started

### What is Battle Nads?
Battle Nads is a blockchain-based tactical RPG where players create characters, explore dungeons, engage in combat, and compete for economic rewards. The game runs autonomously on-chain using an innovative task system that automates character actions.

### Creating Your First Character
1. **Buy-in Requirement**: You need approximately 0.15 MON tokens (0.1 for buy-in + 0.05 minimum bonded)
2. **Character Creation**: Choose your character name and allocate 32 stat points across 6 attributes
3. **Session Key Setup**: Optionally create a session key for gasless transactions
4. **Spawn Delay**: Your character will spawn after 8 blocks (~2-3 minutes)

### Minimum Requirements
- **MON Tokens**: ~0.15 MON for character creation
- **Gas Budget**: Additional MON for transaction fees if not using session keys
- **Task Maintenance**: Characters require ongoing MON for automated task execution

## Core Game Systems

### Character Attributes
- **Strength**: Primary damage scaling, affects weapon damage
- **Vitality**: Health pool and regeneration rate
- **Dexterity**: Hit chance and minor damage bonus
- **Quickness**: Turn speed and hit chance
- **Sturdiness**: Health pool and damage resistance
- **Luck**: Critical hits, turn speed, and hit chance

### Character Classes
Each class provides unique stat bonuses and abilities:

#### Warrior
- **Bonuses**: +3 Strength, +2 Vitality, -1 Quickness
- **Abilities**: Shield Bash, Shield Wall
- **Playstyle**: Tank/DPS hybrid, excellent survivability
- **Health Bonus**: +30 per level + 50 base

#### Rogue  
- **Bonuses**: +3 Dexterity, +2 Quickness, +1 Luck, -1 Strength
- **Abilities**: Evasive Maneuvers, Apply Poison
- **Playstyle**: High damage, poison specialist
- **Health Penalty**: -20 per level - 100 base

#### Monk (Cleric)
- **Bonuses**: +2 Sturdiness, +2 Luck, -1 Dexterity
- **Abilities**: Pray, Smite
- **Playstyle**: Support and healing specialist
- **Health Bonus**: +20 per level

#### Sorcerer (Mage)
- **Bonuses**: -1 Strength, -1 Vitality, -1 Sturdiness
- **Abilities**: Charge Up, Fireball
- **Playstyle**: Magical damage specialist
- **Health Penalty**: -30 per level - 50 base

#### Bard
- **Bonuses**: -1 to all stats
- **Abilities**: Sing Song, Do Dance
- **Playstyle**: Unique mechanics, high risk/reward
- **Health Penalty**: -40 per level - 100 base

## Economic System

### shMON Token System
Battle Nads uses a sophisticated economic model based on shMON (staked MON) tokens:

#### Key Economic Concepts
- **Buy-in Amount**: 0.1 shMON required to create a character
- **Bonded Balance**: Minimum 0.05 shMON must stay bonded for task execution
- **Yield Boosting**: 25% of defeated player balances boost yield for all holders
- **Balance Distribution**: 75% to players, 20% to monsters, 5% system fees

#### Player Balance Management
- Characters earn shMON by defeating other players and monsters
- Death redistributes your balance to the victor and monster pool
- Higher level players give more balance when defeated
- Level differences affect balance distribution ratios

#### Task Cost Economics
- Each automated action (combat turn, spawn, ability) costs gas
- Estimated task costs: ~0.003-0.005 MON per action
- Characters need enough bonded balance to maintain their task schedule
- Low balance characters risk deletion if they can't pay for tasks

### Economic Strategies
1. **Efficient Leveling**: Balance aggressive play with survival
2. **Balance Management**: Keep enough bonded MON for extended gameplay
3. **Target Selection**: Choose fights wisely based on risk/reward
4. **Death Timing**: Sometimes retreating (ascending) is more profitable than risking death

## Character Creation & Progression

### Stat Allocation Strategy
You have 32 points to distribute across 6 attributes. Consider these builds:

#### Balanced Fighter (Recommended for beginners)
- Strength: 6, Vitality: 6, Dexterity: 5, Quickness: 5, Sturdiness: 5, Luck: 5

#### Glass Cannon
- Strength: 10, Vitality: 3, Dexterity: 8, Quickness: 6, Sturdiness: 3, Luck: 2

#### Tank Build  
- Strength: 4, Vitality: 8, Dexterity: 4, Quickness: 4, Sturdiness: 8, Luck: 4

### Level Progression
- **Experience Gain**: Defeating enemies grants XP based on their level
- **PvP Bonus**: Defeating players gives 3x experience bonus
- **Level Scaling**: Higher levels increase health, combat effectiveness
- **Max Level**: 50 (game balance prevents excessive level gaps)
- **Stat Points**: Gain 1 allocatable stat point per level

### Equipment Progression
- **Starting Gear**: Each character begins with class-appropriate weapon and armor
- **Loot System**: Defeating enemies has a chance to drop better equipment
- **Equipment Scaling**: Higher level enemies drop better gear
- **Inventory Limits**: Limited inventory space requires strategic equipment management

## Combat System

### Combat Mechanics
Combat in Battle Nads is turn-based with the following flow:

#### Initiative System
- Turn order based on: (Quickness + Luck) with random elements
- Lower cooldown = more frequent turns
- Base turn time: 8 blocks, minimum 3 blocks

#### Hit Calculation
```
To Hit = ((Dexterity + Weapon Accuracy) * Hit Modifier + Luck + Quickness) / Hit Modifier
Defense = (Dexterity + Luck + Quickness) / Evasion Modifier
Hit Chance = To Hit vs Defense roll
```

#### Damage Calculation
```
Offense = (Strength + Weapon Damage + Dexterity) / Base Offense
Defense = (Sturdiness + Armor Rating) / Base Defense  
Damage = Offense - Defense (minimum 1)
```

#### Health & Regeneration
- **Max Health**: (1000 + Level * 50 + Vitality * 100 + Sturdiness * 20) for players
- **Regeneration**: Vitality * 5 per turn
- **Combat Healing**: Most healing effects are reduced during combat

### Combat States & Effects

#### Status Effects
- **Poisoned**: Damage over time, affects regeneration
- **Blessed**: Enhanced combat performance
- **Praying**: Doubles health regeneration
- **Cursed**: Prevents health regeneration
- **Stunned**: Severe accuracy penalty

#### Boss Encounters
- **Boss Spawning**: Bosses appear at specific depth change coordinates
- **Aggro Range**: Bosses have extended aggro range (64 vs 12-22 for normal monsters)
- **Rewards**: Bosses typically offer superior loot and experience

### Combat Strategies
1. **Positioning**: Be aware of area occupancy limits (max 63 combatants per area)
2. **Target Selection**: Choose fights based on level, equipment, and current health
3. **Ability Timing**: Use class abilities strategically for maximum effect
4. **Retreat Options**: Know when to disengage or ascend to avoid death

## Movement & Exploration

### Dungeon Structure
Battle Nads features a 3D dungeon system:

#### Coordinate System
- **X-Axis**: 1-50 (West to East)
- **Y-Axis**: 1-50 (South to North) 
- **Depth**: 1-50 (Surface to Deep Underground)

#### Movement Rules
- **Adjacent Movement**: Can only move to adjacent tiles (no diagonal movement)
- **Single Axis**: Can only change one coordinate per move (X, Y, or Depth)
- **Combat Restriction**: Cannot move while in combat
- **Area Capacity**: Maximum 63 total combatants per area

#### Depth Progression (Moving Up/Down)
- **Depth Changes**: You can only move up or down at specific "staircase" coordinates
- **Location Requirement**: You must be at the exact staircase coordinates to change depth
- **Staircase Locations**: Each depth level has a unique staircase location calculated by a formula
- **Progressive Difficulty**: Deeper levels contain stronger monsters and better rewards

**How Depth Movement Works:**
1. **Find the Staircase**: You must navigate to specific X,Y coordinates that contain the "staircase"
2. **Staircase Formula**: 
   - From Depth 1 to 2: Staircase is at coordinates (25, 25)
   - Other depths: Based on formula using depth number and corner patterns
3. **Movement Commands**: 
   - `moveUp()` = Go deeper into dungeon (higher depth number)
   - `moveDown()` = Go closer to surface (lower depth number)
4. **Restrictions**: You can only change depth by 1 level at a time

**Example Staircase Locations:**
- Depth 1→2: (25, 25) - The main entrance staircase
- Depth 2→3: (15, 15) - Southwest corner pattern  
- Depth 3→4: (35, 35) - Northeast corner pattern
- Depth 4→5: (35, 15) - Southeast corner pattern
- Depth 5→6: (15, 35) - Northwest corner pattern
- Pattern repeats every 4 levels with increasing distance from center

### Exploration Mechanics

#### Spawn System
- **Initial Spawn**: Characters spawn at depth 1 in random valid locations
- **Spawn Criteria**: Locations with fewer than 16 total occupants preferred
- **Spawn Delay**: 8 blocks after character creation

#### Aggro System
- **Aggro Range**: 12 + current depth (max 22) for existing monsters
- **Level Scaling**: High-level players generate less aggro
- **Boss Aggro**: Bosses have fixed 64-tile aggro range
- **Spawn Chance**: 18/128 chance to spawn new monster when moving

### Navigation Strategies
1. **Safe Exploration**: Move cautiously in new areas to avoid overwhelming encounters
2. **Level Appropriate Zones**: Stay in areas matching your character level
3. **Finding Staircases**: Learn the staircase pattern to efficiently navigate between depths
4. **Boss Preparation**: Prepare thoroughly before approaching boss locations (bosses spawn at staircase coordinates)
5. **Escape Routes**: Always plan retreat paths before engaging in combat

### Depth Navigation Guide
**To Move Between Depths:**
1. Navigate to your current depth's staircase coordinates
2. Use `moveUp()` to go deeper (higher depth number) or `moveDown()` to go shallower
3. You'll arrive at the same coordinates on the new depth level

**Finding Staircase Coordinates:**
- **Depth 1**: Staircase at (25, 25) - center of the map
- **Other Depths**: Use the pattern:
  - Depth % 4 = 2: Southwest (subtract from 25,25)
  - Depth % 4 = 3: Northeast (add to 25,25)  
  - Depth % 4 = 0: Southeast (add X, subtract Y)
  - Depth % 4 = 1: Northwest (subtract X, add Y)
  - Distance increases with depth: 10 + (depth ÷ 4)

## Equipment System

### Equipment Types

#### Weapons (64 different types)
- **Damage Range**: Varies by weapon type and level requirement
- **Accuracy Bonus**: Affects hit chance in combat
- **Level Requirements**: Higher level weapons require character level
- **Special Properties**: Some weapons have unique combat effects

#### Armor (64 different types)  
- **Defense Rating**: Reduces incoming damage
- **Level Requirements**: Higher level armor requires character level
- **Class Restrictions**: Some armor types may have class preferences
- **Durability**: Equipment may degrade over time (implementation dependent)

### Loot System
- **Drop Chances**: Based on defeated enemy level and type
- **Quality Scaling**: Higher level enemies drop better equipment
- **Inventory Management**: Limited inventory space requires strategic decisions
- **Equipment Management**: Use the equipment panel to change weapons and armor

### Equipment Strategy
1. **Balanced Upgrades**: Upgrade weapons and armor proportionally
2. **Level Appropriate Gear**: Use equipment that matches your character level
3. **Class Synergy**: Choose equipment that complements your class abilities
4. **Inventory Optimization**: Keep only essential backup equipment

## Death & Revival

### Death Mechanics
When your character dies:

#### Immediate Effects
- **Health**: Drops to 0, character becomes inactive
- **Location**: Removed from current area
- **Combat**: All combat engagements end immediately
- **Tasks**: All scheduled tasks are cancelled

#### Economic Impact
- **Balance Loss**: Your entire shMON balance is redistributed
- **Victor Reward**: Killer receives majority of your balance
- **Yield Boost**: 25% of balance boosts yield for all shMON holders
- **Monster Pool**: Remaining balance may go to monster distribution pool

### Death Prevention
1. **Health Monitoring**: Keep track of your health status
2. **Strategic Retreat**: Use ascend command to cash out before death
3. **Combat Avoidance**: Don't engage fights you can't win
4. **Balance Management**: Don't risk more than you can afford to lose

### Recovery Options
- **Character Recreation**: Create a new character after death
- **Fresh Start**: New character begins with basic equipment and stats
- **Economic Reset**: Must invest new buy-in amount for new character

## Session Keys & Gas Management

### Session Key System
Session keys enable gasless gameplay by pre-authorizing transactions:

#### Key Benefits
- **Gasless Transactions**: Play without paying gas for each action
- **Automated Gameplay**: Characters can act autonomously
- **Cost Efficiency**: Bulk gas payment reduces per-transaction costs
- **User Experience**: Seamless gameplay without constant wallet interactions

#### Session Key Setup
1. **Key Creation**: Generate a new wallet address for your session key
2. **Authorization**: Authorize the session key with expiration time
3. **Funding**: Deposit MON to cover expected gas costs
4. **Activation**: Session key becomes active for specified duration

#### Session Key Management
- **Expiration**: Keys expire after set time period
- **Balance Monitoring**: Keep sufficient balance for gas costs
- **Security**: Session keys have limited permissions
- **Renewal**: Extend or refresh keys as needed

### Gas Economics
Understanding gas costs helps optimize your gameplay:

#### Transaction Types & Costs
- **Character Creation**: ~850,000 gas + movement buffer
- **Movement**: ~400,000 gas additional buffer
- **Combat Actions**: ~299,000 gas per automated turn
- **Ability Usage**: Variable based on ability complexity
- **Administrative**: Lower gas for status checks, queries

#### Cost Optimization
1. **Session Key Usage**: Significantly reduces per-transaction costs
2. **Bulk Operations**: Combine multiple actions when possible
3. **Strategic Timing**: Time actions to minimize gas waste
4. **Balance Planning**: Maintain sufficient balance for extended play

## Task System

### Automated Gameplay
Battle Nads uses a sophisticated task system for autonomous character operation:

#### Task Types
- **Combat Tasks**: Automated combat turn execution
- **Spawn Tasks**: Character spawning after creation
- **Ability Tasks**: Multi-stage ability execution
- **Movement Tasks**: Location change processing

#### Task Economics
- **Task Costs**: Each task execution costs MON from your bonded balance
- **Scheduling**: Tasks are scheduled for future block execution
- **Priority**: Task execution follows priority and gas availability
- **Failure Handling**: Failed tasks may be rescheduled or cancelled

### Task Management
Players need to understand task implications:

#### Bonded Balance Requirements
- Characters need sufficient bonded MON to maintain task schedule
- Low balance characters risk task cancellation and character deletion
- Recommended balance: Minimum 0.05 shMON + 32x estimated task costs

#### Task Monitoring
1. **Balance Tracking**: Monitor your bonded balance regularly
2. **Task Costs**: Understand approximate costs for different actions
3. **Failure Recovery**: Know how to handle task scheduling failures
4. **Emergency Funding**: Have backup MON available for emergency funding

## Social Features

### Player Interaction
Battle Nads includes various social and competitive elements:

#### Combat Interaction
- **PvP Combat**: Direct player vs player combat with higher rewards
- **Area Sharing**: Multiple players can occupy the same area
- **Combat Spectating**: Other players can observe ongoing fights
- **Reputation**: Player performance may affect social standing

#### Communication Systems
- **Chat Logs**: In-game messaging system for player communication
- **Combat Logs**: Detailed logs of combat actions and results
- **Area Events**: Notifications about significant area events
- **Player Status**: Public visibility of player stats and equipment

### Community Features
1. **Guild Systems**: Player organizations for mutual support (if implemented)
2. **Tournaments**: Organized competitive events (if implemented)
3. **Leaderboards**: Rankings by level, wealth, or achievements
4. **Market Systems**: Player-to-player trading and economic interaction

## Advanced Strategies

### Economic Optimization
1. **Balance Cycling**: Maintain optimal balance between risk and reward
2. **Market Timing**: Understand economic cycles and player behavior
3. **Resource Allocation**: Efficiently distribute resources between growth and safety
4. **Yield Maximization**: Leverage yield boost mechanics for passive income

### Combat Mastery
1. **Build Optimization**: Create specialized builds for specific playstyles
2. **Ability Synergy**: Combine class abilities for maximum effectiveness
3. **Positioning Strategy**: Control area occupancy and combat positioning
4. **Meta Analysis**: Understand current competitive landscape and adapt

### Long-term Planning
1. **Character Development**: Plan stat allocation and equipment progression
2. **Economic Sustainability**: Maintain long-term economic viability
3. **Risk Management**: Balance aggressive play with survival needs
4. **Community Engagement**: Build relationships and alliances with other players

## Troubleshooting

### Common Issues

#### Character Creation Problems
- **Insufficient Funds**: Ensure you have enough MON for buy-in + gas
- **Invalid Stats**: Verify stat allocation totals exactly 32 points
- **Spawn Delays**: Characters spawn after 8 blocks, be patient
- **Gas Estimation**: Use estimateBuyInAmountInMON() for accurate costs

#### Gameplay Issues
- **Movement Restrictions**: Cannot move while in combat
- **Task Failures**: Check bonded balance for task execution
- **Combat Delays**: Combat actions are automated, expect delays
- **Balance Depletion**: Monitor bonded balance to prevent character deletion

#### Technical Problems
- **Transaction Failures**: Check gas limits and session key status
- **Session Key Expiry**: Renew expired session keys
- **Network Issues**: Verify blockchain network status
- **Contract Interaction**: Ensure proper contract addresses and ABIs

### Support Resources
1. **Game Documentation**: Comprehensive guides and references
2. **Community Forums**: Player discussions and support
3. **Developer Channels**: Official announcements and updates
4. **Technical Support**: Direct assistance for complex issues

### Best Practices
1. **Start Small**: Begin with conservative strategies until you understand the game
2. **Stay Informed**: Keep up with game updates and community discussions
3. **Risk Management**: Never invest more than you can afford to lose
4. **Continuous Learning**: Study combat logs and other players' strategies

---

*This guide covers the essential systems every Battle Nads player should understand. The game is complex and constantly evolving, so stay engaged with the community and keep learning as you play.* 