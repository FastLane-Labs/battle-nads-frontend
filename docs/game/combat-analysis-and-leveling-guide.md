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

- **ShieldBash**: Stuns target + high damage (scales with strength + dexterity + level)
- **ShieldWall**: Temporary defense buff, reduces incoming damage by 75%

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

- **EvasiveManeuvers**: Temporary evasion buff (3 turns active, 18 turn cooldown)
- **ApplyPoison**: DoT that deals percentage-based damage over 6 turns

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

- **Pray**: Powerful self/ally heal (scales with luck + sturdiness, 18+72 turn cooldown)
- **Smite**: High damage + curse debuff (scales with luck + level)

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

- **ChargeUp**: 3-stage damage buff (interrupted by stuns, 72 turn total duration)
- **Fireball**: Massive burst damage (scales with level + percentage of target's current health)

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

- **SingSong**: Cosmetic/utility effect
- **DoDance**: Cosmetic/utility effect

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

## Universal Leveling Tips

### Early Game (Levels 1-15)

1. **Focus on your class's primary stat first**
2. **Get enough vitality to survive** (minimum 8-10 points)
3. **Don't neglect luck** - it affects multiple mechanics
4. **Prioritize equipment upgrades** over minor stat increases

### Mid Game (Levels 16-35)

1. **Balance survivability stats** (Vitality/Sturdiness)
2. **Optimize your class's secondary stats**
3. **Consider your combat style** (offensive vs defensive)
4. **Start specializing** based on preferred abilities

### Late Game (Levels 36-50)

1. **Fine-tune secondary stats** for your playstyle
2. **Maximize equipment synergy** with your build
3. **Consider PvP implications** of your build
4. **Experiment with hybrid builds** if comfortable

### Stat Priority Guidelines

**For All Classes:**

- **Luck is undervalued** - affects hit, crit, turn speed, and damage rolls
- **Don't dump vitality** - health regeneration keeps you fighting longer
- **Equipment multiplies stats** - weapon accuracy scales dexterity, armor scales sturdiness
- **Turn speed is exponential** - small quickness investments have big impacts

**Red Flags:**

- Completely ignoring any stat (even penalized ones)
- Forgetting that luck affects turn speed thresholds
- Underestimating the value of health regeneration
- Not considering ability scaling when allocating points

## Advanced Combat Considerations

### Status Effects & Interactions

- **Stunned**: Increases hit chance against you (+64 to enemy hit roll)
- **Blocking (ShieldWall)**: Reduces damage by 75%, prevents crits
- **Evasion**: Reduces enemy hit chance (-96 to their hit roll)
- **Praying**: Halves damage dealt, doubles health regen, prevents crits
- **Cursed**: Prevents health regeneration, reduces healing by 80%
- **Poisoned**: Reduces health regen by 75%, DoT damage
- **ChargedUp**: Doubles damage, prevents critical hits on your attacks
- **ChargingUp**: Vulnerable to critical hits

### Equipment Scaling

- **Weapon Accuracy** multiplies with dexterity for hit chance
- **Weapon Base/Bonus Damage** scales with strength
- **Armor Factor** multiplies with sturdiness for defense
- **Armor Flexibility** affects evasion capability
- Higher-tier equipment significantly outweighs minor stat differences

### Combat Optimization

1. **Understand breakpoints** - some stats have threshold effects
2. **Consider opponent types** - monsters vs players have different scaling
3. **Timing matters** - ability cooldowns and combat duration
4. **Positioning** - especially important for glass cannon classes
5. **Resource management** - health, abilities, and combat stamina

---

*This guide documents the current combat mechanics implemented in the Battle Nads smart contract system.*
 