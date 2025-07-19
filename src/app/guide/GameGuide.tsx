"use client";

import React from "react";
import { Box, Container, Link as ChakraLink, Button, IconButton, useColorModeValue, Flex, HStack } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Components } from "react-markdown";
import NavBar from "@/components/NavBar";

const guideContent = `# Battle Nads: The Complete Guide

Welcome to the world of Battle Nads, where heroes venture through an endless dungeon, battling monsters and collecting treasures in a fully on-chain tactical RPG.

## Quick Navigation

- [Starting Your Adventure](#starting-your-adventure)
- [Creating Your Hero](#creating-your-hero)
- [Exploring the Dungeon](#exploring-the-dungeon)
- [Combat & Abilities](#combat--abilities)
- [Death & Rebirth](#death--rebirth)
- [Treasures & Equipment](#treasures--equipment)
- [The shMON Economy](#the-shmon-economy)
- [Advanced Features](#advanced-features)

---

## Starting Your Adventure

Battle Nads drops you into an infinite dungeon where every step could lead to glory or doom. Your heroes explore a three-dimensional world, battle monsters automatically, and collect shMON tokens along the way.

### What Makes Battle Nads Special

- **Endless Dungeon**: An infinite 3D world to explore
- **Automated Combat**: Heroes fight on their own when monsters appear
- **Five Unique Classes**: Each with distinct abilities and playstyles
- **No Gas Fees**: Play without worrying about transaction costs
- **True Ownership**: Your heroes and items exist fully on-chain

### First Steps

1. Connect your wallet (or let the game create one for you)
2. Create your first hero by choosing a class
3. Start exploring by clicking movement arrows
4. Watch your hero battle monsters automatically
5. Collect shMON tokens and equipment

---

## Creating Your Hero

### Connecting to Battle Nads

You have two options to start playing:

**Easy Mode - Embedded Wallet**
- Click "Connect Wallet" and choose email/social login
- The game creates a wallet for you automatically
- Perfect for new players or quick sessions

**Power User Mode - External Wallet**
- Use MetaMask, Rainbow, or any Web3 wallet
- Full control over your assets
- Direct blockchain interaction

### Choosing Your Class

Each hero class offers a unique playstyle:

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
- **shMON**: Your starting funds (10,000)

---

## Exploring the Dungeon

### The Three-Dimensional World

Battle Nads' dungeon exists in three dimensions:
- **X-axis**: East ← → West
- **Y-axis**: North ← → South  
- **Z-axis**: Up ← → Down (depth levels)

Each location can hold up to 64 heroes. When you move, you're exploring an infinite procedurally generated world.

### Movement & Monster Encounters

**How Movement Works:**
1. Click any directional arrow to move
2. Your hero walks to the new location
3. If monsters lurk there, combat begins automatically
4. Win the battle to claim that spot

**Monster Spawning:**
- Moving to a new location may spawn monsters
- Deeper levels (lower Z) have tougher enemies
- Monster strength scales with dungeon depth
- Each area generates monsters based on its coordinates

**Finding Staircases:**
- Special locations contain staircases
- Use them to move between depth levels
- Deeper levels = better rewards but harder monsters
- Surface level (Z: 0) is safest for new heroes

### Navigation Tips

- Start by exploring horizontally (X/Y axes) at depth 0
- Build strength before venturing deeper
- Remember your path - respawning puts you back at origin
- Watch for other heroes' movements in the activity feed

---

## Combat & Abilities

### Automated Battle System

When you encounter monsters:
1. Combat starts automatically
2. Heroes and monsters take turns attacking
3. Your abilities activate based on cooldowns
4. Battle continues until one side falls

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
- Your hero respawns at origin (0, 0, 0)
- You lose 10% of your shMON (minimum 100)
- Equipment remains with you
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
- **Weapons**: Increase your damage output
- **Armor**: Boost your defense rating
- **Accessories**: Provide various bonuses

### Equipment Rarity

Items come in different quality tiers:
- Common (Gray)
- Uncommon (Green)  
- Rare (Blue)
- Epic (Purple)
- Legendary (Orange)

Higher rarity = better stats = greater power

### Managing Your Inventory

- Equip items through your character screen
- Compare stats before swapping gear
- Some items are class-specific
- Inventory space is limited - choose wisely

---

## The shMON Economy

### Understanding shMON

shMON (short for "sharing MON") is the lifeblood of Battle Nads:
- Start with 10,000 shMON
- Earn more by defeating monsters
- Lose 10% when you die
- Required for advanced features

### Token Distribution

When a hero dies:
- 10% of their shMON distributes to all living heroes
- Distribution happens automatically
- Creates a shared economy
- Encourages both cooperation and competition

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

### shMON Staking & Enhanced RPC

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
- Choose Warrior or Monk for easier survival
- Stay at depth 0 until you're stronger
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

*Ready to begin your adventure? Connect your wallet and create your first hero. The dungeon awaits!*`;

export default function GameGuide() {
  const router = useRouter();
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headingColor = useColorModeValue("purple.600", "purple.400");
  const linkColor = useColorModeValue("blue.600", "blue.400");
  const navBg = useColorModeValue("white", "gray.800");
  const navBorderColor = useColorModeValue("gray.300", "gray.600");

  const navigationItems = [
    { href: "#starting-your-adventure", label: "Getting Started" },
    { href: "#creating-your-hero", label: "Hero Creation" },
    { href: "#exploring-the-dungeon", label: "Exploration" },
    { href: "#combat--abilities", label: "Combat" },
    { href: "#death--rebirth", label: "Death System" },
    { href: "#treasures--equipment", label: "Equipment" },
    { href: "#the-shmon-economy", label: "Economy" },
    { href: "#advanced-features", label: "Advanced" },
    { href: "#shmon-staking--enhanced-rpc", label: "Staking & RPC" },
  ];

  const components: Components = {
    h1: ({ children }) => (
      <Box as="h1" fontSize="4xl" fontWeight="bold" mt={8} mb={4} color={headingColor}>
        {children}
      </Box>
    ),
    h2: ({ children }) => (
      <Box as="h2" fontSize="2xl" fontWeight="bold" mt={6} mb={3} color={headingColor} id={children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}>
        {children}
      </Box>
    ),
    h3: ({ children }) => (
      <Box as="h3" fontSize="xl" fontWeight="semibold" mt={4} mb={2}>
        {children}
      </Box>
    ),
    p: ({ children }) => (
      <Box as="p" mb={4} lineHeight="tall">
        {children}
      </Box>
    ),
    ul: ({ children }) => (
      <Box as="ul" pl={6} mb={4}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box as="ol" pl={6} mb={4}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Box as="li" mb={1}>
        {children}
      </Box>
    ),
    a: ({ href, children }) => (
      <ChakraLink href={href} color={linkColor} textDecoration="underline">
        {children}
      </ChakraLink>
    ),
    hr: () => <Box as="hr" my={6} borderColor={borderColor} />,
    blockquote: ({ children }) => (
      <Box 
        as="blockquote" 
        pl={4} 
        py={2} 
        my={4} 
        borderLeftWidth={4} 
        borderLeftColor={borderColor}
        fontStyle="italic"
      >
        {children}
      </Box>
    ),
    code: ({ children }) => (
      <Box as="code" px={1} py={0.5} bg={borderColor} borderRadius="sm" fontSize="sm">
        {children}
      </Box>
    ),
    strong: ({ children }) => (
      <Box as="strong" fontWeight="bold">
        {children}
      </Box>
    ),
    em: ({ children }) => (
      <Box as="em" fontStyle="italic">
        {children}
      </Box>
    ),
  };

  return (
    <>
      <NavBar />
      <Box minH="100vh" bg={bgColor} pt={16}>
        {/* Sticky Navigation Bar */}
        <Box
          position="sticky"
          top="64px"
          zIndex={5}
          bg={navBg}
          borderBottom="1px"
          borderColor={navBorderColor}
          shadow="sm"
        >
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between" py={3}>
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => router.push("/")}
              variant="ghost"
              size="sm"
            >
              Back to Game
            </Button>
            
            <HStack spacing={4} display={{ base: "none", md: "flex" }}>
              {navigationItems.map((item) => (
                <ChakraLink
                  key={item.href}
                  href={item.href}
                  fontSize="sm"
                  fontWeight="medium"
                  color={linkColor}
                  _hover={{ textDecoration: "underline" }}
                >
                  {item.label}
                </ChakraLink>
              ))}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Box
          bg={cardBg}
          borderRadius="lg"
          border="1px"
          borderColor={borderColor}
          p={8}
          shadow="lg"
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {guideContent}
          </ReactMarkdown>
        </Box>
      </Container>
    </Box>
    </>
  );
}