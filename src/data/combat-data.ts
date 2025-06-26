export const MONSTER_NAMES: Record<number, string> = {
  1: "Slime",
  2: "Jellyfish", 
  3: "Dungeon Crab",
  4: "Cave Bat",
  5: "Venomous Snail",
  6: "Spider",
  7: "Cave Viper",
  8: "Goblin Runt",
  9: "Goblin Scout",
  10: "Forest Wolf",
  11: "Skeleton Warrior",
  12: "Zombie",
  13: "Giant Scorpion",
  14: "Hobgoblin",
  15: "Orc",
  16: "Corrupted Fairy",
  17: "Goblin Shaman",
  18: "Troll",
  19: "Ogre",
  20: "Ghoul",
  21: "Harpy",
  22: "Werewolf",
  23: "Centaur",
  24: "Minotaur",
  25: "Lesser Wyvern",
  26: "Gargoyle",
  27: "Basilisk",
  28: "Chimera",
  29: "Cyclops",
  30: "Manticore",
  31: "Griffin",
  32: "Hydra",
  33: "Naga Warrior",
  34: "Lich",
  35: "Bone Dragon",
  36: "Elemental Guardian",
  37: "Wraith Lord",
  38: "Shadow Demon",
  39: "Tainted Night Elf",
  40: "Nightmare Steed",
  41: "Elder Vampire",
  42: "Frost Giant",
  43: "Stone Golem",
  44: "Iron Golem",
  45: "Phoenix",
  46: "Ancient Wyrm",
  47: "Kraken",
  48: "Behemoth",
  49: "Demon Prince",
  50: "Elder Lich King",
  51: "Shadow Dragon",
  52: "Eldritch Horror",
  53: "Celestial Guardian",
  54: "Fallen Archangel",
  55: "Titan",
  56: "Leviathan",
  57: "World Serpent",
  58: "Void Devourer",
  59: "The Beast",
  60: "Death's Herald",
  61: "Corrupted Ancient One",
  62: "Abyssal Lord",
  63: "Dragon God",
  64: "Your Mom"
};

export const NAMED_BOSSES: Record<number, string> = {
  46: "Molandak",
  47: "Salmonad",
  48: "Abdul",
  49: "Fitz",
  50: "Tina",
  51: "Bill Mondays",
  52: "Harpalsinh",
  53: "Cookies",
  54: "Danny Pipelines",
  55: "Port",
  56: "Tunez",
  57: "John W Rich Kid",
  58: "Intern",
  59: "James",
  60: "Eunice"
};

export const MONSTER_ATTACKS: Record<number, string[]> = {
  1: ["sloshes acidic goo at", "oozes toward", "splashes"],
  2: ["zaps with stinging tendrils", "pulses electric shocks at", "undulates toward"],
  3: ["pinches with claws", "scuttles toward", "snaps at"],
  4: ["swoops down on", "screeches at", "divebombs"],
  5: ["leaves a slimy trail toward", "slowly approaches", "secretes poison at"],
  6: ["spins webs around", "skitters toward", "bites"],
  7: ["strikes with venomous fangs", "coils around", "hisses at"],
  8: ["swipes with crude claws", "snarls at", "lunges toward"],
  9: ["scouts and strikes", "darts toward", "slashes with dagger"],
  10: ["howls and pounces on", "bares fangs at", "leaps toward"],
  11: ["swings rusty blade at", "rattles bones toward", "slashes"],
  12: ["shambles toward", "groans at", "claws with rotting hands"],
  13: ["stings with poisonous tail", "clicks claws at", "scuttles menacingly toward"],
  14: ["clubs with heavy fists", "growls at", "pounds"],
  15: ["roars and charges", "swings massive axe at", "bellows at"],
  16: ["casts dark magic on", "flutters malevolently toward", "hexes"],
  17: ["chants dark spells at", "waves gnarled staff toward", "curses"],
  18: ["smashes with giant fists", "stomps toward", "hurls rocks at"],
  19: ["swings massive club at", "grunts menacingly at", "pounds ground near"],
  20: ["tears with undead claws", "wails at", "lurches toward"],
  21: ["dive-bombs with talons", "shrieks at", "swoops toward"],
  22: ["howls and mauls", "transforms near", "savagely attacks"],
  23: ["charges with spear", "gallops toward", "tramples"],
  24: ["bellows and charges", "snorts at", "gores with horns"],
  25: ["breathes fire at", "soars toward", "claws from above"],
  26: ["swoops with stone claws", "perches menacingly near", "divebombs"],
  27: ["petrifies with gaze", "slithers toward", "breathes poison at"],
  28: ["breathes multiple elements at", "roars with three heads at", "pounces"],
  29: ["hurls massive boulders at", "stomps with one eye glaring at", "crushes"],
  30: ["lashes with spiked tail", "roars at", "pounces with lion claws"],
  31: ["soars and strikes with talons", "screeches at", "divebombs"],
  32: ["strikes with multiple heads", "regenerates near", "breathes acid at"],
  33: ["strikes with serpentine grace", "slithers around", "lashes with tail"],
  34: ["casts bone-shatter spell on", "raises undead near", "chills with dark magic"],
  35: ["breathes necrotic flame at", "soars with bone wings toward", "claws with skeletal talons"],
  36: ["channels elemental fury at", "shifts elements near", "blasts with primal magic"],
  37: ["drains life force from", "phases through", "chills with spectral touch"],
  38: ["tears reality around", "manifests darkness near", "corrupts"],
  39: ["shoots corrupted arrows at", "moves with unnatural grace toward", "curses with dark elven magic"],
  40: ["gallops with nightmare flames", "breathes shadow fire at", "tramples with burning hooves"],
  41: ["drains blood from", "hypnotizes", "strikes with centuries of malice"],
  42: ["hurls ice shards at", "freezes ground near", "stomps with frozen might"],
  43: ["pounds with stone fists", "hurls rocks at", "crushes with earth magic"],
  44: ["strikes with metal fists", "clanks menacingly toward", "pounds with iron might"],
  45: ["engulfs in flame", "rises in fiery glory near", "burns with rebirth fire"],
  46: ["breathes ancient fire at", "coils with primordial power around", "strikes with eons of wisdom"],
  47: ["crushes with tentacles", "pulls toward watery depths", "creates whirlpools around"],
  48: ["tramples with colossal might", "roars with primal fury at", "charges with unstoppable force"],
  49: ["commands hellish legions against", "burns with infernal power", "corrupts with demonic might"],
  50: ["commands armies of undead against", "freezes soul of", "curses with eternal death"],
  51: ["breathes shadow flame at", "eclipses light around", "strikes with darkness incarnate"],
  52: ["warps reality around", "drives mad with cosmic horror", "manifests nightmares near"],
  53: ["blesses with divine wrath", "shines holy light on", "protects with celestial power"],
  54: ["strikes with fallen grace", "corrupts divine power against", "weeps tears of shadow on"],
  55: ["shakes earth beneath", "towers over", "strikes with primordial might"],
  56: ["creates tidal waves around", "pulls into oceanic depths", "crushes with water pressure"],
  57: ["coils around the world near", "devours reality around", "constricts with cosmic force"],
  58: ["consumes existence around", "opens void portals near", "erases"],
  59: ["embodies primal terror against", "stalks with ancient hunger", "devours with endless appetite"],
  60: ["brings final judgment to", "tolls death knell for", "harvests soul of"],
  61: ["corrupts ancient wisdom against", "twists primordial power around", "perverts creation near"],
  62: ["rules from abyssal throne over", "commands infinite darkness against", "dominates"],
  63: ["breathes divine dragonfire at", "ascends with godly power over", "judges with draconic wisdom"],
  64: ["embarrasses", "lectures about proper eating habits", "uses ultimate mom powers on"]
};

export const CLASS_SIGNATURES = {
  Bard: (lvl: number) => ({ name: "Crescendo", power: 40 + lvl * 8 }),
  Warrior: (lvl: number) => ({ name: "Mighty Blow", power: 50 + lvl * 10 }),
  Rogue: (lvl: number) => ({ name: "Shadow Strike", power: 30 + lvl * 9 }),
  Monk: (lvl: number) => ({ name: "Divine Palm", power: 35 + lvl * 9 }),
  Sorcerer: (lvl: number) => ({ name: "Arcane Surge", power: 45 + lvl * 11 }),
};

export const PLAYER_TITLES = {
  Bard: (level: number): string => {
    if (level < 6) return "the Unremarkable";
    if (level < 8) return "the Annoying";
    if (level < 16) return "the Unfortunate";
    if (level < 32) return "the Loud";
    if (level < 48) return "the Unforgettable";
    return "the Greatest";
  },
  Warrior: (level: number): string => {
    if (level < 6) return "Sir";
    if (level < 8) return "Knight";
    if (level < 16) return "Count";
    if (level < 32) return "Lord";
    if (level < 48) return "Duke";
    return "Hero-King";
  },
  Rogue: (level: number): string => {
    if (level < 6) return "Thief";
    if (level < 8) return "Infiltrator";
    if (level < 16) return "Shadow Blade";
    if (level < 32) return "Night Shade";
    if (level < 48) return "Chosen of Darkness";
    return "King of Thieves";
  },
  Monk: (level: number): string => {
    if (level < 6) return "Brother";
    if (level < 8) return "Friar";
    if (level < 16) return "Father";
    if (level < 32) return "Bishop";
    if (level < 48) return "Cardinal";
    return "Prophet";
  },
  Sorcerer: (level: number): string => {
    if (level < 6) return "the Student";
    if (level < 8) return "the Intelligent";
    if (level < 16) return "the Wise";
    if (level < 32) return "the Powerful";
    if (level < 48) return "the Great";
    return "";
  },
};

export const WEAPON_NAMES: Record<number, string> = {
  1: "A Dumb-Looking Stick",
  2: "A Cool-Looking Stick",
  3: "Mean Words",
  4: "A Rock",
  5: "A Club, But It Smells Weird",
  6: "A Baby Seal",
  7: "A Pillow Shaped Like A Sword",
  8: "Brass Knuckles",
  9: "A Pocket Knife",
  10: "Battle Axe",
  11: "A Bowie Knife",
  12: "A Bowstaff",
  13: "A Spear",
  14: "A Dagger",
  15: "An Actual Sword",
  16: "Enchanted Warhammer",
  17: "Flaming Longsword",
  18: "Frozen Rapier",
  19: "Spiked Mace",
  20: "Crystal Halberd",
  21: "Obsidian Blade",
  22: "Thundering Greatsword",
  23: "Venomous Whip",
  24: "Shadowblade",
  25: "Double-Bladed Axe",
  26: "Ancient War Scythe",
  27: "Celestial Quarterstaff",
  28: "Soulstealer Katana",
  29: "Demonic Trident",
  30: "Volcanic Greataxe",
  31: "Ethereal Bow",
  32: "Runic Warsword",
  45: "Void Edge",
  46: "Moonlight Greatsword",
  47: "Sunforged Hammer",
  48: "Nemesis Blade",
  49: "Cosmic Crusher",
  50: "Ultimate Weapon of Ultimate Destiny"
};

export const ARMOR_NAMES: Record<number, string> = {
  1: "Literally Nothing",
  2: "A Scavenged Loin Cloth",
  3: "A Positive Outlook On Life",
  4: "Gym Clothes",
  5: "Tattered Rags",
  6: "98% Mostly-Deceased Baby Seals, 2% Staples",
  7: "A Padded Jacket",
  8: "Black Leather Suit (Used)",
  9: "Tinfoil and Duct Tape",
  10: "Keone's Cod Piece",
  11: "Chainmail",
  12: "Scalemail",
  13: "Kevlar",
  14: "Kevlar + Tactical",
  15: "Ninja Gear",
  16: "Dragonhide Leather",
  17: "Reinforced Platemail",
  18: "Elven Silverweave",
  19: "Dwarven Full Plate",
  20: "Enchanted Robes",
  45: "Titan's Bulwark",
  46: "Moonlight Shroud",
  47: "Sunforged Plate",
  48: "Chronoshifter's Garb",
  49: "Crystalline Exoskeleton",
  50: "Ultimate Armor of Ultimate Protection"
};