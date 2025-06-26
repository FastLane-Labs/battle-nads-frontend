# Battle Nads Combat Log Reference

This document provides comprehensive data for improving the UI combat log by mapping event logs to specific enemy names, types, and equipment details.

## Enemy Types & Classes

### Character Classes (from Types.sol:40-53)

| Class ID | Class Name | Type | Description |
|----------|------------|------|-------------|
| 0 | Null | - | Null value |
| 1 | Basic | Monster | Basic enemy monsters |
| 2 | Elite | Monster | Enhanced monsters with "Elite" prefix |
| 3 | Boss | Monster | Powerful boss enemies |
| 4 | Bard | Player | Player class |
| 5 | Warrior | Player | Player class |
| 6 | Rogue | Player | Player class |
| 7 | Monk | Player | Player class |
| 8 | Sorcerer | Player | Player class |

### Monster Naming Patterns

- **Basic Monsters**: Use base name from monster list
- **Elite Monsters**: Prefix "Elite " + base name
- **Boss Monsters**: Various naming patterns based on level:
  - Level < 16: "Dungeon Floor Boss"
  - Level 16-23: Base name + " Boss"
  - Level 24-35: "Dread/Nightmare/Infernal " + base name + " Boss"
  - Level 46-60: Specific named bosses (see Named Bosses section)
  - Level > 60: "Keone"

## Monster Names (64 Total)

### Low-Level Monsters (Index 1-16)
| Index | Name |
|-------|------|
| 1 | Slime |
| 2 | Jellyfish |
| 3 | Dungeon Crab |
| 4 | Cave Bat |
| 5 | Venomous Snail |
| 6 | Spider |
| 7 | Cave Viper |
| 8 | Goblin Runt |
| 9 | Goblin Scout |
| 10 | Forest Wolf |
| 11 | Skeleton Warrior |
| 12 | Zombie |
| 13 | Giant Scorpion |
| 14 | Hobgoblin |
| 15 | Orc |
| 16 | Corrupted Fairy |

### Mid-Level Monsters (Index 17-32)
| Index | Name |
|-------|------|
| 17 | Goblin Shaman |
| 18 | Troll |
| 19 | Ogre |
| 20 | Ghoul |
| 21 | Harpy |
| 22 | Werewolf |
| 23 | Centaur |
| 24 | Minotaur |
| 25 | Lesser Wyvern |
| 26 | Gargoyle |
| 27 | Basilisk |
| 28 | Chimera |
| 29 | Cyclops |
| 30 | Manticore |
| 31 | Griffin |
| 32 | Hydra |

### High-Level Monsters (Index 33-48)
| Index | Name |
|-------|------|
| 33 | Naga Warrior |
| 34 | Lich |
| 35 | Bone Dragon |
| 36 | Elemental Guardian |
| 37 | Wraith Lord |
| 38 | Shadow Demon |
| 39 | Tainted Night Elf |
| 40 | Nightmare Steed |
| 41 | Elder Vampire |
| 42 | Frost Giant |
| 43 | Stone Golem |
| 44 | Iron Golem |
| 45 | Phoenix |
| 46 | Ancient Wyrm |
| 47 | Kraken |
| 48 | Behemoth |

### Legendary Monsters (Index 49-64)
| Index | Name |
|-------|------|
| 49 | Demon Prince |
| 50 | Elder Lich King |
| 51 | Shadow Dragon |
| 52 | Eldritch Horror |
| 53 | Celestial Guardian |
| 54 | Fallen Archangel |
| 55 | Titan |
| 56 | Leviathan |
| 57 | World Serpent |
| 58 | Void Devourer |
| 59 | The Beast |
| 60 | Death's Herald |
| 61 | Corrupted Ancient One |
| 62 | Abyssal Lord |
| 63 | Dragon God |
| 64 | Your Mom |

## Named Bosses (Level-Specific)

| Level | Boss Name |
|-------|-----------|
| 46 | Molandak |
| 47 | Salmonad |
| 48 | Abdul |
| 49 | Fitz |
| 50 | Tina |
| 51 | Bill Mondays |
| 52 | Harpalsinh |
| 53 | Cookies |
| 54 | Danny Pipelines |
| 55 | Port |
| 56 | Tunez |
| 57 | John W Rich Kid |
| 58 | Intern |
| 59 | James |
| 60 | Eunice |

## Player Class Titles by Level

### Bard Titles
- Level < 6: "the Unremarkable"
- Level < 8: "the Annoying"
- Level < 16: "the Unfortunate"
- Level < 32: "the Loud"
- Level < 48: "the Unforgettable"
- Level ≥ 48: "the Greatest"

### Warrior Titles
- Level < 6: "Sir"
- Level < 8: "Knight"
- Level < 16: "Count"
- Level < 32: "Lord"
- Level < 48: "Duke"
- Level ≥ 48: "Hero-King"

### Rogue Titles
- Level < 6: "Thief"
- Level < 8: "Infiltrator"
- Level < 16: "Shadow Blade"
- Level < 32: "Night Shade"
- Level < 48: "Chosen of Darkness"
- Level ≥ 48: "King of Thieves"

### Monk Titles
- Level < 6: "Brother"
- Level < 8: "Friar"
- Level < 16: "Father"
- Level < 32: "Bishop"
- Level < 48: "Cardinal"
- Level ≥ 48: "Prophet"

### Sorcerer Titles
- Level < 6: "the Student"
- Level < 8: "the Intelligent"
- Level < 16: "the Wise"
- Level < 32: "the Powerful"
- Level < 48: "the Great"
- Level ≥ 48: (name only, no title)

## Weapons (ID 1-50)

### Basic Weapons (ID 1-15)
| ID | Name | Base Damage | Bonus Damage | Accuracy | Speed |
|----|------|-------------|--------------|----------|-------|
| 1 | A Dumb-Looking Stick | 105 | 50 | 85 | 100 |
| 2 | A Cool-Looking Stick | 110 | 55 | 80 | 100 |
| 3 | Mean Words | 125 | 20 | 85 | 100 |
| 4 | A Rock | 145 | 30 | 75 | 100 |
| 5 | A Club, But It Smells Weird | 120 | 100 | 80 | 100 |
| 6 | A Baby Seal | 130 | 75 | 70 | 100 |
| 7 | A Pillow Shaped Like A Sword | 125 | 70 | 85 | 100 |
| 8 | Brass Knuckles | 200 | 50 | 80 | 100 |
| 9 | A Pocket Knife | 150 | 150 | 75 | 100 |
| 10 | Battle Axe | 250 | 100 | 70 | 85 |
| 11 | A Bowie Knife | 220 | 55 | 80 | 100 |
| 12 | A Bowstaff | 300 | 10 | 74 | 100 |
| 13 | A Spear | 200 | 200 | 70 | 100 |
| 14 | A Dagger | 220 | 150 | 80 | 100 |
| 15 | An Actual Sword | 250 | 150 | 80 | 100 |

### Advanced Weapons (ID 16-30)
| ID | Name | Base Damage | Bonus Damage | Accuracy | Speed |
|----|------|-------------|--------------|----------|-------|
| 16 | Enchanted Warhammer | 280 | 180 | 75 | 80 |
| 17 | Flaming Longsword | 270 | 200 | 85 | 90 |
| 18 | Frozen Rapier | 250 | 175 | 90 | 105 |
| 19 | Spiked Mace | 290 | 150 | 75 | 85 |
| 20 | Crystal Halberd | 300 | 175 | 80 | 90 |
| 21 | Obsidian Blade | 280 | 220 | 85 | 95 |
| 22 | Thundering Greatsword | 320 | 200 | 75 | 75 |
| 23 | Venomous Whip | 240 | 250 | 85 | 110 |
| 24 | Shadowblade | 260 | 260 | 90 | 100 |
| 25 | Double-Bladed Axe | 340 | 170 | 70 | 80 |
| 26 | Ancient War Scythe | 290 | 220 | 80 | 90 |
| 27 | Celestial Quarterstaff | 320 | 200 | 85 | 95 |
| 28 | Soulstealer Katana | 300 | 240 | 90 | 100 |
| 29 | Demonic Trident | 330 | 210 | 80 | 90 |
| 30 | Volcanic Greataxe | 350 | 200 | 75 | 80 |

### Legendary Weapons (ID 31-50)
| ID | Name | Base Damage | Bonus Damage | Accuracy | Speed |
|----|------|-------------|--------------|----------|-------|
| 31 | Ethereal Bow | 280 | 280 | 95 | 100 |
| 32 | Runic Warsword | 320 | 240 | 85 | 90 |
| 45 | Void Edge | 370 | 250 | 80 | 85 |
| 46 | Moonlight Greatsword | 340 | 280 | 85 | 90 |
| 47 | Sunforged Hammer | 380 | 240 | 75 | 80 |
| 48 | Nemesis Blade | 360 | 270 | 85 | 90 |
| 49 | Cosmic Crusher | 400 | 230 | 70 | 75 |
| 50 | Ultimate Weapon of Ultimate Destiny | 420 | 300 | 90 | 100 |

## Armor (ID 1-50)

### Basic Armor (ID 1-15)
| ID | Name | Armor Factor | Armor Quality | Flexibility | Weight |
|----|------|-------------|---------------|-------------|--------|
| 1 | Literally Nothing | 0 | 0 | 100 | 0 |
| 2 | A Scavenged Loin Cloth | 5 | 0 | 100 | 0 |
| 3 | A Positive Outlook On Life | 10 | 5 | 100 | 0 |
| 4 | Gym Clothes | 15 | 5 | 100 | 0 |
| 5 | Tattered Rags | 20 | 5 | 95 | 0 |
| 6 | 98% Mostly-Deceased Baby Seals, 2% Staples | 40 | 0 | 70 | 0 |
| 7 | A Padded Jacket | 30 | 10 | 100 | 0 |
| 8 | Black Leather Suit (Used) | 40 | 10 | 100 | 0 |
| 9 | Tinfoil and Duct Tape | 45 | 4 | 100 | 0 |
| 10 | Keone's Cod Piece | 30 | 75 | 95 | 5 |
| 11 | Chainmail | 55 | 15 | 90 | 10 |
| 12 | Scalemail | 60 | 18 | 88 | 15 |
| 13 | Kevlar | 60 | 20 | 100 | 5 |
| 14 | Kevlar + Tactical | 60 | 18 | 100 | 5 |
| 15 | Ninja Gear | 10 | 100 | 110 | 0 |

### Advanced Armor (ID 16-30)
| ID | Name | Armor Factor | Armor Quality | Flexibility | Weight |
|----|------|-------------|---------------|-------------|--------|
| 16 | Dragonhide Leather | 65 | 25 | 95 | 5 |
| 17 | Reinforced Platemail | 75 | 20 | 70 | 25 |
| 18 | Elven Silverweave | 60 | 30 | 100 | 3 |
| 19 | Dwarven Full Plate | 80 | 25 | 65 | 30 |
| 20 | Enchanted Robes | 50 | 40 | 105 | 2 |

### Legendary Armor (ID 31-50)
| ID | Name | Armor Factor | Armor Quality | Flexibility | Weight |
|----|------|-------------|---------------|-------------|--------|
| 45 | Titan's Bulwark | 105 | 60 | 60 | 40 |
| 46 | Moonlight Shroud | 80 | 70 | 95 | 10 |
| 47 | Sunforged Plate | 100 | 65 | 70 | 30 |
| 48 | Chronoshifter's Garb | 90 | 75 | 85 | 15 |
| 49 | Crystalline Exoskeleton | 95 | 70 | 80 | 25 |
| 50 | Ultimate Armor of Ultimate Protection | 110 | 80 | 90 | 20 |

## Monster Generation Logic

### Level Calculation
- **Basic Monsters**: Level varies based on player level and depth
- **Elite Monsters**: Player depth + 1
- **Boss Monsters**: ((Player depth * 5) / 4) + 2

### Equipment Assignment
- **Boss Monsters**: High-tier equipment (depth + 3 + random roll)
- **Elite Monsters**: Mid-tier equipment (depth + random roll)
- **Basic Monsters**: Level-based equipment with random variations

## Combat Log Event Mapping

### Log Types (from Types.sol:195-203)
- **Combat**: Direct combat actions
- **InstigatedCombat**: Combat initiation
- **EnteredArea**: Area movement logs
- **LeftArea**: Area exit logs
- **Chat**: Chat messages
- **Ability**: Ability usage
- **Ascend**: Level progression

### Status Effects (from Types.sol:55-65)
- **None**: No effect
- **ShieldWall**: Defensive buff
- **Evasion**: Dodge buff
- **Praying**: Prayer state
- **ChargingUp**: Building power
- **ChargedUp**: Ready to unleash
- **Poisoned**: Damage over time
- **Cursed**: Debuff effect
- **Stunned**: Cannot act

### Abilities (from Types.sol:67-79)
- **SingSong**: Bard ability
- **DoDance**: Bard ability
- **ShieldBash**: Warrior ability
- **ShieldWall**: Warrior ability
- **EvasiveManeuvers**: Rogue ability
- **ApplyPoison**: Rogue ability
- **Pray**: Monk ability
- **Smite**: Monk ability
- **Fireball**: Sorcerer ability
- **ChargeUp**: Sorcerer ability

## Usage Guidelines

1. **Monster Identification**: Use monster ID and class to determine proper name formatting
2. **Equipment Display**: Map weapon/armor IDs to their display names and stats
3. **Level-Based Titles**: Apply appropriate titles based on character class and level
4. **Combat Context**: Use log type and ability information for detailed combat descriptions
5. **Status Effects**: Display visual indicators for active buffs/debuffs

This reference enables rich combat log displays with specific enemy names, equipment details, and contextual information for enhanced UI experiences.