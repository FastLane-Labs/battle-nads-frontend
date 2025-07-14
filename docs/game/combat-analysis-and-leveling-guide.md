# Battle Nads Combat Analysis & Leveling Guide

## Table of Contents

- [Combat System Overview](#combat-system-overview)
- [Combat Mechanics Summary](#combat-mechanics-summary)
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

## Combat Mechanics Summary

### Hit & Evasion

- **Dexterity** is the primary stat for landing hits
- **Weapon accuracy** multiplies your hit chance
- **Luck** and **Quickness** provide hit bonuses
- **Armor flexibility** helps with evasion

### Damage & Defense

- **Strength** scales with weapon damage for offense
- **Sturdiness** scales with armor for defense
- **Dexterity** provides minor bonuses to both
- **Luck** affects critical hits and bonus rolls

### Turn Speed

- **Quickness** determines how often you act
- Base turn time: 8 blocks (4 seconds)
- Minimum turn time: 3 blocks (1.5 seconds)
- **Luck** can help reach speed thresholds
- Faster turns = more attacks and abilities

### Health & Regeneration

- **Vitality** gives +100 health per point
- **Sturdiness** gives +20 health per point
- **Vitality** determines health regeneration rate
- Regeneration continues during combat at reduced rate

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
