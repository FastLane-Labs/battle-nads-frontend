import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Text, Spinner, Center } from '@chakra-ui/react';
import { domain } from '@/types';
import { EventLogItemRenderer } from './EventLogItemRenderer';
import { useVirtualizer } from '@tanstack/react-virtual';
import { filterEventsByRecentAreas } from '@/utils/eventFiltering';
import { useCombatFeed } from '@/hooks/game/useCombatFeed';

interface EventFeedProps {
  eventLogs: domain.EventMessage[];
  combatants: domain.CharacterLite[];
  isCacheLoading: boolean;
  // Add equipment names for lookup
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
  // Add current player area ID for filtering
  currentAreaId?: bigint;
  // Add full player character for proper CharacterLite conversion
  playerCharacter: domain.Character;
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  eventLogs,
  combatants, 
  isCacheLoading,
  equipableWeaponIDs,
  equipableWeaponNames,
  equipableArmorIDs,
  equipableArmorNames,
  currentAreaId,
  playerCharacter
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter events by area and exclude chat messages
  // Also filter out combat events with dead players
  const filteredEventLogs = useMemo(() => {
    // Handle undefined/null eventLogs array
    if (!eventLogs || !Array.isArray(eventLogs)) {
      return [];
    }
    
    // First filter by area if currentAreaId is provided
    // Use recent areas filtering to maintain context when player moves between depths
    const areaFilteredEvents = currentAreaId !== undefined 
      ? filterEventsByRecentAreas(eventLogs, currentAreaId)
      : eventLogs;
    
    
    // Then apply other filters
    return areaFilteredEvents.filter(event => {
      // Skip events without proper structure
      if (!event || typeof event.type === 'undefined') {
        return false;
      }
      
      
      // Filter out chat messages (type 4)
      if (Number(event.type) === 4) {
        return false;
      }
      
      // Filter out combat events involving "Unnamed the Initiate"
      if ((Number(event.type) === 0 || Number(event.type) === 1) &&
          ((event.defender?.name?.includes("Unnamed the Initiate")) ||
           (event.attacker?.name?.includes("Unnamed the Initiate")))) {
        return false;
      }
      
      // Keep all other events
      return true;
    });
  }, [eventLogs, currentAreaId]);

  // Use useCombatFeed to process all events with caching
  const enrichedEventLogs = useCombatFeed(
    filteredEventLogs,
    playerCharacter.index,
    playerCharacter.weapon?.name,
    currentAreaId,
    playerCharacter.name
  );

  // Track window width for responsive sizing
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // More accurate sizing estimation - much more conservative
  const getEstimatedRowSize = useMemo(() => {
    return (index: number) => {
      const event = enrichedEventLogs[index] || filteredEventLogs[index];
      if (!event) return 35;
      
      // Base sizes adjusted to prevent cropping
      const isMobile = windowWidth < 770; // Match your breakpoint
      const baseSize = isMobile ? 70 : 60; // Significantly increased base sizes
      
      // Extra height calculation for details
      let extraHeight = 0;
      
      // Add sufficient height for details row
      if (event.details) {
        const hasDetails = Boolean(
          event.details.damageDone || 
          event.details.healthHealed || 
          event.details.experience || 
          event.details.lootedWeaponID || 
          event.details.lootedArmorID || 
          event.details.targetDied
        );
        if (hasDetails) {
          extraHeight += isMobile ? 18 : 16; // Increased to prevent cropping
        }
      }
      
      // Much more conservative height calculation for message wrapping
      const messageLength = event.displayMessage?.length || 0;
      if (isMobile) {
        // On mobile, be more precise about wrapping
        if (messageLength > 80) {
          extraHeight += 12; // Long message
        } else if (messageLength > 60) {
          extraHeight += 8;  // Medium-long message
        } else if (messageLength > 40) {
          extraHeight += 4;  // Slightly longer message
        }
      } else {
        // On desktop, messages wrap less frequently
        if (messageLength > 100) {
          extraHeight += 8; // Long message
        } else if (messageLength > 70) {
          extraHeight += 4; // Medium message
        }
      }
      
      return baseSize + extraHeight;
    };
  }, [enrichedEventLogs, filteredEventLogs, windowWidth]);

  const rowVirtualizer = useVirtualizer({ 
    count: enrichedEventLogs?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimatedRowSize,
    overscan: 3, // Reduced overscan for better performance
    scrollMargin: 0, // Remove default scroll margin
  });
  
  // Helper function to convert domain.Character to domain.CharacterLite
  const characterToCharacterLite = (character: domain.Character): domain.CharacterLite => {
    return {
      id: character.id,
      index: character.index,
      name: character.name,
      class: character.class,
      level: character.level,
      health: character.health,
      maxHealth: character.maxHealth,
      buffs: character.buffs,
      debuffs: character.debuffs,
      weaponName: character.weaponName,
      armorName: character.armorName,
      isDead: character.isDead,
      ability: character.ability,
      areaId: character.areaId,
    };
  };

  // Create enhanced combatants array that includes the main player
  const enhancedCombatants = useMemo(() => {
    if (!combatants || !Array.isArray(combatants)) {
      return [];
    }
    
    // Check if player is already in combatants array
    const playerInCombatants = combatants.some(c => 
      c && typeof c.index === 'number' && Number(c.index) === Number(playerCharacter.index)
    );
    
    if (playerInCombatants) {
      return combatants;
    }
    
    // Use the full player character data to create a proper CharacterLite
    const playerCharacterLite = characterToCharacterLite(playerCharacter);
    return [...combatants, playerCharacterLite];
  }, [combatants, playerCharacter]);

  // Handle undefined/null combatants array safely
  const combatantIds = useMemo(() => {
    if (!enhancedCombatants || !Array.isArray(enhancedCombatants)) {
      return new Set();
    }
    return new Set(enhancedCombatants.map(c => String(c?.id)).filter(Boolean));
  }, [enhancedCombatants]);

  // Create equipment name lookup functions with comprehensive safety checks
  const getWeaponName = useMemo(() => {
    // Comprehensive weapon mapping as fallback
    const weaponNameMap: { [key: number]: string } = {
      1: "A Dumb-Looking Stick", 2: "A Cool-Looking Stick", 3: "Mean Words", 4: "A Rock",
      5: "A Club, But It Smells Weird", 6: "A Baby Seal", 7: "A Pillow Shaped Like A Sword",
      8: "Brass Knuckles", 9: "A Pocket Knife", 10: "Battle Axe", 11: "A Bowie Knife",
      12: "A Bowstaff", 13: "A Spear", 14: "A Dagger", 15: "An Actual Sword",
      16: "Enchanted Warhammer", 17: "Flaming Longsword", 18: "Frozen Rapier", 19: "Spiked Mace",
      20: "Crystal Halberd", 21: "Obsidian Blade", 22: "Thundering Greatsword", 23: "Venomous Whip",
      24: "Shadowblade", 25: "Double-Bladed Axe", 26: "Ancient War Scythe", 27: "Celestial Quarterstaff",
      28: "Soulstealer Katana", 29: "Demonic Trident", 30: "Volcanic Greataxe", 31: "Ethereal Bow",
      32: "Runic Warsword", 33: "Abyssal Mace", 34: "Dragon's Tooth Dagger", 35: "Astral Glaive",
      36: "Blessed Claymore", 37: "Living Whip Vine", 38: "Frostbite Blade", 39: "Spectral Sickle",
      40: "Corrupted Cleaver", 41: "Tidal Trident", 42: "Eldritch Staff", 43: "Phoenix Feather Spear",
      44: "Starfall Blade", 45: "Void Edge", 46: "Moonlight Greatsword", 47: "Sunforged Hammer",
      48: "Nemesis Blade", 49: "Cosmic Crusher", 50: "Ultimate Weapon of Ultimate Destiny"
    };

    return (weaponId: number | null | undefined): string => {
      // Handle invalid weapon ID
      if (weaponId == null || isNaN(Number(weaponId))) {
        return 'Unknown Weapon';
      }

      const numericWeaponId = Number(weaponId);

      // First try to find in equipable weapons (for current player's available weapons)
      if (equipableWeaponIDs && equipableWeaponNames && Array.isArray(equipableWeaponIDs) && Array.isArray(equipableWeaponNames)) {
        try {
          const index = equipableWeaponIDs.findIndex(id => Number(id) === numericWeaponId);
          if (index >= 0 && index < equipableWeaponNames.length && equipableWeaponNames[index]) {
            const weaponName = equipableWeaponNames[index];
            if (typeof weaponName === 'string' && weaponName.trim().length > 0) {
              return weaponName;
            }
          }
        } catch (error) {
          console.warn('Error in equipable weapon name lookup:', error);
        }
      }
      
      // Fallback to comprehensive weapon mapping
      const mappedName = weaponNameMap[numericWeaponId];
      if (mappedName) {
        return mappedName;
      }
      
      return `Weapon ${weaponId}`;
    };
  }, [equipableWeaponIDs, equipableWeaponNames]);

  const getArmorName = useMemo(() => {
    // Comprehensive armor mapping as fallback
    const armorNameMap: { [key: number]: string } = {
      1: "Literally Nothing", 2: "A Scavenged Loin Cloth", 3: "A Positive Outlook On Life", 4: "Gym Clothes",
      5: "Tattered Rags", 6: "98% Mostly-Deceased Baby Seals, 2% Staples", 7: "A Padded Jacket",
      8: "Black Leather Suit (Used)", 9: "Tinfoil and Duct Tape", 10: "Keone's Cod Piece", 11: "Chainmail",
      12: "Scalemail", 13: "Kevlar", 14: "Kevlar + Tactical", 15: "Ninja Gear",
      16: "Dragonhide Leather", 17: "Reinforced Platemail", 18: "Elven Silverweave", 19: "Dwarven Full Plate",
      20: "Enchanted Robes", 21: "Crystal-Infused Mail", 22: "Beastmancer Hide", 23: "Shadow Cloak",
      24: "Volcanic Forged Armor", 25: "Celestial Breastplate", 26: "Abyssal Shroud", 27: "Guardian's Platemail",
      28: "Sylvan Leaf Armor", 29: "Runic Warden Plate", 30: "Spectral Shroud", 31: "Void-Touched Mail",
      32: "Bloodforged Plate", 33: "Astral Silk Robes", 34: "Stormcaller Armor", 35: "Frostweave Garment",
      36: "Infernal Scale Armor", 37: "Divine Protector Suit", 38: "Ethereal Weave", 39: "Obsidian Battle Plate",
      40: "Phoenix Feather Cloak", 41: "Dragon Knight Armor", 42: "Soul-Bonded Plate", 43: "Living Mushroom Armor",
      44: "Cosmic Veil", 45: "Titan's Bulwark", 46: "Moonlight Shroud", 47: "Sunforged Plate",
      48: "Chronoshifter's Garb", 49: "Crystalline Exoskeleton", 50: "Ultimate Armor of Ultimate Protection"
    };

    return (armorId: number | null | undefined): string => {
      // Handle invalid armor ID
      if (armorId == null || isNaN(Number(armorId))) {
        return 'Unknown Armor';
      }
      
      const numericArmorId = Number(armorId);
      
      // First try to find in equipable armor (for current player's available armor)
      if (equipableArmorIDs && equipableArmorNames && Array.isArray(equipableArmorIDs) && Array.isArray(equipableArmorNames)) {
        try {
          const index = equipableArmorIDs.findIndex(id => Number(id) === numericArmorId);
          if (index >= 0 && index < equipableArmorNames.length && equipableArmorNames[index]) {
            const armorName = equipableArmorNames[index];
            if (typeof armorName === 'string' && armorName.trim().length > 0) {
              return armorName;
            }
          }
        } catch (error) {
          console.warn('Error in equipable armor name lookup:', error);
        }
      }
      
      // Fallback to comprehensive armor mapping
      const mappedName = armorNameMap[numericArmorId];
      if (mappedName) {
        return mappedName;
      }
      
      return `Armor ${armorId}`;
    };
  }, [equipableArmorIDs, equipableArmorNames]);

  return (
    <Box h="100%" display="flex" flexDirection="column" className='min-h-[200px]'>
      <h1 className='copper-text text-2xl font-bold tracking-tight text-center mb-3'>Event Log</h1>
      <Box 
        ref={parentRef}
        h="100%" 
        overflowY="scroll" 
        className="bg-dark-brown rounded-lg border border-black/40 px-3 py-2"
        sx={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(255,255,255,0.5)',
          },
        }}
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <>
            <Box 
              height={`${rowVirtualizer.getTotalSize()}px`}
              width="100%" 
              position="relative"
            >
              {enrichedEventLogs.length > 0 ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const event = enrichedEventLogs[virtualRow.index];
                  if (!event) return null; 

                  const itemKey = `${event.timestamp}-${event.logIndex}-${virtualRow.index}`;
                  
                  // Check if event involves the player directly (as attacker or defender)
                  const isPlayerAttacker = Number(event.attacker?.index) === Number(playerCharacter.index);
                  const isPlayerDefender = Number(event.defender?.index) === Number(playerCharacter.index);
                  const involvesPlayer = isPlayerAttacker || isPlayerDefender;
                  
                  // Check if event involves current combatants (but not the player)
                  const involvesCombatant = !involvesPlayer && (
                    (event.attacker && combatantIds.has(event.attacker.id)) || 
                    (event.defender && combatantIds.has(event.defender.id))
                  );
                  
                  // Check if it's any combat event (for general combat highlighting)
                  const isCombatEvent = Number(event.type) === 0 || Number(event.type) === 1; // Combat or InstigatedCombat
                  
                  // Three-tier highlighting system:
                  // 1. Blue: Player-initiated actions (highest priority)
                  // 2. Red: Combat involving player's current combatants
                  // 3. Orange: Any other combat events (NPC vs NPC fights)

                  return (
                    <Box 
                      key={itemKey} 
                      position="absolute"
                      top={0} 
                      left={0} 
                      width="100%" 
                      height={`${virtualRow.size}px`}
                      transform={`translateY(${virtualRow.start}px)`}
                      px={1}
                      py={0.5}
                      display="flex"
                      alignItems="stretch"
                    >
                      <Box
                        bg={involvesPlayer ? "rgba(59, 130, 246, 0.1)" : involvesCombatant ? "rgba(239, 68, 68, 0.1)" : isCombatEvent ? "rgba(251, 146, 60, 0.1)" : "transparent"}
                        borderRadius="md" 
                        px={2}
                        py={1}
                        border={involvesPlayer ? "1px solid rgba(59, 130, 246, 0.2)" : involvesCombatant ? "1px solid rgba(239, 68, 68, 0.2)" : isCombatEvent ? "1px solid rgba(251, 146, 60, 0.2)" : "1px solid transparent"}
                        transition="all 0.2s"
                        width="100%"
                        overflow="hidden" // Prevent content overflow
                        _hover={{
                          bg: involvesPlayer ? "rgba(59, 130, 246, 0.15)" : involvesCombatant ? "rgba(239, 68, 68, 0.15)" : isCombatEvent ? "rgba(251, 146, 60, 0.15)" : "rgba(255, 255, 255, 0.05)"
                        }}
                      >
                        <EventLogItemRenderer 
                          event={event} 
                          playerIndex={playerCharacter.index}
                          getWeaponName={getWeaponName}
                          getArmorName={getArmorName}
                          playerCharacterClass={playerCharacter.class}
                          combatants={enhancedCombatants}
                          playerWeaponName={playerCharacter.weapon?.name}
                          currentAreaId={currentAreaId}
                          playerCharacterName={playerCharacter.name}
                          isPreEnriched={true}
                        />
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <div className="flex items-center justify-center !h-full !w-full !min-h-full text-lg gold-text-light">
                  <Text>No events yet</Text>
                </div>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default EventFeed; 