# Battle Nads: The Complete Guide

Welcome to the world of Battle Nads, where heroes venture through a 50-floor dungeon, battling monsters and collecting treasures in a fully on-chain tactical RPG.

## Quick Navigation

- [Starting Your Adventure](#starting-your-adventure)
- [Creating Your Hero](#creating-your-hero)
- [Exploring the Dungeon](#exploring-the-dungeon)
- [Combat & Abilities](#combat-abilities)
- [Death & Rebirth](#death-rebirth)
- [Treasures & Equipment](#treasures-equipment)
- [The shMON Economy](#the-shmon-economy)
- [Advanced Features](#advanced-features)
- [shMON Staking & RPC](#shmon-staking-enhanced-rpc)

---

## Starting Your Adventure

Battle Nads drops you into a 50-floor dungeon where every step could lead to glory or doom. Your heroes explore a three-dimensional world, initiate combat strategically, and collect shMON tokens along the way.

### What Makes Battle Nads Special

- **50-Floor Dungeon**: Explore depths from 1 to 50
- **Strategic Combat**: You choose when to attack, then defend automatically
- **Five Unique Classes**: Each with distinct abilities and playstyles
- **Gas Abstracted**: Transaction costs handled via session keys (requires management)
- **True Ownership**: Your heroes and items exist fully on-chain

### First Steps

1. Connect your wallet (or let the game create one for you)
2. Create your first hero (class assigned randomly)
3. Start exploring by clicking movement arrows
4. Choose when to engage monsters in combat
5. Collect shMON tokens and equipment

---

## Creating Your Hero

### Connecting to Battle Nads

The game uses a dual-wallet system for security and convenience:

**How It Works:**
1. Connect with your external wallet (MetaMask, Rainbow, etc.)
2. Sign a message to verify ownership
3. The game creates an embedded wallet managed by Privy
4. Your embedded wallet handles all game transactions

**Character Creation Process:**
- Fund your embedded wallet with MON tokens
- Stake MON to receive shMON (liquid staking token)
- Bond shMON to your character for auto-defense
- Start playing with gasless transactions

### Understanding Classes

Classes are randomly assigned when you create a hero. Each class offers a unique playstyle:

**⚔️ Warrior**
- High health and armor
- Shield-based abilities
- Perfect for beginners
- *"Tank through everything"*

**🗡️ Rogue**
- Quick strikes and evasion
- Poison attacks for damage over time
- Higher risk, higher reward
- *"Strike from the shadows"*

**🙏 Monk**
- Healing prayers and divine smites
- Support your future allies
- Balanced survivability
- *"Faith guides the way"*

**🔮 Sorcerer**
- Devastating magical attacks
- Charge up for massive damage
- Glass cannon playstyle
- *"Raw magical power"*

**🎵 Bard**
- The challenge class
- Abilities that... don't help much
- For experienced players only
- *"Dance with death"*

### Hero Stats Explained

When you create a hero, they spawn with:
- **Health**: Your life force (varies by class)
- **Damage**: Base attack power
- **Armor**: Reduces incoming damage
- **Speed**: Currently decorative (all heroes move the same)
- **shMON**: [Liquid staking token](https://shmonad.xyz) used for in-game currency and RPC staking

---

## Exploring the Dungeon

### The Three-Dimensional World

Battle Nads' dungeon exists in three dimensions:
- **X-axis**: East ← → West
- **Y-axis**: North ← → South  
- **Z-axis**: Up ← → Down (depth levels)

Each location can hold up to 64 heroes. The dungeon spans 50 floors from depth 1 to the deepest level at depth 50.

### Movement & Monster Encounters

**How Movement Works:**
1. Click any directional arrow to move
2. Your hero enters the new location (64 slots available)
3. If monsters spawn in your slot, combat begins automatically
4. Combat proceeds automatically once initiated
5. Movement is always possible (for state cleanup/recovery, but only allowed when not in combat)

**Monster Spawning:**
- Moving to a new location may spawn monsters
- Deeper levels (lower Z) have tougher enemies
- Monster strength scales with dungeon depth
- Each area generates monsters based on its coordinates

**Finding Staircases:**
- Special locations contain staircases
- Use them to move between depth levels
- Deeper levels = better rewards but harder monsters
- Boss monsters guard each staircase

**First 4 Staircase Locations:**
- Depth 1→2: **(25, 25)** - Center of the map
- Depth 2→3: **(35, 15)** - Southeast quadrant
- Depth 3→4: **(15, 35)** - Northwest quadrant
- Depth 4→5: **(14, 14)** - Southwest quadrant

### Player Interactions

**When Multiple Players Share a Location:**
- Attack other players for 3x experience rewards (PvP)
- Monks can heal allies in the same area
- Up to 64 entities can occupy one location
- Combat happens when entities share the same slot position within a location

### Navigation Tips

- Start by exploring horizontally (X/Y axes) at depth 1
- Build strength before venturing deeper
- Remember your path - respawning puts you back at origin
- Watch for other heroes' movements in the activity feed

---

## Combat & Abilities

### Strategic Combat System

When you encounter monsters:
1. You choose whether to attack (no retreat for spawned monsters)
2. Once you initiate combat, defense is automatic
3. Heroes and monsters take turns attacking
4. Your abilities activate based on cooldowns
5. Battle continues until one side falls

### Understanding Abilities

Each class has two unique abilities that define their combat style:

**⚔️ Warrior Abilities**
- **Shield Bash**: Stun enemies and deal damage (12-second cooldown)
- **Shield Wall**: Boost your defenses temporarily (12-second cooldown)

**🗡️ Rogue Abilities**
- **Evasive Maneuvers**: Dodge incoming attacks (9-second cooldown)
- **Apply Poison**: Inflict damage over time (32-second cooldown)

**🙏 Monk Abilities**
- **Pray**: Restore health over time (36-second cooldown)
- **Smite**: Call down divine damage (12-second cooldown)

**🔮 Sorcerer Abilities**
- **Fireball**: Blast enemies with magic (28-second cooldown)
- **Charge Up**: Boost your next attack (18-second cooldown)

**🎵 Bard Abilities**
- **Sing Song**: Confuse yourself (no cooldown)
- **Do Dance**: Distract yourself (no cooldown)

### Cooldown System

- Abilities use block-based timing (1 block = 0.5 seconds)
- Each ability has a unique cooldown period
- Cooldowns start after ability activation
- Plan your ability usage for maximum effectiveness

### Combat Flow

1. **Engagement**: Monster appears, combat begins
2. **Auto-Attack**: Heroes attack each round automatically  
3. **Ability Usage**: Special moves activate when ready
4. **Victory**: Defeat all monsters to claim the location
5. **Defeat**: Fall in battle and respawn at origin

---

## Death & Rebirth

### The Cycle of Heroes

Death isn't the end in Battle Nads:

**When You Fall:**
- Your hero respawns at origin (25, 25, 1)
- You lose your entire character balance (shMON earned in-game)
- Your bonded balance remains safe
- A monument marks where you died

**Death Monuments:**
- Show where heroes have fallen
- Display the hero's name and class
- Serve as warnings for dangerous areas
- Create a living history of the dungeon

### Strategic Deaths

Sometimes death can be tactical:
- Return to origin quickly
- Redistribute wealth (10% goes to survivors)
- Escape from deep, dangerous areas
- Reset your position for new exploration

---

## Treasures & Equipment

### Finding Gear

Equipment drops from defeated monsters:
- **Weapons**: 64 different types with varying damage
- **Armor**: 64 different types with varying defense
- Each equipment type has level requirements

### Equipment System

- Different equipment types offer different stat bonuses
- Higher-level equipment requires character progression
- Equipment persists through death
- Stats vary by equipment type, not rarity tiers

### Managing Your Equipment

- Equip items through your character screen
- Compare stats before swapping gear
- Check level requirements before equipping
- Your equipment determines your combat effectiveness

---

## The shMON Economy

### Understanding shMON

shMON is a [liquid staking token](https://shmonad.xyz) that powers Battle Nads:
- **Character Balance**: Earned by defeating monsters (lost on death)
- **Bonded Balance**: Protected funds for auto-defense (survives death)
- **Staking Rewards**: Stake at [shmonad.xyz](https://shmonad.xyz) for RPC benefits
- **Dual Purpose**: In-game currency and infrastructure token

### Token Distribution

When a hero dies:
- Their entire character balance is lost
- A portion may be dropped for other players (varies by game mode)
- Bonded balance remains with the account
- Creates risk/reward dynamics

### Spending shMON

Use your tokens for:
- Creating additional heroes
- Future marketplace transactions
- Special dungeon features
- Trading with other players (coming soon)

---

## Advanced Features

### Session Keys - Play Without Gas

Battle Nads uses "session keys" for seamless gameplay:
- Approve once, play freely
- No gas fees during gameplay  
- Sessions last 7 days
- Automatic management in background

### Task Automation

The Task Manager helps automate repetitive actions:
- **Auto-Explore**: Continuously move in patterns
- **Farm Mode**: Battle monsters in one area
- **Depth Diving**: Systematically explore downward

Access through the wrench icon in-game.

### The Monument System

Death monuments create emergent gameplay:
- Track dangerous areas
- Find popular farming spots
- Learn from others' mistakes
- Build your legacy in the dungeon

### Multi-Hero Management

Advanced players can control multiple heroes:
- Create diverse class combinations
- Explore different areas simultaneously
- Maximize shMON generation
- Build a hero empire

---

## shMON Staking & Enhanced RPC

**Stake Your shMON for Better Performance**

Visit [shmonad.xyz](https://shmonad.xyz) to stake your shMON tokens and unlock:

- **Higher RPC throughput** - More requests per second based on your stake
- **Priority block propagation** - Receive blocks earlier for latency-sensitive operations
- **Regional optimization** - Faster read requests through distributed nodes
- **Bandwidth guarantees** - Dedicated throughput instead of "best effort" service

**How It Works:**
1. Stake shMON at [shmonad.xyz](https://shmonad.xyz)
2. Higher stake = higher bandwidth allocation
3. Supports 90%+ of Monad validators in the FastLane network
4. Future features include on-chain usage proofs and automated enforcement

**Performance Benefits:**
- Reduced latency for game actions
- More reliable connection during peak times
- Priority access to blockchain data
- Better sync for multi-hero management

For technical details about the RPC architecture, see the [full explanation thread](https://x.com/ThogardPvP/status/1945533868439998938).

### Professional Gaming Setup

For competitive players seeking optimal performance:

**RPC Configuration:**
- Use shMON-staked RPC endpoints for guaranteed bandwidth
- Consider direct peering for ultra-low latency
- Monitor your usage to avoid overage fees

**Connection Optimization:**
- Stable internet connection (wired preferred)
- Low-latency regions closer to validators
- Browser performance mode enabled
- Hardware wallet for faster transaction signing

---

## Tips for New Adventurers

**Starting Out:**
- Hope for Warrior or Monk class for easier survival
- Stay at depth 1 until you're stronger
- Watch the activity feed to learn from others
- Don't fear death - it's part of the journey

**Growing Stronger:**
- Focus on one hero initially
- Upgrade equipment when possible
- Learn monster patterns in each area
- Time abilities for maximum impact

**Advanced Strategies:**
- Map dangerous areas using monuments
- Coordinate multiple heroes (when ready)
- Dive deep for better rewards
- Master your class abilities

---

## The Technology Behind the Magic

Battle Nads showcases blockchain gaming innovation:
- Fully on-chain game logic
- Gasless gameplay via session keys
- Real-time state synchronization
- True digital ownership

Built on Monad's high-performance blockchain, Battle Nads proves that complex games can exist entirely on-chain while remaining fun and accessible.

---

*Ready to begin your adventure? Connect your wallet and create your first hero. The dungeon awaits!*