import React, { useMemo, useRef } from 'react';
import { Box, Heading, Text, Spinner, Center, VStack } from '@chakra-ui/react';
import { domain } from '@/types';
import { EventLogItemRenderer } from './EventLogItemRenderer';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EventFeedProps {
  playerIndex: number | null;
  eventLogs: domain.EventMessage[];
  combatants: domain.CharacterLite[];
  isCacheLoading: boolean;
  // Add equipment names for lookup
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  playerIndex,
  eventLogs,
  combatants, 
  isCacheLoading,
  equipableWeaponIDs,
  equipableWeaponNames,
  equipableArmorIDs,
  equipableArmorNames
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter out chat messages (type 4) from event logs
  // Also filter out combat events with dead players
  const filteredEventLogs = useMemo(() => {
    // Handle undefined/null eventLogs array
    if (!eventLogs || !Array.isArray(eventLogs)) {
      return [];
    }
    
    return eventLogs.filter(event => {
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
  }, [eventLogs]);

  const rowVirtualizer = useVirtualizer({ 
    count: filteredEventLogs?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });
  
  // Handle undefined/null combatants array safely
  const combatantIds = useMemo(() => {
    if (!combatants || !Array.isArray(combatants)) {
      return new Set();
    }
    return new Set(combatants.map(c => c?.id).filter(Boolean));
  }, [combatants]);

  // Create equipment name lookup functions with comprehensive safety checks
  const getWeaponName = useMemo(() => {
    return (weaponId: number | null | undefined): string => {
      // Handle invalid weapon ID
      if (weaponId == null || isNaN(Number(weaponId))) {
        return 'Unknown Weapon';
      }
      
      // Handle missing equipment data
      if (!equipableWeaponIDs || !equipableWeaponNames || !Array.isArray(equipableWeaponIDs) || !Array.isArray(equipableWeaponNames)) {
        return `Weapon ${weaponId}`;
      }
      
      // Handle empty arrays
      if (equipableWeaponIDs.length === 0 || equipableWeaponNames.length === 0) {
        return `Weapon ${weaponId}`;
      }
      
      try {
        // Convert weaponId to number safely
        const numericWeaponId = Number(weaponId);
        
        // Find the index of this weapon ID in the array
        const index = equipableWeaponIDs.findIndex(id => {
          try {
            return Number(id) === numericWeaponId;
          } catch {
            return false;
          }
        });
        
        // Check if we found a valid index and name
        if (index >= 0 && index < equipableWeaponNames.length && equipableWeaponNames[index]) {
          const weaponName = equipableWeaponNames[index];
          // Ensure the name is a valid string
          if (typeof weaponName === 'string' && weaponName.trim().length > 0) {
            return weaponName;
          }
        }
      } catch (error) {
        console.warn('Error in weapon name lookup:', error);
      }
      
      return `Weapon ${weaponId}`;
    };
  }, [equipableWeaponIDs, equipableWeaponNames]);

  const getArmorName = useMemo(() => {
    return (armorId: number | null | undefined): string => {
      // Handle invalid armor ID
      if (armorId == null || isNaN(Number(armorId))) {
        return 'Unknown Armor';
      }
      
      // Handle missing equipment data
      if (!equipableArmorIDs || !equipableArmorNames || !Array.isArray(equipableArmorIDs) || !Array.isArray(equipableArmorNames)) {
        return `Armor ${armorId}`;
      }
      
      // Handle empty arrays
      if (equipableArmorIDs.length === 0 || equipableArmorNames.length === 0) {
        return `Armor ${armorId}`;
      }
      
      try {
        // Convert armorId to number safely
        const numericArmorId = Number(armorId);
        
        // Find the index of this armor ID in the array
        const index = equipableArmorIDs.findIndex(id => {
          try {
            return Number(id) === numericArmorId;
          } catch {
            return false;
          }
        });
        
        // Check if we found a valid index and name
        if (index >= 0 && index < equipableArmorNames.length && equipableArmorNames[index]) {
          const armorName = equipableArmorNames[index];
          // Ensure the name is a valid string
          if (typeof armorName === 'string' && armorName.trim().length > 0) {
            return armorName;
          }
        }
      } catch (error) {
        console.warn('Error in armor name lookup:', error);
      }
      
      return `Armor ${armorId}`;
    };
  }, [equipableArmorIDs, equipableArmorNames]);

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <h1 className='copper-text text-2xl font-bold tracking-tight text-center mb-2'>Event Log</h1>
      <Box 
        ref={parentRef}
        h="100%" 
        overflowY="auto" 
        className="bg-dark-brown rounded-lg border border-black/40 p-3 text-center"
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <>
            <Box 
              // height={`${rowVirtualizer.getTotalSize()}px`} 
              width="100%" 
              className='h-full min-h-full max-h-32'
            >
              {filteredEventLogs.length > 0 ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const event = filteredEventLogs[virtualRow.index];
                  if (!event) return null; 

                  const itemKey = `${event.timestamp}-${event.logIndex}-${virtualRow.index}`;
                  
                  let bgColor = "gray.700";
                  const involvesCombatant = 
                    (event.attacker && combatantIds.has(event.attacker.id)) || 
                    (event.defender && combatantIds.has(event.defender.id));
                  const isPlayerAction = !!playerIndex && event.attacker?.index === playerIndex;
                  
                  if (involvesCombatant) bgColor = "red.900"; 
                  if (isPlayerAction) bgColor = "blue.900";

                  return (
                    <Box 
                      key={itemKey} 
                      // top={0} 
                      // left={0} 
                      width="100%" 
                      // height={`${virtualRow.size}px`} 
                      // transform={`translateY(${virtualRow.start}px)`}
                      className='py-1'
                    >
                      <Box
                        // bg={bgColor} 
                        borderRadius="md" 
                        h="100%"
                      >
                        <EventLogItemRenderer 
                          event={event} 
                          playerIndex={playerIndex}
                          getWeaponName={getWeaponName}
                          getArmorName={getArmorName}
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