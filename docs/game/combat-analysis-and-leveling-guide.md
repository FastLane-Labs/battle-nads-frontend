# Battle Nads Combat Analysis & Leveling Guide

## Table of Contents

- [Combat System Overview](#combat-system-overview)
- [Core Combat Mechanics](#core-combat-mechanics)
- [Character Attributes](#character-attributes)
- [Class Analysis & Strategies](#class-analysis--strategies)
- [Universal Leveling Tips](#universal-leveling-tips)
- [Advanced Combat Considerations](#advanced-combat-considerations)

## Combat System Overview

Battle Nads features a turn-based combat system where characters engage in tactical battles using six core attributes. Each character class has unique bonuses, penalties, and special abilities that define their optimal playstyle.

### Core Attributes

- **Strength**: Primary damage scaling
- **Vitality**: Health pool and regeneration
- **Dexterity**: Hit chance and minor damage bonus
- **Quickness**: Turn speed and hit/evasion
- **Sturdiness**: Defense and health pool
- **Luck**: Critical hits, turn speed, and damage/defense rolls

## Core Combat Mechanics

### Hit Calculation

```solidity
uint256 toHit = (
    ((HIT_MOD + attacker.dexterity) * (weapon.accuracy + BASE_ACCURACY))
        + attacker.luck + attacker.quickness
) / HIT_MOD;

uint256 toEvade = (
    ((EVADE_MOD + defender.dexterity + defender.luck) * (armor.flexibility + BASE_FLEXIBILITY))
    + defender.quickness
) / EVADE_MOD;
```

**Key Factors:**

- **Dexterity** is the primary hit stat (multiplied by weapon accuracy)
- **Luck** and **Quickness** provide additive bonuses
- **Armor flexibility** affects evasion capability

### Damage Calculation

```solidity
uint256 offense = (
    (BASE_OFFENSE + attacker.strength) * weapon.baseDamage
        + attacker.dexterity
) / BASE_OFFENSE;

uint256 defense = (
    (BASE_DEFENSE + defender.sturdiness) * armor.armorFactor
        + defender.dexterity
) / BASE_DEFENSE;
```

**Key Factors:**

- **Strength** is the primary damage stat (multiplied by weapon damage)
- **Sturdiness** is the primary defense stat (multiplied by armor factor)
- **Dexterity** provides minor bonuses to both offense and defense
- **Luck** affects bonus damage/defense rolls

### Turn Speed (Cooldown)

```solidity
function _cooldown(BattleNadStats memory stats) internal pure returns (uint256 cooldown) {
    uint256 quickness = uint256(stats.quickness) + 1;
    uint256 baseline = QUICKNESS_BASELINE; // 4
    cooldown = DEFAULT_TURN_TIME; // 8
    
    // Reduce cooldown based on quickness thresholds
    do {
        if (cooldown < 3) break;
        if (quickness < baseline) {
            if (quickness + uint256(stats.luck) > baseline) {
                --cooldown;
            }
            break;
        }
        --cooldown;
        baseline = baseline * 3 / 2 + 1;
    } while (cooldown > MIN_TURN_TIME); // 3
}
```

**Key Factors:**

- **Quickness** is the primary turn speed stat
- **Luck** can help reach quickness thresholds
- Faster turns = more actions = higher DPS and utility

### Health System

```solidity
maxHealth = baseHealth + (vitality * VITALITY_HEALTH_MODIFIER) // 100
    + (sturdiness * STURDINESS_HEALTH_MODIFIER); // 20

// In-combat regeneration
adjustedHealthRegeneration = (vitality * VITALITY_REGEN_MODIFIER) * cooldown / DEFAULT_TURN_TIME;
```

**Key Factors:**

- **Vitality** provides 5x more health than **Sturdiness**
- **Vitality** determines regeneration rate
- Regeneration is normalized by turn speed to prevent quickness abuse

## Character Attributes

| Attribute | Primary Effects | Secondary Effects |
|-----------|----------------|-------------------|
| **Strength** | • Weapon damage scaling<br>• Ability damage (ShieldBash, etc.) | • Class bonuses vary |
| **Vitality** | • Max health (+100 per point)<br>• Health regeneration (+5 per point) | • Monk gets enhanced regen |
| **Dexterity** | • Hit chance (multiplied by weapon accuracy)<br>• Minor damage/defense bonus | • Affected by class penalties |
| **Quickness** | • Turn speed (exponential scaling)<br>• Hit and evasion bonuses | • Combines with luck for turn speed |
| **Sturdiness** | • Defense (multiplied by armor factor)<br>• Max health (+20 per point)<br>• Healing scaling (Monk abilities) | • Critical for survivability |
| **Luck** | • Critical hit chance<br>• Turn speed thresholds<br>• Bonus damage/defense rolls<br>• Ability scaling (Monk, Sorcerer) | • Most undervalued stat |

## Class Analysis & Strategies

### 🛡️ **WARRIOR** - Tank/DPS Hybrid

**Class Modifiers:**

- `+strength` (level/3 + 2)
- `+vitality` (level/3 + 2)  
- `-quickness` (-1)
- `+max health` (level × 30 + 50)

**Abilities:**

- **ShieldBash**: Stuns target + high damage (scales with strength + dexterity + level) - 24 block cooldown (12 seconds)
- **ShieldWall**: Temporary defense buff, reduces incoming damage by 75% - 24 block cooldown (12 seconds)

**Optimal Build:**

| Priority | Attribute | Reasoning |
|----------|-----------|-----------|
| 1st | **Strength** | Primary damage + class bonus + ability scaling |
| 2nd | **Vitality** | Health pool + class bonus + sustain |
| 3rd | **Luck** | Critical hits + turn speed + damage rolls |
| 4th | **Sturdiness** | Defense + health bonus |
| 5th | **Dexterity** | Hit chance + minor damage + ability scaling |
| 6th | **Quickness** | Turn speed (already penalized) |

**Strategy:**
Warriors excel at prolonged combat with high survivability and consistent damage output. Use ShieldWall defensively when low on health, and ShieldBash to control dangerous enemies. The high health pool allows for aggressive positioning.

**Combat Tips:**

- Lead with ShieldBash against high-damage enemies
- Use ShieldWall when health drops below 50%
- Focus on strength early, then balance vitality and sturdiness
- Don't neglect luck - it significantly improves damage consistency

---

### 🗡️ **ROGUE** - Critical Strike Assassin

**Class Modifiers:**

- `+dexterity` (level/3 + 2)
- `+quickness` (level/3 + 2)
- `+luck` (level/4)
- `-strength` (-1)
- `-max health` (level × 20 + 100)

**Abilities:**

- **EvasiveManeuvers**: Temporary evasion buff - 18 block cooldown (9 seconds)
- **ApplyPoison**: DoT that deals percentage-based damage over 10 turns - 64 block cooldown (32 seconds)

**Optimal Build:**

| Priority | Attribute | Reasoning |
|----------|-----------|-----------|
| 1st | **Dexterity** | Hit chance + class bonus + damage |
| 2nd | **Luck** | Critical hits + class bonus + turn speed |
| 3rd | **Quickness** | Turn speed + class bonus + hit/evasion |
| 4th | **Sturdiness** | Defense (compensate for low health) |
| 5th | **Vitality** | Health regeneration + survivability |
| 6th | **Strength** | Least important (already penalized) |

**Strategy:**
Rogues are speed-based assassins that rely on landing critical hits and avoiding damage. The poison DoT is excellent against high-health targets, while EvasiveManeuvers provides escape options.

**Combat Tips:**

- Use EvasiveManeuvers before engaging tough enemies
- Apply poison to high-health targets early
- Focus on first-strike advantages with high quickness
- Critical hit scaling makes luck extremely valuable
- Avoid prolonged fights due to low health pool

---

### 🙏 **MONK** - Support/Survivalist

**Class Modifiers:**

- `+sturdiness` (level/3 + 2)
- `+luck` (level/3 + 2)
- `-dexterity` (-1)
- `+max health` (level × 20)
- **Enhanced health regeneration** (level × 2 + 10)

**Abilities:**

- **Pray**: Powerful self/ally heal (scales with luck + sturdiness) - 72 block cooldown (36 seconds)
- **Smite**: High damage + curse debuff (scales with luck + level) - 24 block cooldown (12 seconds)

**Optimal Build:**

| Priority | Attribute | Reasoning |
|----------|-----------|-----------|
| 1st | **Sturdiness** | Defense + class bonus + health + heal scaling |
| 2nd | **Luck** | Class bonus + heal scaling + critical hits |
| 3rd | **Vitality** | Health pool + enhanced regeneration |
| 4th | **Quickness** | Turn speed for frequent healing |
| 5th | **Strength** | Smite damage scaling |
| 6th | **Dexterity** | Least important (already penalized) |

**Strategy:**
Monks are the ultimate survivalists with unmatched healing capabilities. The combination of high defense, enhanced regeneration, and powerful healing makes them nearly unkillable in extended combat.

**Combat Tips:**

- Use Pray proactively, not reactively (long cooldown)
- Enhanced regeneration makes monks excellent for area grinding
- Smite's curse debuff prevents enemy healing
- High sturdiness + luck makes defensive builds extremely effective
- Can serve as group healer in team scenarios

---

### 🔥 **SORCERER** - Burst Damage Mage

**Class Modifiers:**

- `-strength` (-1)
- `-vitality` (-1)
- `-sturdiness` (-1)
- `-max health` (level × 30 + 50)

**Abilities:**

- **ChargeUp**: 3-stage damage buff (interrupted by stuns) - 36 block cooldown (18 seconds)
- **Fireball**: Massive burst damage (scales with level + percentage of target's current health) - 56 block cooldown (28 seconds)

**Optimal Build:**

| Priority | Attribute | Reasoning |
|----------|-----------|-----------|
| 1st | **Luck** | Critical hits + turn speed + damage rolls |
| 2nd | **Dexterity** | Hit chance (compensate for penalties) |
| 3rd | **Quickness** | Turn speed + positioning |
| 4th | **Vitality** | Health pool (compensate for penalty) |
| 5th | **Sturdiness** | Defense (compensate for penalty) |
| 6th | **Strength** | Least important (heavily penalized) |

**Strategy:**
Sorcerers are glass cannons that rely on positioning and timing. The ChargeUp + Fireball combo can eliminate most enemies in one hit, but leaves the sorcerer vulnerable during the charge phase.

**Combat Tips:**

- Use ChargeUp only when safe from interruption
- Fireball damage scales with enemy's current health - use early
- High luck maximizes critical hit potential
- Avoid prolonged combat due to stat penalties
- Positioning is crucial - stay out of enemy range while charging

---

### 🎵 **BARD** - Challenge Mode

**Class Modifiers:**

- `-1` to **ALL** attributes
- `-max health` (level × 40 + 100)
- **Special mechanic**: Missed attacks against Bards become critical hits
- **Health regeneration**: Fixed at 1 per turn (worst in game)

**Abilities:**

- **SingSong**: No gameplay effect - 0 cooldown
- **DoDance**: No gameplay effect - 0 cooldown

**Optimal Build (Survival Focus):**

| Priority | Attribute | Reasoning |
|----------|-----------|-----------|
| 1st | **Vitality** | Health pool (desperately needed) |
| 2nd | **Sturdiness** | Defense (desperately needed) |
| 3rd | **Luck** | Only path to critical hits + turn speed |
| 4th | **Dexterity** | Hit chance |
| 5th | **Quickness** | Turn speed |
| 6th | **Strength** | Damage (already terrible) |

**Strategy:**
Bards are the ultimate challenge class. The unique mechanic where missed attacks become critical hits creates unpredictable combat scenarios. Focus entirely on survival stats.

**Combat Tips:**

- This is "hard mode" - expect frequent deaths
- The missed-attack-becomes-crit mechanic can occasionally save you
- Avoid combat when possible
- Consider bard as a roleplay/challenge class, not competitive
- Group play may be more viable than solo

## Basic Leveling Tips

### General Guidance

- Focus on your class's primary stat (Strength for Warriors, etc.)
- Maintain enough Vitality for survivability
- Luck affects multiple systems - don't ignore it
- Equipment upgrades often matter more than stats

### Key Points

- Stats have diminishing returns at high values
- Equipment multiplies your stat effectiveness
- Turn speed (from Quickness) has exponential scaling
- Each class benefits from different stat priorities

## Combat Mechanics Summary

### Status Effects

- **Buffs**: ShieldWall (damage reduction), Evasion (+96 dodge), ChargedUp (2x damage)
- **Debuffs**: Stunned (-64 dodge), Cursed (-80% healing), Poisoned (DoT)
- **Ability States**: Praying and ChargingUp can be interrupted

### Equipment Impact

- Weapons scale with Strength (damage) and Dexterity (accuracy)
- Armor scales with Sturdiness (defense) and affects dodge chance
- Higher tier equipment provides significant advantages

### Technical Notes

The combat system demonstrates blockchain's capability to handle:
- Complex stat calculations on-chain
- Multi-stage ability execution through the Task Manager
- Fair, deterministic combat resolution without RNG exploitation

---

*Battle Nads demonstrates how complex RPG mechanics can run entirely on-chain using FastLane's Task Manager and Gas Abstraction technologies.*
